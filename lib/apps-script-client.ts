// Klien Apps Script untuk aksi BACA (L-02): token dikirim lewat body
// POST, bukan query string (yang tercatat di log Apps Script).
// Untuk kompatibilitas, bila skrip yang ter-deploy belum mendukung POST
// untuk aksi baca (Code.gs lama), fallback ke GET. Hapus fallback
// setelah Code.gs baru ter-deploy.
import { readJsonResponse } from '@/lib/api-client'
import { getAppsScriptConfig } from '@/lib/sheets-config'

export async function callAppsScriptRead<T>(action: 'classes' | 'videos' | 'summary', fields: Record<string, string | undefined> = {}): Promise<T> {
  const { url, token } = await getAppsScriptConfig()
  const body: Record<string, unknown> = { action, token }
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== '') body[key] = value
  }
  try {
    const post = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const parsed = await readJsonResponse<T & { success?: boolean; error?: string }>(post)
    if (parsed && (parsed as { success?: boolean }).success) return parsed
  } catch {
    // Skrip lama: jatuh ke GET di bawah.
  }
  const target = new URL(url)
  target.searchParams.set('action', action)
  target.searchParams.set('token', token)
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== '') target.searchParams.set(key, value)
  }
  const response = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  return readJsonResponse<T>(response)
}
