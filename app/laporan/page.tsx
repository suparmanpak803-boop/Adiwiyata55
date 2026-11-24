import { redirect } from 'next/navigation'
import { LaporanList } from '@/components/laporan/laporan-list'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Laporan & Saran | Adiwiyata 55' }, robots: { index: false, follow: false } }

export default async function Page() {
  if (!(await getPortalUser())) redirect('/sign-in')
  return <LaporanList />
}
