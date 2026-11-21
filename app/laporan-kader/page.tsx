import { redirect } from 'next/navigation'
import { KaderReportForm } from '@/components/adiwiyata/kader-report-form'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laporan Kinerja Kader Adiwiyata | EcoTrack 55' }

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'petugas') redirect('/')

  return <KaderReportForm staffName={user.name} className={user.className ?? ''} />
}
