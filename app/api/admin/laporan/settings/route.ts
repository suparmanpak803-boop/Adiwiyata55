import { NextResponse } from 'next/server'
import { getLaporanSettings, normalizeWaNumber, saveLaporanSettings, validSpreadsheetUrl } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'

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
    const body = (await request.json().catch(() => null)) as { spreadsheetUrl?: unknown; waAktif?: unknown; waNomor?: unknown } | null
    const spreadsheetUrl = typeof body?.spreadsheetUrl === 'string' ? body.spreadsheetUrl.trim() : ''
    if (spreadsheetUrl && !validSpreadsheetUrl(spreadsheetUrl)) return NextResponse.json({ error: 'Tautan harus berupa alamat Google Spreadsheet (docs.google.com/spreadsheets).' }, { status: 400 })
    const waAktif = body?.waAktif === true
    const rawWa = typeof body?.waNomor === 'string' ? body.waNomor.trim() : ''
    const waNomor = rawWa ? normalizeWaNumber(rawWa) : ''
    if (waNomor === null) return NextResponse.json({ error: 'Nomor WhatsApp tidak valid. Contoh: 081234567890.' }, { status: 400 })
    if (waAktif && !waNomor) return NextResponse.json({ error: 'Isi nomor WhatsApp untuk mengaktifkan tombol.' }, { status: 400 })
    await saveLaporanSettings({ spreadsheetUrl, waAktif, waNomor })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
