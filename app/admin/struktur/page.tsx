import { redirect } from 'next/navigation'
import { StrukturEditor } from '@/components/adiwiyata/struktur-editor'
import { getPortalUser } from '@/lib/auth/access'
import { getStrukturPetugas } from '@/lib/struktur-petugas-data'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Struktur Adiwiyata | Adiwiyata 55' }

export default async function AdminStrukturPage() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')

  const data = await getStrukturPetugas()
  return <StrukturEditor data={data} />
}
