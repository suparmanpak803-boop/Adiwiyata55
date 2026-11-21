import { redirect } from 'next/navigation'
import { DocumentAdminPanel } from '@/components/adiwiyata/document-admin-panel'
import { getPortalUser } from '@/lib/auth/access'
import { getAdiwiyataDocuments } from '@/lib/documents'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dokumen & Arsip | Adiwiyata 55' }

export default async function AdminDocumentsPage() {
  const user = await getPortalUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'admin') redirect('/')

  const documents = await getAdiwiyataDocuments()
  return <DocumentAdminPanel documents={documents} />
}
