// Data sampah untuk mini-game Pilah Sampah (Bab 2) dan konten pendukung.
// Sistem bak memakai sistem asli SMAN 55: 5 bak.
// - organik: sisa makanan, daun, ranting (bisa membusuk / jadi kompos / pakan maggot)
// - anorganik: barang bersih yang masih bisa didaur ulang (plastik bersih masuk sini)
// - kertas: kertas, koran, dan kardus yang kering dan bersih
// - residu: sulit atau tidak bisa didaur ulang
// - b3: bahan berbahaya dan beracun, harus ditangani khusus
import type { TongSampah } from '../types'

export interface SampahItem {
  id: string
  nama: string
  tong: TongSampah
  penjelasan: string
}

export const SAMPAH: SampahItem[] = [
  {
    id: 'bungkus-plastik-berminyak',
    nama: 'Bungkus plastik berminyak',
    tong: 'residu',
    penjelasan:
      'Minyaknya bikin plastik ini susah dicuci dan didaur ulang, jadi masuk residu saja.',
  },
  {
    id: 'kertas-basah',
    nama: 'Kertas basah',
    tong: 'residu',
    penjelasan:
      'Kertas yang sudah basah seratnya rusak dan gampang sobek, tidak bisa didaur ulang lagi.',
  },
  {
    id: 'baterai',
    nama: 'Baterai bekas',
    tong: 'b3',
    penjelasan:
      'Baterai mengandung bahan kimia berbahaya, jangan campur dengan sampah lain. Kumpulkan di tempat khusus B3.',
  },
  {
    id: 'lampu-bekas',
    nama: 'Lampu bekas',
    tong: 'b3',
    penjelasan:
      'Lampu bekas, apalagi yang neon, mengandung zat berbahaya. Masuk B3 supaya ditangani dengan aman.',
  },
  {
    id: 'masker',
    nama: 'Masker bekas',
    tong: 'residu',
    penjelasan:
      'Masker bekas sebaiknya tidak didaur ulang, jadi masuk residu.',
  },
  {
    id: 'kulit-pisang',
    nama: 'Kulit pisang',
    tong: 'organik',
    penjelasan:
      'Kulit pisang gampang membusuk dan bisa jadi kompos, atau jadi pakan maggot.',
  },
  {
    id: 'sisa-nasi',
    nama: 'Sisa nasi',
    tong: 'organik',
    penjelasan:
      'Sisa nasi bisa dimakan maggot atau masuk kompos. Jangan dibuang ke bak lain.',
  },
  {
    id: 'botol-plastik-bersih',
    nama: 'Botol plastik bersih',
    tong: 'anorganik',
    penjelasan:
      'Botol plastik yang sudah dibilas dan bersih masih laku didaur ulang, jadi masuk anorganik.',
  },
  {
    id: 'kardus',
    nama: 'Kardus',
    tong: 'kertas',
    penjelasan:
      'Kardus kering masuk bak Kertas, bisa didaur ulang jadi kertas baru. Lipat dulu biar ringkas.',
  },
  {
    id: 'sisa-sayur',
    nama: 'Sisa sayur',
    tong: 'organik',
    penjelasan:
      'Sisa sayur cepat membusuk dan cocok jadi pakan maggot atau bahan kompos.',
  },
  {
    id: 'daun-kering',
    nama: 'Daun kering',
    tong: 'organik',
    penjelasan:
      'Daun kering itu bahan cokelat untuk kompos. Kumpulkan, jangan dibakar.',
  },
  {
    id: 'kertas-hvs-bersih',
    nama: 'Kertas HVS bersih',
    tong: 'kertas',
    penjelasan:
      'Kertas HVS yang masih bersih dan kering masuk bak Kertas, bisa didaur ulang. Jangan diremas terlalu kecil.',
  },
  {
    id: 'koran-bekas',
    nama: 'Koran bekas',
    tong: 'kertas',
    penjelasan:
      'Koran bekas masuk bak Kertas, masih bisa didaur ulang, asal kering dan tidak berminyak.',
  },
  {
    id: 'majalah-bekas',
    nama: 'Majalah bekas',
    tong: 'kertas',
    penjelasan:
      'Majalah bekas yang kering masuk bak Kertas. Lepas dulu sampul plastiknya bila ada.',
  },
  {
    id: 'botol-kaca',
    nama: 'Botol kaca',
    tong: 'anorganik',
    penjelasan:
      'Kaca bisa dilebur dan dipakai ulang berkali-kali. Hati-hati, jangan sampai pecah.',
  },
  {
    id: 'kaleng-minuman',
    nama: 'Kaleng minuman',
    tong: 'anorganik',
    penjelasan:
      'Kaleng aluminium gampang didaur ulang dan nilainya lumayan. Bilas sebentar sebelum dibuang.',
  },
  {
    id: 'styrofoam',
    nama: 'Styrofoam',
    tong: 'residu',
    penjelasan:
      'Styrofoam sulit diurai dan tidak diterima daur ulang di sini, jadi masuk residu.',
  },
  {
    id: 'sedotan-plastik',
    nama: 'Sedotan plastik',
    tong: 'residu',
    penjelasan:
      'Sedotan terlalu kecil untuk mesin daur ulang, jadi masuk residu. Lebih baik bawa sedotan sendiri yang bisa dipakai ulang.',
  },
  {
    id: 'tisu-bekas',
    nama: 'Tisu bekas',
    tong: 'residu',
    penjelasan:
      'Tisu bekas sudah kotor dan seratnya terlalu pendek untuk didaur ulang.',
  },
  {
    id: 'minyak-jelantah',
    nama: 'Minyak jelantah',
    tong: 'b3',
    penjelasan:
      'Minyak jelantah jangan dibuang ke wastafel, bisa menyumbat dan mencemari air. Kumpulkan, lalu serahkan ke tempat pengumpulan.',
  },
  {
    id: 'obat-kedaluwarsa',
    nama: 'Obat kedaluwarsa',
    tong: 'b3',
    penjelasan:
      'Obat kedaluwarsa mengandung bahan kimia aktif, jangan dibuang sembarangan. Masuk B3.',
  },
  {
    id: 'kulit-jeruk',
    nama: 'Kulit jeruk',
    tong: 'organik',
    penjelasan:
      'Kulit jeruk bisa masuk kompos, aromanya juga bisa mengusir serangga di kebun.',
  },
  {
    id: 'ampas-teh-kopi',
    nama: 'Ampas teh dan kopi',
    tong: 'organik',
    penjelasan:
      'Ampas teh dan kopi cocok untuk kompos, bahkan bisa langsung ditabur ke tanaman.',
  },
  {
    id: 'kotak-susu-bilas',
    nama: 'Kotak susu bekas yang sudah dibilas',
    tong: 'anorganik',
    penjelasan:
      'Kotak susu yang sudah dibilas dan dikeringkan bisa didaur ulang. Kalau masih bau susu, bilas dulu.',
  },
  {
    id: 'bungkus-snack-bersih',
    nama: 'Bungkus snack plastik bersih',
    tong: 'anorganik',
    penjelasan:
      'Bungkus snack yang bersih dan kering masih bisa masuk daur ulang plastik. Yang berminyak beda cerita, itu residu.',
  },
  {
    id: 'popok-sekali-pakai',
    nama: 'Popok sekali pakai',
    tong: 'residu',
    penjelasan:
      'Popok bekas tidak bisa didaur ulang, jadi masuk residu. Sebisa mungkin kurangi pemakaiannya.',
  },
  {
    id: 'ranting-kecil',
    nama: 'Ranting kecil',
    tong: 'organik',
    penjelasan:
      'Ranting kecil bisa dipotong dan masuk kompos sebagai bahan cokelat.',
  },
]
