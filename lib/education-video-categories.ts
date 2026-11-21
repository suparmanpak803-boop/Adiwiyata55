// Kategori video edukasi yang diizinkan. Daftar ini dipakai sebagai chip
// filter di halaman publik, opsi di panel admin, dan validasi server.
// Urutan sama dengan contoh di apps-script/Code.gs dan SQL default
// kategori 'Pemilahan Sampah' adalah elemen pertama.
export const allowedVideoCategories = [
  'Pemilahan Sampah',
  'Daur Ulang',
  'Kompos',
  'Wadah Makan Ramah Lingkungan',
  'Kegiatan Adiwiyata SMAN 55',
] as const
