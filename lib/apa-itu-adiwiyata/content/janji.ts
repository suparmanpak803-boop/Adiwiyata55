// Daftar janji harian yang bisa dipilih pemain di akhir tiap bab (Pos Hijau).
// Janji yang dipilih tampil lagi saat game dibuka, dengan tombol
// "Sudah kulakukan" sebagai check-in.
export interface Janji {
  id: string
  teks: string
}

export const JANJI_HARIAN: Janji[] = [
  { id: 'janji-tumbler', teks: 'Besok bawa tumbler' },
  { id: 'janji-pilah-kantin', teks: 'Pilah sisa makanan di kantin' },
  { id: 'janji-tas-kain', teks: 'Bawa tas kain' },
  { id: 'janji-lunch-box', teks: 'Bawa lunch box' },
  { id: 'janji-lampu', teks: 'Matikan lampu kelas saat istirahat' },
  { id: 'janji-botol-bersih', teks: 'Kumpulkan botol plastik bersih' },
  { id: 'janji-siram-tanaman', teks: 'Siram tanaman di kebun sekolah' },
  { id: 'janji-keran-bocor', teks: 'Laporkan keran bocor' },
  { id: 'janji-tanpa-plastik', teks: 'Bawa bekal tanpa bungkus plastik' },
  { id: 'janji-ajak-teman', teks: 'Ajak satu teman memilah sampah' },
]
