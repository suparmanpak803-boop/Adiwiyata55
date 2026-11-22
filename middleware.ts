// Middleware Neon Auth — WAJIB agar login Google berhasil.
//
// Tanpa middleware ini, penukaran verifier OAuth menjadi sesi tidak pernah
// berjalan: setelah memilih akun Google, browser kembali ke '/' tanpa sesi
// apa pun, lalu portal mengarahkannya lagi ke /sign-in. Itulah penyebab
// login selalu "balik ke halaman login lagi".
//
// Matcher sengaja hanya '/' — satu-satunya callbackURL OAuth di aplikasi
// (components/auth-form.tsx memakai callbackURL: '/'). Dengan begitu,
// halaman publik (/adiwiyata, /api/health, dll.) tidak ikut terkena
// proteksi rute bawaan middleware, yang hanya mengizinkan rute
// /api/auth dan /auth/* tanpa sesi.
import { getAuth } from '@/lib/auth/server'

export default getAuth().middleware({ loginUrl: '/sign-in' })

export const config = {
  matcher: ['/'],
}
