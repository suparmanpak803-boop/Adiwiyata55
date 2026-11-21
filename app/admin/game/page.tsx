import { redirect } from 'next/navigation'
import { AdminGameSettings } from '@/components/leaderboard/admin-game-settings'
import { getPortalUser } from '@/lib/auth/access'
import { getAdminLeaderboardSettings } from '@/lib/leaderboard-data'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')
  const data = await getAdminLeaderboardSettings()
  return <AdminGameSettings initialData={data} />
}
