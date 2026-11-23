import { NextResponse } from 'next/server'
import { requirePortalRole } from '@/lib/auth/access'
import {
  buatArsipExcel,
  labelTahunAjaranBerjalan,
  namaFileArsipExcel,
} from '@/lib/arsip-excel'
import { buatArsipBulanan, namaFileArsipBulanan, uraikanBulan } from '@/lib/arsip-bulanan'
import { labelTahunAjaranValid } from '@/lib/tahun-ajaran'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Unduh arsip sebagai file Excel (.xlsx). Hanya admin.
// Query `?bulan=2026-11` → arsip bulanan (diutamakan bila ada);
// tanpa itu, query `?tahun=2026/2027` → arsip tahunan (opsional;
// default tahun ajaran berjalan).
export async function GET(request: Request) {
  let user: { id: string }
  try {
    user = await requirePortalRole(['admin'])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const belumLogin = message === 'UNAUTHORIZED'
    return NextResponse.json(
      { galat: true, kode: belumLogin ? 'BELUM_LOGIN' : 'AKSES_DITOLAK', pesan: belumLogin ? 'Silakan login kembali.' : 'Halaman ini hanya untuk Admin.' },
      { status: belumLogin ? 401 : 403 },
    )
  }
  // B-04: ekspor arsip memindai seluruh tabel dan membangun workbook
  // di memori per permintaan — batasi 10/menit per admin.
  if (!(await allowRequest(`admin-arsip-excel:${user.id}`, 10, 60))) {
    return NextResponse.json(
      { galat: true, kode: 'TERLALU_BANYAK_PERMINTAAN', pesan: 'Terlalu banyak permintaan. Coba lagi sebentar.' },
      { status: 429 },
    )
  }
  const params = new URL(request.url).searchParams
  const bulanParam = params.get('bulan')
  if (bulanParam !== null) {
    const diurai = uraikanBulan(bulanParam)
    if (!diurai) {
      return NextResponse.json(
        { galat: true, kode: 'BULAN_TIDAK_VALID', pesan: 'Bulan tidak valid (format YYYY-MM, bulan 01–12).' },
        { status: 400 },
      )
    }
    try {
      const buffer = await buatArsipBulanan(diurai.tahun, diurai.bulan)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${namaFileArsipBulanan(diurai.tahun, diurai.bulan)}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } catch (error) {
      console.error('[api/admin/arsip-excel]', error)
      return NextResponse.json(
        { galat: true, kode: 'ARSIP_GAGAL', pesan: 'Arsip Excel belum dapat dibuat.' },
        { status: 500 },
      )
    }
  }
  const tahun = params.get('tahun') ?? labelTahunAjaranBerjalan()
  if (!labelTahunAjaranValid(tahun)) {
    return NextResponse.json(
      { galat: true, kode: 'TAHUN_TIDAK_VALID', pesan: 'Label tahun ajaran tidak valid (format YYYY/YYYY+1).' },
      { status: 400 },
    )
  }
  try {
    const buffer = await buatArsipExcel(tahun)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${namaFileArsipExcel(tahun)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[api/admin/arsip-excel]', error)
    return NextResponse.json(
      { galat: true, kode: 'ARSIP_GAGAL', pesan: 'Arsip Excel belum dapat dibuat.' },
      { status: 500 },
    )
  }
}
