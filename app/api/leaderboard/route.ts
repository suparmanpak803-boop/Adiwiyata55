import { NextResponse } from 'next/server'
import { getLeaderboardPayload } from '@/lib/leaderboard-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const payload = await getLeaderboardPayload(new URL(request.url).searchParams)
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat leaderboard.'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: status === 500 ? 'Leaderboard belum dapat dimuat.' : message }, { status })
  }
}
