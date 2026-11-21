// Konstanta domain laporan & saran.
// Nilai id/status/urgensi mengikuti CHECK constraint db/tahap-5-laporan.sql.
// Label dan needsLocation adalah keputusan rekonstruksi (tidak ada salinan
// aslinya yang tersisa di repo — lihat PERBAIKAN.md): kategori yang
// menyangkut tempat kejadian wajib diisi lokasinya.
export const KATEGORI = [
  { id: 'kondisi_lapangan', label: 'Kondisi Lapangan', needsLocation: true },
  { id: 'pelanggaran', label: 'Pelanggaran', needsLocation: true },
  { id: 'saran', label: 'Saran', needsLocation: false },
  { id: 'apresiasi', label: 'Apresiasi', needsLocation: false },
  { id: 'kendala_teknis', label: 'Kendala Teknis', needsLocation: true },
] as const

export const URGENSI = [
  { id: 'rendah', label: 'Rendah' },
  { id: 'sedang', label: 'Sedang' },
  { id: 'tinggi', label: 'Tinggi' },
] as const

export const STATUS_LABEL: Record<string, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
}

// 24 kelas X/XI/XII rombel A–H — sama dengan seed Master_Kelas di Code.gs.
export const LOKASI_KELAS: readonly string[] = (['X', 'XI', 'XII'] as const).flatMap((grade) =>
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((rombel) => `${grade}-${rombel}`),
)

export const LOKASI_UMUM: readonly string[] = ['Kantin', 'Halaman', 'Lab', 'Perpustakaan', 'Taman']

export const ALLOWED_LOCATIONS: readonly string[] = [...LOKASI_KELAS, ...LOKASI_UMUM]

export const MAX_PHOTOS = 3
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024
export const PHOTO_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']

// Batas harian per pengguna. Nilai asli tidak tersisa di repo;
// 5 dipilih sebagai batas yang wajar untuk laporan siswa.
export const DAILY_LIMIT = 5
