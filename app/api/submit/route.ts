import { NextResponse } from 'next/server'
import { readJsonResponse } from '@/lib/api-client'
import { callAppsScriptRead } from '@/lib/apps-script-client'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { getAppsScriptConfig } from '@/lib/sheets-config'
import { isActiveClassCode } from '@/lib/class-master'
import { normalizeClassCode } from '@/lib/class-codes'
import { GENERAL_LOCATIONS } from '@/lib/general-locations'
import { allowRequest } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'

const allowedWasteTypes = new Set(['Organik', 'Anorganik', 'B3', 'Residu', 'Kertas'])

type SheetRecord = {
  date: string
  className: string
  wasteType: string
  weight: number
  compliance: string
  note?: string
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && value <= today
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    if (user.role !== 'admin' && user.role !== 'petugas') return NextResponse.json({ error: 'Hanya Admin dan Petugas Adiwiyata yang dapat mengirim setoran.' }, { status: 403 })
    // M-06: rate limit berbasis Postgres (bukan Map in-memory yang tidak
    // berlaku antar instance serverless).
    if (!(await allowRequest(`kirim:${user.id}`, 20, 60))) return NextResponse.json({ error: 'Terlalu banyak pengiriman. Silakan coba lagi satu menit lagi.' }, { status: 429 })

    const parsed = await readJsonBody<{ records?: unknown; replace?: unknown }>(request)
    if (!parsed.ok) return NextResponse.json({ error: parsed.reason === 'too_large' ? 'Data terlalu besar.' : 'Data tidak valid.' }, { status: parsed.reason === 'too_large' ? 413 : 400 })
    const body = parsed.data
    if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 5) {
      return NextResponse.json({ error: 'Data setoran tidak valid.' }, { status: 400 })
    }

    const rawClassName = normalizeText((body.records[0] as SheetRecord)?.className, 30)
    const className = normalizeClassCode(rawClassName) || GENERAL_LOCATIONS.find((item) => item.toLowerCase() === rawClassName.toLowerCase()) || ''
    const submittedDate = String((body.records[0] as SheetRecord)?.date || '')
    if (!className) return NextResponse.json({ error: 'Pilih kode kelas atau lokasi umum yang valid.' }, { status: 400 })
    if (normalizeClassCode(className) && !(await isActiveClassCode(className))) return NextResponse.json({ error: 'Kode kelas tidak terdaftar atau tidak aktif di Master_Kelas.' }, { status: 400 })
    // Petugas boleh mengirim data untuk kelas mana pun, bukan hanya
    // kelas penugasannya (sinkron dengan saveDeposit).
    const records = body.records.map((record): SheetRecord | null => {
      if (!record || typeof record !== 'object') return null
      const item = record as SheetRecord
      const rawCode = normalizeText(item.className, 30)
      const normalizedClass = normalizeClassCode(rawCode) || GENERAL_LOCATIONS.find((location) => location.toLowerCase() === rawCode.toLowerCase()) || ''
      const wasteType = normalizeText(item.wasteType, 20)
      const compliance = normalizeText(item.compliance, 120)
      const note = normalizeText(item.note, 500)
      if (normalizedClass !== className || item.date !== submittedDate || !validDate(item.date) || !allowedWasteTypes.has(wasteType) || !compliance || !note) return null
      if (!Number.isFinite(item.weight) || item.weight <= 0 || item.weight > 500 || Math.round(item.weight * 100) !== item.weight * 100) return null
      return { date: item.date, className: normalizedClass, wasteType, weight: item.weight, compliance, note }
    })
    if (records.some((record) => !record)) return NextResponse.json({ error: 'Lengkapi semua data. Berat harus lebih dari 0 dengan maksimal dua angka desimal.' }, { status: 400 })

    // Sinkronisasi Sheet hanya untuk setoran yang sudah tersimpan dan
    // tervalidasi lewat saveDeposit: cocokkan berat per jenis dan
    // string kepatuhan dengan baris deposit di database. Tanpa ini,
    // /api/submit bisa dipanggil sendiri untuk menulis/menghapus baris
    // Sheet dengan tanggal lama, angka kepatuhan karangan, dan
    // replace:true — melewati batas 30 hari, cek jumlah siswa, dan
    // jejak audit saveDeposit.
    const deposit = await pool.query<{
      organic: string; inorganic: string; residual: string; hazardous: string; paper: string
      tumbler: number; lunchbox: number; student_count: number | null
    }>(
      `SELECT organic::text, inorganic::text, residual::text, hazardous::text, paper::text, tumbler, lunchbox, student_count
         FROM public.adiwiyata_deposits WHERE id = $1`,
      [`${submittedDate}_${className}`],
    )
    const savedRow = deposit.rows[0]
    if (!savedRow) return NextResponse.json({ error: 'Setoran belum tersimpan di database. Simpan dulu lewat formulir Input Laporan.' }, { status: 409 })
    const sheetRecords = records as SheetRecord[]
    const weightsByType: Record<string, number> = {
      Organik: Number(savedRow.organic), Anorganik: Number(savedRow.inorganic), Residu: Number(savedRow.residual), B3: Number(savedRow.hazardous), Kertas: Number(savedRow.paper),
    }
    const submittedTypes = new Set<string>()
    for (const record of sheetRecords) {
      if (Math.round((weightsByType[record.wasteType] ?? -1) * 100) !== Math.round(record.weight * 100)) {
        return NextResponse.json({ error: 'Data tidak cocok dengan setoran yang tersimpan di database.' }, { status: 409 })
      }
      submittedTypes.add(record.wasteType)
    }
    for (const [type, weight] of Object.entries(weightsByType)) {
      if (weight > 0 && !submittedTypes.has(type)) {
        return NextResponse.json({ error: 'Data tidak cocok dengan setoran yang tersimpan di database.' }, { status: 409 })
      }
    }
    const complianceStatus = savedRow.tumbler > 0 || savedRow.lunchbox > 0 ? 'Patuh' : 'Tidak patuh'
    const expectedCompliance = savedRow.student_count
      ? `${complianceStatus} | Tumbler ${savedRow.tumbler}/${savedRow.student_count} | Lunch box ${savedRow.lunchbox}/${savedRow.student_count}`
      : `${complianceStatus} | Tumbler ${savedRow.tumbler} | Lunch box ${savedRow.lunchbox}`
    if (sheetRecords.some((record) => record.compliance !== expectedCompliance)) {
      return NextResponse.json({ error: 'Data tidak cocok dengan setoran yang tersimpan di database.' }, { status: 409 })
    }

    const { url, token } = await getAppsScriptConfig()
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'submit', token, staff: user.name, records, replace: body.replace === true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const result = await readJsonResponse<{ success?: boolean; error?: string; message?: string }>(response)
    // L-01: jangan teruskan pesan error Apps Script apa adanya ke klien.
    if (!result.success) {
      console.error('[api/submit] Apps Script menolak kiriman:', result.error)
      return NextResponse.json({ error: 'Spreadsheet belum dapat menerima data. Silakan coba lagi.' }, { status: 502 })
    }
    // Jejak audit pengiriman ke Sheet (saveDeposit hanya mencatat
    // penyimpanan di database).
    await pool.query(`INSERT INTO public.log_aktivitas (actor_id, aksi, detail) VALUES ($1, 'setoran_kirim_sheet', $2::jsonb)`, [user.id, JSON.stringify({ date: submittedDate, className })]).catch(() => undefined)
    return NextResponse.json({ success: true, message: 'Data berhasil tersimpan ke Spreadsheet.' })
  } catch (error) {
    // L-01: pesan error mentah (driver/Apps Script) hanya masuk log server.
    console.error('[api/submit]', error)
    const notConfigured = error instanceof Error && error.message.includes('belum dikonfigurasi')
    return NextResponse.json({ error: notConfigured ? 'Layanan Spreadsheet belum dikonfigurasi.' : 'Pengiriman ke Spreadsheet gagal.' }, { status: notConfigured ? 503 : 502 })
  }
}

