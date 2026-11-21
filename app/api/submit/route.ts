import { NextResponse } from 'next/server'
import { readJsonResponse } from '@/lib/api-client'
import { getPortalUser } from '@/lib/auth/access'
import { getAppsScriptConfig } from '@/lib/sheets-config'
import { isActiveClassCode } from '@/lib/class-master'
import { normalizeClassCode } from '@/lib/class-codes'
import { GENERAL_LOCATIONS } from '@/lib/general-locations'

export const dynamic = 'force-dynamic'

const sendWindows = new Map<string, { count: number; resetAt: number }>()
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

function rateLimit(userId: string) {
  const now = Date.now()
  const window = sendWindows.get(userId)
  if (!window || window.resetAt <= now) {
    sendWindows.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (window.count >= 20) return false
  window.count += 1
  return true
}

export async function POST(request: Request) {
  try {
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    if (user.role !== 'admin' && user.role !== 'petugas') return NextResponse.json({ error: 'Hanya Admin dan Petugas Adiwiyata yang dapat mengirim setoran.' }, { status: 403 })
    if (!rateLimit(user.id)) return NextResponse.json({ error: 'Terlalu banyak pengiriman. Silakan coba lagi satu menit lagi.' }, { status: 429 })

    const body = await request.json() as { records?: unknown; replace?: unknown }
    if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 5) {
      return NextResponse.json({ error: 'Data setoran tidak valid.' }, { status: 400 })
    }

    const rawClassName = normalizeText((body.records[0] as SheetRecord)?.className, 30)
    const className = normalizeClassCode(rawClassName) || GENERAL_LOCATIONS.find((item) => item.toLowerCase() === rawClassName.toLowerCase()) || ''
    const submittedDate = String((body.records[0] as SheetRecord)?.date || '')
    if (!className) return NextResponse.json({ error: 'Pilih kode kelas atau lokasi umum yang valid.' }, { status: 400 })
    if (normalizeClassCode(className) && !(await isActiveClassCode(className))) return NextResponse.json({ error: 'Kode kelas tidak terdaftar atau tidak aktif di Master_Kelas.' }, { status: 400 })
    const isGeneralLocation = GENERAL_LOCATIONS.includes(className as (typeof GENERAL_LOCATIONS)[number])
    if (user.role === 'petugas' && !isGeneralLocation && (normalizeClassCode(user.className) || user.className) !== className) return NextResponse.json({ error: 'Petugas hanya dapat mengirim data untuk kelas yang ditugaskan atau lokasi umum.' }, { status: 403 })

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

    const { url, token } = await getAppsScriptConfig()
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'submit', token, staff: user.name, records, replace: body.replace === true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const result = await readJsonResponse<{ success?: boolean; error?: string; message?: string }>(response)
    if (!result.success) return NextResponse.json({ error: result.error || 'Spreadsheet belum dapat menerima data. Silakan coba lagi.' }, { status: 502 })
    return NextResponse.json({ success: true, message: 'Data berhasil tersimpan ke Spreadsheet.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pengiriman ke Spreadsheet gagal.'
    const status = message.includes('belum dikonfigurasi') ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(request: Request) {
  try {
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    if (user.role !== 'admin' && user.role !== 'petugas' && user.role !== 'pengunjung') return NextResponse.json({ error: 'Akses rekap tidak diizinkan.' }, { status: 403 })
    const { url, token } = await getAppsScriptConfig()
    const params = new URL(request.url).searchParams
    const target = new URL(url)
    target.searchParams.set('action', 'summary')
    target.searchParams.set('token', token)
    const grade = params.get('grade')
    if (user.role === 'admin' && (grade === 'X' || grade === 'XI' || grade === 'XII')) target.searchParams.set('grade', grade)
    const requestedClasses = user.role === 'admin'
      ? (params.get('classNames') || '').split(',').map((value) => normalizeClassCode(value) || ['Kantin', 'Halaman', 'Lab', 'Perpustakaan', 'Taman'].find((location) => location.toLowerCase() === value.trim().toLowerCase()) || '').filter(Boolean)
      : []
    if (user.role === 'admin' && requestedClasses.length) {
      const valid = await Promise.all(requestedClasses.map(async (name) => !normalizeClassCode(name) || isActiveClassCode(name)))
      if (valid.some((item) => !item)) return NextResponse.json({ error: 'Filter memuat kelas yang tidak aktif di Master_Kelas.' }, { status: 400 })
      target.searchParams.set('classNames', requestedClasses.join(','))
    } else if (user.role === 'petugas' && user.className) {
      target.searchParams.set('className', normalizeClassCode(user.className) || user.className)
    }
    for (const key of ['from', 'to'] as const) {
      const value = params.get(key)
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) target.searchParams.set(key, value)
    }
    const response = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    const result = await readJsonResponse<{ success?: boolean; error?: string } & Record<string, unknown>>(response)
    if (!result.success) return NextResponse.json({ error: result.error || 'Rekap Spreadsheet belum dapat dimuat.' }, { status: 502 })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rekap Spreadsheet belum dapat dimuat.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
