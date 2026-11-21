import { redirect } from 'next/navigation'
import { InformationAdminPanel } from '@/components/adiwiyata/information-admin-panel'
import { getPortalUser } from '@/lib/auth/access'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Informasi Adiwiyata | Admin' }

export default async function AdminAdiwiyataInformationPage() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')

  const content = await getAdiwiyataSiteContent()
  return <InformationAdminPanel initialContent={content} />
}
