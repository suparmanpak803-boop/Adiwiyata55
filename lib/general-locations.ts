// Lokasi umum (bukan kelas) yang boleh menerima setoran sampah.
// Daftar ini HARUS sama dengan GENERAL_LOCATIONS di apps-script/Code.gs
// dan dengan fallback hardcode di app/api/submit/route.ts — sebelumnya
// Code.gs berisi [] sehingga setoran lokasi umum selalu ditolak Apps
// Script (bug B-03), padahal Next.js menganggapnya valid.
export const GENERAL_LOCATIONS = ['Kantin', 'Halaman', 'Lab', 'Perpustakaan', 'Taman'] as const
