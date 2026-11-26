'use server'

import { del } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { allowRequest } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { adiwiyataDocuments } from '@/lib/db/schema'

export async function deleteAdiwiyataDocument(id: string) {
  const admin = await requirePortalRole(['admin'])
  // B-04: batas laju hapus dokumen (30/jam per admin).
  if (!(await allowRequest(`dokumen:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Dokumen tidak ditemukan.')
  }

  const [document] = await db.select({ pathname: adiwiyataDocuments.blobPathname, url: adiwiyataDocuments.blobUrl })
    .from(adiwiyataDocuments)
    .where(eq(adiwiyataDocuments.id, id))
    .limit(1)
  if (!document) throw new Error('Dokumen tidak ditemukan atau sudah dihapus.')

  if (document.pathname.startsWith('adiwiyata-documents/')) {
    // Hapus blob best-effort: bila berkasnya sudah hilang dari Blob,
    // penghapusan dokumen tetap jalan (sebelumnya del() yang melempar
    // membuat baris DB tidak pernah terhapus dan admin terkunci).
    await del(document.url).catch(() => undefined)
  }
  await db.delete(adiwiyataDocuments).where(eq(adiwiyataDocuments.id, id))
  revalidatePath('/adiwiyata')
  revalidatePath('/adiwiyata/dokumen')
  revalidatePath('/admin/dokumen')
  return { success: true }
}
