// Cloudflare Turnstile: kunci publik (Site Key) dari widget yang dibuat
// admin di dashboard Cloudflare untuk domain adiwiyata55jkt.my.id.
// Site Key boleh tampil di kode — ia memang terlihat di sumber halaman.
// Secret Key TIDAK ada di sini: dibaca dari env TURNSTILE_SECRET_KEY
// (diisi admin di Vercel). Selama env itu belum diisi, verifikasi
// dilewati (fail-open) supaya login tidak terkunci — proteksi baru
// aktif setelah secret diisi + redeploy.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAGREeJvpxnyOYhQn'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null,
): Promise<{ ok: boolean; skipped: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY belum diisi — verifikasi dilewati.')
    return { ok: true, skipped: true }
  }
  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (data.success !== true) {
      console.warn('[turnstile] verifikasi gagal:', data['error-codes'] ?? [])
    }
    return { ok: data.success === true, skipped: false }
  } catch (error) {
    console.error('[turnstile] siteverify tidak terjangkau:', error)
    return { ok: false, skipped: false }
  }
}
