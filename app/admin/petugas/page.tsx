import { redirect } from 'next/navigation'
import { AdminUserManagement } from '@/components/adiwiyata/admin-user-management'
import { getPortalUser } from '@/lib/auth/access'
import { getManagedAccounts } from '@/lib/admin-user-management'
import { getClassMasterData, getFallbackClassMaster } from '@/lib/class-master'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Akses Pengguna | Adiwiyata 55' }

export default async function AdminUsersPage() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')

  const [accounts, classMaster] = await Promise.all([
    getManagedAccounts(),
    getClassMasterData().catch(() => getFallbackClassMaster()),
  ])

  return <AdminUserManagement
    initialAccounts={accounts}
    classes={classMaster.classes.filter((item) => item.active).map((item) => item.code)}
    currentUserId={user.id}
  />
}
