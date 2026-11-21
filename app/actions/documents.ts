'use server'

import { del } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { adiwiyataDocuments } from '@/lib/db/schema'

export async function deleteAdiwiyataDocument(id: string) {
  await requirePortalRole(['admin'])
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Dokumen tidak ditemukan.')
  }

  const [document] = await db.select({ pathname: adiwiyataDocuments.blobPathname, url: adiwiyataDocuments.blobUrl })
    .from(adiwiyataDocuments)
    .where(eq(adiwiyataDocuments.id, id))
    .limit(1)
  if (!document) throw new Error('Dokumen tidak ditemukan atau sudah dihapus.')

  if (document.pathname.startsWith('adiwiyata-documents/')) await del(document.url)
  await db.delete(adiwiyataDocuments).where(eq(adiwiyataDocuments.id, id))
  revalidatePath('/adiwiyata')
  revalidatePath('/adiwiyata/dokumen')
  revalidatePath('/admin/dokumen')
  return { success: true }
}
