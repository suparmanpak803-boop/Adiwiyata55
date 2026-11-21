import { NextResponse } from 'next/server'
import { resetLeaderboardIfDue } from '@/lib/leaderboard-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 })
  }
  const reset = await resetLeaderboardIfDue()
  return NextResponse.json({ reset })
}
