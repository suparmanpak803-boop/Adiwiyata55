import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { jalankanPergantianTahunAjaran } from '@/lib/tahun-ajaran'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Cron tahunan pergantian tahun ajaran (vercel.json: 17:00 UTC
// 11 Juli = 00:00 WIB 12 Juli). Pola yang sama dengan route
// leaderboard-reset: token Bearer CRON_SECRET (Vercel mengirimkannya
// otomatis untuk cron bila CRON_SECRET terisi di env) + rate limit.
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
  if (!(await allowRequest(`cron-tahun-ajaran:${getClientIp(request)}`, 5, 3600))) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
  }
  const hasil = await jalankanPergantianTahunAjaran()
  return NextResponse.json(hasil)
}
