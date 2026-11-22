import { NextResponse } from 'next/server'
import { requirePortalRole } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { resetLeaderboardIfDue, saveAdminLeaderboardSettings } from '@/lib/leaderboard-data'

export const dynamic = 'force-dynamic'

function sameOrigin(request: Request) {
  // L-05: ketat — Origin yang absen juga ditolak (bukan hanya yang beda).
  const origin = request.headers.get('origin')
  return origin === new URL(request.url).origin
}

export async function GET() {
  try {
    await requirePortalRole(['admin'])
    const [settings, games, waste, classes] = await Promise.all([
      pool.query(`SELECT * FROM public.leaderboard_settings WHERE id = true`),
      pool.query(`SELECT game_key, aktif, durasi_detik, tingkat_kesulitan, konfigurasi FROM public.game_settings ORDER BY game_key`),
      pool.query(`SELECT * FROM public.leaderboard_sampah_settings WHERE id = true`),
      pool.query(`SELECT name, student_count FROM public.adiwiyata_classes WHERE school_id = 'SMAN55' ORDER BY name`),
    ])
    return NextResponse.json({ settings: settings.rows[0] ?? null, games: games.rows, waste: waste.rows[0] ?? null, classes: classes.rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    // PERBAIKAN: sebelumnya semua error (termasuk gangguan DB) dijawab
    // 403 sehingga admin mengira tidak punya akses. Hanya FORBIDDEN
    // yang 403; error lain 500.
    const message = error instanceof Error ? error.message : 'Gagal memuat pengaturan.'
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Akses hanya untuk Admin.' }, { status: 403 })
    console.error('[api/admin/game GET]', error)
    return NextResponse.json({ error: 'Pengaturan belum dapat dimuat.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  if (Number(request.headers.get('content-length') ?? 0) > 30_000) return NextResponse.json({ error: 'Data terlalu besar.' }, { status: 413 })
  try {
    const user = await requirePortalRole(['admin'])
    const input = await request.json() as Record<string, unknown>
    if (input.action === 'reset') {
      if (input.confirmation !== 'RESET') return NextResponse.json({ error: 'Ketik RESET untuk mengonfirmasi.' }, { status: 400 })
      const reset = await resetLeaderboardIfDue({ force: true, actorId: user.id })
      if (!reset) return NextResponse.json({ error: 'Reset tidak dapat dijalankan. Coba lagi.' }, { status: 409 })
      return NextResponse.json({ success: true })
    }
    await saveAdminLeaderboardSettings(input)
    await pool.query(`INSERT INTO public.log_aktivitas (actor_id, aksi, detail) VALUES ($1, 'leaderboard_settings_update', $2::jsonb)`, [user.id, JSON.stringify({ section: 'game_leaderboard' })]).catch(() => undefined)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pengaturan gagal disimpan.'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400
    return NextResponse.json({ error: status === 400 ? message : 'Akses tidak diizinkan.' }, { status })
  }
}
