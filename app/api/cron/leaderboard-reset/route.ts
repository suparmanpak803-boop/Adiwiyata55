import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { resetLeaderboardIfDue } from '@/lib/leaderboard-data'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function isValidToken(header: string | null, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice(7))
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // H-02: bandingkan token secara timing-safe (bukan !==), dan batasi
  // pemanggilan 5/jam per IP — sama seperti route backup.
  if (!secret || !isValidToken(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 })
  }
  if (!(await allowRequest(`cron-reset:${getClientIp(request)}`, 5, 3600))) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
  }
  const reset = await resetLeaderboardIfDue()
  return NextResponse.json({ reset })
}
