import { redirect } from 'next/navigation'
import { LaporanList } from '@/components/laporan/laporan-list'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laporan & Saran | Adiwiyata 55' }

export default async function Page() {
  if (!(await getPortalUser())) redirect('/sign-in')
  return <LaporanList />
}
