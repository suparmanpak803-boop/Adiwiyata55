// DATA DUMMY — leaderboard kampanye "Apa itu Adiwiyata".
// Angka di bawah ini hanya contoh dan mudah diganti dengan data API
// (mis. dari endpoint skor antarkelas) saat backend sudah ada.
// Skor kelas = total poin dibagi jumlah siswa (dihitung di komponen).
export interface KelasDummy {
  id: string
  nama: string
  jumlahSiswa: number
  poinMingguan: number
  poinBulanan: number
}

export const KELAS_DUMMY: KelasDummy[] = [
  { id: 'kls-x1', nama: 'X-1', jumlahSiswa: 32, poinMingguan: 214, poinBulanan: 812 },
  { id: 'kls-x4', nama: 'X-4', jumlahSiswa: 30, poinMingguan: 186, poinBulanan: 745 },
  { id: 'kls-xi2', nama: 'XI-2', jumlahSiswa: 34, poinMingguan: 248, poinBulanan: 931 },
  { id: 'kls-xi5', nama: 'XI-5', jumlahSiswa: 28, poinMingguan: 167, poinBulanan: 658 },
  { id: 'kls-xii3', nama: 'XII-3', jumlahSiswa: 31, poinMingguan: 229, poinBulanan: 884 },
  { id: 'kls-x2', nama: 'X-2', jumlahSiswa: 35, poinMingguan: 198, poinBulanan: 770 },
  { id: 'kls-xi1', nama: 'XI-1', jumlahSiswa: 29, poinMingguan: 241, poinBulanan: 902 },
  { id: 'kls-xii1', nama: 'XII-1', jumlahSiswa: 33, poinMingguan: 175, poinBulanan: 690 },
]

// DATA DUMMY — peringkat individu (nama panggilan). Urut dari poin tertinggi.
export interface PemainDummy {
  nama: string
  kelas: string
  poin: number
}

export const PEMAIN_DUMMY: PemainDummy[] = [
  { nama: 'Dimas', kelas: 'XII-3', poin: 486 },
  { nama: 'Naya', kelas: 'XI-2', poin: 462 },
  { nama: 'Raka', kelas: 'X-1', poin: 441 },
  { nama: 'Sinta', kelas: 'XI-1', poin: 418 },
  { nama: 'Fajar', kelas: 'X-4', poin: 395 },
  { nama: 'Kirana', kelas: 'XII-1', poin: 372 },
  { nama: 'Bimo', kelas: 'X-2', poin: 350 },
  { nama: 'Lala', kelas: 'XI-5', poin: 328 },
  { nama: 'Yoga', kelas: 'XII-3', poin: 305 },
  { nama: 'Aurel', kelas: 'X-1', poin: 284 },
]
