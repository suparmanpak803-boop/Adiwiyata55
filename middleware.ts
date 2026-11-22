// Middleware Neon Auth — WAJIB agar login Google berhasil.
//
// Tanpa middleware ini, penukaran verifier OAuth menjadi sesi tidak pernah
// berjalan: setelah memilih akun Google, browser kembali ke '/' tanpa sesi
// apa pun, lalu portal mengarahkannya lagi ke /sign-in. Itulah penyebab
// login selalu "balik ke halaman login lagi".
//
// I-02 (defense-in-depth): matcher diperluas ke halaman yang memang wajib
// login — /admin/*, /game, /laporan-kader, /leaderboard. Pengunjung tanpa
// sesi diarahkan ke /sign-in sebelum mencapai handler halaman.
// Route API SENGAJA tidak masuk matcher: middleware SDK menjawab sesi
// yang hilang dengan redirect ke /sign-in (bukan JSON 401), dan itu akan
// merusak klien fetch yang mengharapkan JSON. Route API tetap mengandalkan
// pengecekan auth di tiap handler (sudah diverifikasi semua punya).
import { getAuth } from '@/lib/auth/server'

export default getAuth().middleware({ loginUrl: '/sign-in' })

export const config = {
  matcher: ['/', '/admin/:path*', '/game', '/laporan-kader', '/leaderboard'],
}
