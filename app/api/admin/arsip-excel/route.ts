import { NextResponse } from 'next/server'
import { requirePortalRole } from '@/lib/auth/access'
import {
  buatArsipExcel,
  labelTahunAjaranBerjalan,
  namaFileArsipExcel,
} from '@/lib/arsip-excel'
import { labelTahunAjaranValid } from '@/lib/tahun-ajaran'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Unduh arsip tahun ajaran sebagai file Excel (.xlsx). Hanya admin.
// Query `?tahun=2026/2027` (opsional; default tahun ajaran berjalan).
export async function GET(request: Request) {
  try {
    await requirePortalRole(['admin'])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const belumLogin = message === 'UNAUTHORIZED'
    return NextResponse.json(
      { galat: true, kode: belumLogin ? 'BELUM_LOGIN' : 'AKSES_DITOLAK', pesan: belumLogin ? 'Silakan login kembali.' : 'Halaman ini hanya untuk Admin.' },
      { status: belumLogin ? 401 : 403 },
    )
  }
  const tahun = new URL(request.url).searchParams.get('tahun') ?? labelTahunAjaranBerjalan()
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
