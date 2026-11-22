import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { KATEGORI, STATUS_LABEL, URGENSI } from '@/lib/laporan'
import { exportRows, parseFilters } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const HEADERS = ['Nomor Tiket', 'Tanggal', 'Kategori', 'Kelas/Lokasi', 'Judul', 'Isi', 'Urgensi', 'Pelapor', 'Status', 'Penanggung Jawab', 'Tanggapan Admin', 'Tanggal Selesai', 'Rating']

// Mencegah formula injection saat dibuka di Excel/Sheets.
const safe = (value: unknown) => {
  const text = value == null ? '' : String(value)
  const trimmed = text.replace(/^[\s]+/, '')
  return /^[=+\-@\t\r]/.test(trimmed) ? `'${text}` : text
}
const fmt = (value: unknown) => (value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value as string)) : '')

export async function GET(request: Request) {
  const auth = await requireStaff(request)
  if ('response' in auth) return auth.response
  // B-04: batas laju ekspor laporan (30/menit per staf).
  if (!(await allowRequest(`admin-laporan-export:${auth.user.id}`, 30, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
  try {
    const params = new URL(request.url).searchParams
    const rows = (await exportRows(parseFilters(params), auth.user)).map((r) => [
      safe(r.nomor_tiket), fmt(r.dibuat_pada), safe(KATEGORI.find((k) => k.id === r.kategori)?.label ?? r.kategori), safe(r.lokasi),
      safe(r.judul), safe(r.isi), URGENSI.find((u) => u.id === r.urgensi)?.label ?? r.urgensi, safe(r.pelapor ?? 'Anonim'),
      STATUS_LABEL[r.status] ?? r.status, safe(r.pj), safe(r.tanggapan_admin), fmt(r.diselesaikan_pada), r.rating ?? '',
    ])
    const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
    const stamp = new Date().toISOString().slice(0, 10)
    if (params.get('format') === 'xlsx') {
      const book = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(book, sheet, 'Laporan')
      const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
      return new NextResponse(new Uint8Array(buffer), {
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="laporan-${stamp}.xlsx"`, 'Cache-Control': 'no-store' },
      })
    }
    const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(sheet)
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="laporan-${stamp}.csv"`, 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}
