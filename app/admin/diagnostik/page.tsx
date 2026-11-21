import { redirect } from 'next/navigation'
import { SystemDiagnostics } from '@/components/leaderboard/system-diagnostics'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')
  return <SystemDiagnostics />
}
