// Pembacaan konten situs dari DB (server only).
// app_settings key 'adiwiyata_site_content', value jsonb.
// Bila belum ada / tidak valid, fallback ke DEFAULT (tidak throw),
// agar halaman publik tetap bisa tampil sebelum admin mengisi konten.
import { db } from '@/lib/db'
import { appSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  DEFAULT_ADIWIYATA_SITE_CONTENT,
  parseAdiwiyataSiteContent,
  type AdiwiyataSiteContent,
} from '@/lib/adiwiyata-site-content'

export async function getAdiwiyataSiteContent(): Promise<AdiwiyataSiteContent> {
  try {
    const rows = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, 'adiwiyata_site_content'))
      .limit(1)
    const parsed = rows[0] ? parseAdiwiyataSiteContent(rows[0].value) : null
    return parsed ?? DEFAULT_ADIWIYATA_SITE_CONTENT
  } catch (error) {
    console.error('[adiwiyata-site-content]', error)
    return DEFAULT_ADIWIYATA_SITE_CONTENT
  }
}
