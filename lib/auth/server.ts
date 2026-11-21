// Instance Neon Auth sisi server (Better Auth yang di-host Neon).
// Pola ini persis seperti yang dipakai call-site:
//   getAuth().handler()  -> app/api/auth/[...path]/route.ts
//   getAuth().getSession() -> app/sign-in/page.tsx, app/sign-up/page.tsx
//
// Paketnya @neondatabase/auth (bukan @neon/auth yang lebih baru —
// SDK 0.8 itu API-nya berbeda dan tidak cocok dengan kode ini).
// Env wajib: NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET (min. 32 karakter).
// Keduanya diisi dari dashboard Neon Auth; tanpa keduanya login
// tidak bisa berjalan — ini konfigurasi, bukan bug kode.
import { createNeonAuth } from '@neondatabase/auth/next/server'

let authInstance: ReturnType<typeof createNeonAuth> | null = null

export function getAuth() {
  if (!authInstance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL
    const secret = process.env.NEON_AUTH_COOKIE_SECRET
    if (!baseUrl) {
      throw new Error('NEON_AUTH_BASE_URL belum dikonfigurasi. Isi URL instance Neon Auth di environment.')
    }
    if (!secret || secret.length < 32) {
      throw new Error('NEON_AUTH_COOKIE_SECRET belum dikonfigurasi atau kurang dari 32 karakter.')
    }
    authInstance = createNeonAuth({
      baseUrl,
      cookies: { secret },
    })
  }
  return authInstance
}
