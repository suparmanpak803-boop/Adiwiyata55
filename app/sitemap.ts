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
//
// lastmod: tanggal terakhir isi halaman berubah.
// - Sebelumnya: 2026-11-24 (commit terakhir file halaman, via GitHub API).
// - 2026-11-26: deploy ini mengubah isi semua 8 halaman sekaligus
//   (deskripsi meta baru 120–160 karakter, H1 beranda, heading pertanyaan,
//   intro section, tautan internal, judul "Kader & dokumentasi"),
//   jadi lastmod semua URL = 2026-11-26.
// Saat mengubah isi halaman di lain waktu, perbarui tanggal URL itu saja
// (patokan: tanggal commit yang menyentuh file sumber halaman itu).
export default function sitemap(): MetadataRoute.Sitemap {
  const weekly = (url: string, priority: number, lastModified: Date) => ({
    url,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority,
  })
  return [
    weekly(`${SITE_URL}/adiwiyata`, 1, new Date('2026-11-26')),
    weekly(`${SITE_URL}/adiwiyata/tentang`, 0.8, new Date('2026-11-26')),
    weekly(`${SITE_URL}/adiwiyata/profil`, 0.8, new Date('2026-11-26')),
    weekly(`${SITE_URL}/adiwiyata/program`, 0.8, new Date('2026-11-26')),
    weekly(`${SITE_URL}/adiwiyata/dokumentasi`, 0.8, new Date('2026-11-26')),
    weekly(`${SITE_URL}/adiwiyata/publikasi`, 0.8, new Date('2026-11-26')),
    weekly(`${SITE_URL}/adiwiyata/dokumen`, 0.8, new Date('2026-11-26')),
    weekly(`${SITE_URL}/edukasi`, 0.8, new Date('2026-11-26')),
  ]
}
