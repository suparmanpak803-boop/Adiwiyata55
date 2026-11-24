import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.adiwiyata55jkt.my.id'

// Hanya URL publik yang boleh diindeks. Sengaja TIDAK dimasukkan:
// - '/' (portal) — pengunjung dialihkan ke /sign-in bila belum login,
//   jadi bukan halaman konten publik; beranda publik adalah /adiwiyata.
// - '/adiwiyata/struktur' — isi lengkapnya hanya tampil bila sudah login.
// - '/sign-in', '/sign-up', '/forgot-password', '/reset-password',
//   '/game', '/leaderboard', '/laporan', '/laporan-kader', '/admin/*' —
//   halaman login/auth atau wajib login (juga noindex + disallow).
// - '/api/*' — endpoint, bukan halaman.
export default function sitemap(): MetadataRoute.Sitemap {
  const weekly = (url: string, priority: number) => ({ url, changeFrequency: 'weekly' as const, priority })
  return [
    weekly(`${SITE_URL}/adiwiyata`, 1),
    weekly(`${SITE_URL}/adiwiyata/tentang`, 0.8),
    weekly(`${SITE_URL}/adiwiyata/profil`, 0.8),
    weekly(`${SITE_URL}/adiwiyata/program`, 0.8),
    weekly(`${SITE_URL}/adiwiyata/dokumentasi`, 0.8),
    weekly(`${SITE_URL}/adiwiyata/publikasi`, 0.8),
    weekly(`${SITE_URL}/adiwiyata/dokumen`, 0.8),
    weekly(`${SITE_URL}/edukasi`, 0.8),
  ]
}
