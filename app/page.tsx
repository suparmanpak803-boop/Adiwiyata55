import { redirect } from 'next/navigation'
import { AdiwiyataPortal } from '@/components/adiwiyata/portal'
import { getPortalUser } from '@/lib/auth/access'
import { getDepositPageData } from '@/app/actions/deposits'
import { getSheetsConfigStatus } from '@/app/actions/sheets-config'
import { getEducationVideoAdminList } from '@/lib/education-videos'
import { getSliderHomepageData } from '@/lib/slider/data'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')

  const [depositData, sheetsConfig, educationVideoData, sliderData] = await Promise.all([
    getDepositPageData(),
    user.role === 'admin' ? getSheetsConfigStatus() : Promise.resolve(null),
    user.role === 'admin' ? getEducationVideoAdminList() : Promise.resolve(null),
    getSliderHomepageData(),
  ])
  return <AdiwiyataPortal user={user} depositData={depositData} sheetsConfig={sheetsConfig} educationVideoData={educationVideoData} sliderData={sliderData} />
}