export async function GET(request: Request) {
  try {
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    if (user.role !== 'admin' && user.role !== 'petugas' && user.role !== 'pengunjung') return NextResponse.json({ error: 'Akses rekap tidak diizinkan.' }, { status: 403 })
    // M-06: GET rekap juga dibatasi — sebelumnya tanpa limit dan
    // mem-proxy ke Apps Script (kuota bisa dikuras).
    if (!(await allowRequest(`rekap:${user.id}`, 30, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan rekap. Coba lagi sebentar.' }, { status: 429 })
    const params = new URL(request.url).searchParams
    const grade = params.get('grade')
    const requestedClasses = user.role === 'admin'
      ? (params.get('classNames') || '').split(',').map((value) => normalizeClassCode(value) || ['Kantin', 'Halaman', 'Lab', 'Perpustakaan', 'Taman'].find((location) => location.toLowerCase() === value.trim().toLowerCase()) || '').filter(Boolean)
      : []
    if (user.role === 'admin' && requestedClasses.length) {
      const valid = await Promise.all(requestedClasses.map(async (name) => !normalizeClassCode(name) || isActiveClassCode(name)))
      if (valid.some((item) => !item)) return NextResponse.json({ error: 'Filter memuat kelas yang tidak aktif di Master_Kelas.' }, { status: 400 })
    }
    const dateParam = (key: 'from' | 'to') => {
      const value = params.get(key)
      return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
    }
    // L-02: token Apps Script dikirim lewat body POST, bukan query string.
    const result = await callAppsScriptRead<{ success?: boolean; error?: string } & Record<string, unknown>>('summary', {
      grade: user.role === 'admin' && (grade === 'X' || grade === 'XI' || grade === 'XII') ? grade : undefined,
      classNames: user.role === 'admin' && requestedClasses.length ? requestedClasses.join(',') : undefined,
      className: user.role === 'petugas' && user.className ? normalizeClassCode(user.className) || user.className : undefined,
      from: dateParam('from'),
      to: dateParam('to'),
    })
    if (!result.success) {
      console.error('[api/submit] Apps Script menolak rekap:', result.error)
      return NextResponse.json({ error: 'Rekap Spreadsheet belum dapat dimuat.' }, { status: 502 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/submit] GET', error)
    return NextResponse.json({ error: 'Rekap Spreadsheet belum dapat dimuat.' }, { status: 503 })
  }
}
