import { redirect } from 'next/navigation'
import { GameContentManager } from '@/components/leaderboard/game-content-manager'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')
  return <GameContentManager />
}
