import { redirect } from 'next/navigation'
import { KaderReportForm } from '@/components/adiwiyata/kader-report-form'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Laporan Kinerja Kader Adiwiyata | Adiwiyata 55' }, robots: { index: false, follow: false } }

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'petugas') redirect('/')

  return <KaderReportForm staffName={user.name} className={user.className ?? ''} />
}
