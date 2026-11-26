import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { getLeaderboardPayload } from '@/lib/leaderboard-data'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    // M-07: agregasi leaderboard berat — batasi 30/menit per pengguna.
    if (!(await allowRequest(`leaderboard:${user.id}`, 30, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
    const payload = await getLeaderboardPayload(new URL(request.url).searchParams)
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat leaderboard.'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'Game tidak dikenal.' ? 400 : 500
    return NextResponse.json({ error: status === 500 ? 'Leaderboard belum dapat dimuat.' : message }, { status })
  }
}
