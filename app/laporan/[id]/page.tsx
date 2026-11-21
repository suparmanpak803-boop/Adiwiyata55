import { redirect } from 'next/navigation'
import { LaporanDetail } from '@/components/laporan/laporan-detail'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Detail Laporan | Adiwiyata 55' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getPortalUser())) redirect('/sign-in')
  const { id } = await params
  return <LaporanDetail id={id} />
}
