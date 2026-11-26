import { NextResponse } from 'next/server'
import { getLaporanSettings, normalizeWaNumber, saveLaporanSettings, validSpreadsheetUrl } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'
import { allowRequest } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireStaff(request)
  if ('response' in auth) return auth.response
  try {
    const settings = await getLaporanSettings()
    // Petugas hanya perlu tahu apakah tombol WhatsApp aktif dan tautan spreadsheet.
    return NextResponse.json(auth.user.role === 'admin' ? settings : { ...settings, waNomor: null })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  const auth = await requireStaff(request, { mutating: true, adminOnly: true })
  if ('response' in auth) return auth.response
  try {
    // B-04: batas laju perubahan pengaturan laporan (30/menit per admin).
    if (!(await allowRequest(`admin-laporan-settings:${auth.user.id}`, 30, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
    const parsed = await readJsonBody<{ spreadsheetUrl?: unknown; waAktif?: unknown; waNomor?: unknown }>(request)
    if (!parsed.ok) return NextResponse.json({ error: parsed.reason === 'too_large' ? 'Data terlalu besar.' : 'Data tidak valid.' }, { status: parsed.reason === 'too_large' ? 413 : 400 })
    const body = parsed.data
    const spreadsheetUrl = typeof body?.spreadsheetUrl === 'string' ? body.spreadsheetUrl.trim() : ''
    if (spreadsheetUrl && !validSpreadsheetUrl(spreadsheetUrl)) return NextResponse.json({ error: 'Tautan harus berupa alamat Google Spreadsheet (docs.google.com/spreadsheets).' }, { status: 400 })
    const waAktif = body?.waAktif === true
    const rawWa = typeof body?.waNomor === 'string' ? body.waNomor.trim() : ''
    const waNomor = rawWa ? normalizeWaNumber(rawWa) : ''
    // Nomor tidak valid hanya menghalangi bila WA diaktifkan: admin
    // yang mematikan WA sambil menyisakan nomor lama yang tidak valid
    // sebelumnya terkunci tidak bisa menyimpan pengaturan apa pun.
    if (waAktif && waNomor === null) return NextResponse.json({ error: 'Nomor WhatsApp tidak valid. Contoh: 081234567890.' }, { status: 400 })
    if (waAktif && !waNomor) return NextResponse.json({ error: 'Isi nomor WhatsApp untuk mengaktifkan tombol.' }, { status: 400 })
    await saveLaporanSettings({ spreadsheetUrl, waAktif, waNomor: waNomor ?? '' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
