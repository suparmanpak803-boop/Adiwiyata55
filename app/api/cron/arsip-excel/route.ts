import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  buatArsipExcel,
  labelTahunAjaranBerjalan,
  namaFileArsipExcel,
} from '@/lib/arsip-excel'
import { buatArsipBulanan, namaFileArsipBulanan, uraikanBulan } from '@/lib/arsip-bulanan'
import { labelTahunAjaranValid } from '@/lib/tahun-ajaran'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Endpoint cron untuk mengambil arsip Excel — dipanggil pekerjaan
// terjadwal pengunggah Drive (tanpa sesi login, hanya token).
// Pola yang sama dengan /api/cron/tahun-ajaran: token Bearer
// CRON_SECRET (Vercel mengirimkannya otomatis untuk cron bila
// CRON_SECRET terisi di env) + rate limit.
// Query `?bulan=2026-11` → arsip bulanan (diutamakan bila ada);
// tanpa itu, query `?tahun=2026/2027` → arsip tahunan (opsional;
// default tahun ajaran berjalan).
function isValidToken(header: string | null, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice(7))
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || !isValidToken(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 })
  }
  if (!(await allowRequest(`cron-arsip-excel:${getClientIp(request)}`, 5, 3600))) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
  }
  const params = new URL(request.url).searchParams
  const bulanParam = params.get('bulan')
  if (bulanParam !== null) {
    const diurai = uraikanBulan(bulanParam)
    if (!diurai) {
      return NextResponse.json({ error: 'Bulan tidak valid (format YYYY-MM, bulan 01–12).' }, { status: 400 })
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
      console.error('[api/cron/arsip-excel]', error)
      return NextResponse.json({ error: 'Arsip Excel belum dapat dibuat.' }, { status: 500 })
    }
  }
  const tahun = params.get('tahun') ?? labelTahunAjaranBerjalan()
  if (!labelTahunAjaranValid(tahun)) {
    return NextResponse.json({ error: 'Label tahun ajaran tidak valid (format YYYY/YYYY+1).' }, { status: 400 })
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
    console.error('[api/cron/arsip-excel]', error)
    return NextResponse.json({ error: 'Arsip Excel belum dapat dibuat.' }, { status: 500 })
  }
}
