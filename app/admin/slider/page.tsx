import { redirect } from 'next/navigation'
import { AdminSlider } from '@/components/adiwiyata/admin-slider'
import { getPortalUser } from '@/lib/auth/access'
import { getAdminSliderData } from '@/lib/slider/data'

export const dynamic = 'force-dynamic'

export default async function AdminSliderPage() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')

  const data = await getAdminSliderData()
  return <AdminSlider data={data} />
}
