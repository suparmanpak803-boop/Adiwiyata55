'use server'

import { revalidatePath } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { allowRequest } from '@/lib/rate-limit'
import { pool } from '@/lib/db'
import { encryptSheetsToken, getSheetsConfigStatus as readSheetsConfigStatus, validateAppsScriptUrl } from '@/lib/sheets-config'

export async function getSheetsConfigStatus() {
  await requirePortalRole(['admin'])
  return readSheetsConfigStatus()
}

export async function saveSheetsConfig(input: { url: string; token: string }) {
  const admin = await requirePortalRole(['admin'])
  // B-04: batas laju perubahan konfigurasi Sheets (30/jam per admin).
  if (!(await allowRequest(`sheets-config:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')
  const url = input.url.trim()
  const token = input.token.trim()
  if (!validateAppsScriptUrl(url)) throw new Error('Masukkan URL Web App Apps Script yang valid (script.google.com/macros/s/.../exec).')
  if (url.length > 500) throw new Error('URL terlalu panjang.')
  if (token.length > 5000) throw new Error('Token terlalu panjang.')

  const existing = await pool.query<{ sheets_secret_token_encrypted: string | null }>(
    `SELECT sheets_secret_token_encrypted FROM public.adiwiyata_settings WHERE id = 1 LIMIT 1`,
  )
  if (!token && !existing.rows[0]?.sheets_secret_token_encrypted) throw new Error('Masukkan token rahasia Apps Script terlebih dahulu.')

  const encryptedToken = token ? encryptSheetsToken(token) : existing.rows[0].sheets_secret_token_encrypted
  await pool.query(
    `INSERT INTO public.adiwiyata_settings
       (id, period_start, reset_interval_months, apps_script_url, sheets_secret_token_encrypted, updated_by, updated_at)
     VALUES (1, CURRENT_DATE, 1, $1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE
       SET apps_script_url = EXCLUDED.apps_script_url,
           sheets_secret_token_encrypted = EXCLUDED.sheets_secret_token_encrypted,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
    [url, encryptedToken, admin.id],
  )
  revalidatePath('/')
  return { url, configured: true }
}
