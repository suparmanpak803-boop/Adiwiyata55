import { redirect } from 'next/navigation'
import { GameHub } from '@/components/game/game-hub'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Main Game | Adiwiyata 55' }

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  // Sama seperti halaman publik: kegagalan baca DB tidak boleh mematikan
  // seluruh halaman (error boundary). Fallback kosong tetap menampilkan
  // hub game (active[key] !== false berarti aktif) dan skor terbaik kosong;
  // bila DB memang bermasalah, API sesi game akan melaporkan errornya
  // dengan pesan yang jelas saat game dimulai.
  let settings: { game_key: string; aktif: boolean }[] = []
  let best: { game_key: string; skor: number }[] = []
  try {
    const [settingsResult, bestResult] = await Promise.all([
      pool.query<{ game_key: string; aktif: boolean }>(`SELECT game_key, aktif FROM public.game_settings`),
      pool.query<{ game_key: string; skor: number }>(
        `SELECT game_key, MAX(skor) AS skor FROM public.game_scores WHERE user_id = $1 AND mencurigakan = false GROUP BY game_key`,
        [user.id],
      ),
    ])
    settings = settingsResult.rows
    best = bestResult.rows
  } catch (error) {
    console.error('[game/page]', error)
  }
  return <GameHub active={Object.fromEntries(settings.map((r) => [r.game_key, r.aktif]))} best={Object.fromEntries(best.map((r) => [r.game_key, Number(r.skor)]))} />
}
