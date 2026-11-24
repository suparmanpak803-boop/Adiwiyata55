import { redirect } from 'next/navigation'
import { LeaderboardPage } from '@/components/leaderboard/leaderboard-page'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Leaderboard wajib login: jangan terindeks.
export const metadata = { robots: { index: false, follow: false } }

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  const result = await pool.query<{ tampil_inisial: boolean }>(
    `SELECT tampil_inisial FROM public.adiwiyata_user_roles WHERE user_id = $1 LIMIT 1`, [user.id],
  )
  return <LeaderboardPage initialInitials={result.rows[0]?.tampil_inisial ?? false} />
}
