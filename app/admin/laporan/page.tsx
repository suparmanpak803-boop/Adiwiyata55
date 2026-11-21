import { redirect } from 'next/navigation'
import { AdminLaporan } from '@/components/laporan/admin/admin-laporan'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Kelola Laporan | Adiwiyata 55' }

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role === 'pengunjung') redirect('/')
  return <AdminLaporan role={user.role} />
}
