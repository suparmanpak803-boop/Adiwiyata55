import { redirect } from 'next/navigation'
import { GameHub } from '@/components/game/game-hub'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Main Game | Adiwiyata 55' }

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  const settings = await pool.query<{ game_key: string; aktif: boolean }>(`SELECT game_key, aktif FROM public.game_settings`)
  const best = await pool.query<{ game_key: string; skor: number }>(
    `SELECT game_key, MAX(skor) AS skor FROM public.game_scores WHERE user_id = $1 AND mencurigakan = false GROUP BY game_key`, [user.id],
  )
  return <GameHub active={Object.fromEntries(settings.rows.map((r) => [r.game_key, r.aktif]))} best={Object.fromEntries(best.rows.map((r) => [r.game_key, Number(r.skor)]))} />
}
