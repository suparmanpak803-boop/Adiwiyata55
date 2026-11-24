import { redirect } from 'next/navigation'
import { ApaItuAdiwiyata } from '@/components/game/apa-itu-adiwiyata'
import { getPortalUser } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: { absolute: 'Main Game | Adiwiyata 55' },
  robots: { index: false, follow: false },
}

export default async function Page() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  return <ApaItuAdiwiyata />
}
