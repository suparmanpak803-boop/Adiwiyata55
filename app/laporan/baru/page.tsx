import { redirect } from 'next/navigation'
import { LaporanForm } from '@/components/laporan/laporan-form'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Kirim Laporan | Adiwiyata 55' }

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  return <LaporanForm defaultName={user.name} />
}
