// Aturan dampak berantai antar bab (siklus tertutup):
// sisa makanan kantin -> maggot -> pakan ikan + kasgot -> pupuk kebun ->
// sayur -> kembali ke kantin. Kalau pemain salah langkah di satu bab,
// bab berikutnya terganggu, tapi dampaknya bisa diperbaiki di bab itu juga
// (bukan hukuman permanen).

export interface DampakBerantai {
  pemicu: string
  dampak: string
  perbaikan: string
}

export const ATURAN_SIKLUS: DampakBerantai[] = [
  {
    pemicu: 'Bungkus plastik berminyak salah masuk bak organik di Kantin.',
    dampak:
      'Minyak menempel di sisa makanan, maggot di Pos Maggot jadi rewel, bau kotak naik dan lalat datang.',
    perbaikan:
      'Beri pakan bersih (sisa nasi dan sayur yang sudah dicuci) lalu aduk kotak maggot sampai baunya hilang.',
  },
  {
    pemicu: 'Maggot diberi daging berlebih dan makanan berminyak di Pos Maggot.',
    dampak:
      'Kotak maggot bau dan sisa pakannya mencemari kompos di Bab 4.',
    perbaikan:
      'Tambah bahan cokelat seperti daun kering ke kompos, lalu aduk sampai udara masuk dan baunya hilang.',
  },
  {
    pemicu: 'Kompos yang bau dan belum matang dipakai untuk kebun.',
    dampak:
      'Tanaman cabai dan kangkung layu karena pupuknya belum siap.',
    perbaikan:
      'Ganti dengan kasgot yang benar dari panen maggot, lalu siram dan beri cahaya yang cukup sampai tanaman segar lagi.',
  },
]

// Id sampah (lihat content/sampah.ts) yang kalau salah pilah di Bab 2
// membuat maggot kena minyak di Bab 3.
const ITEM_BERMINYAK_ATAU_PLASTIK = [
  'bungkus-plastik-berminyak',
  'minyak-jelantah',
  'styrofoam',
]

// Id sampah yang kalau salah pilah ke bak organik membuat kompos bau di Bab 4.
const ITEM_PENCEMAR_KOMPOS = [
  'bungkus-plastik-berminyak',
  'minyak-jelantah',
  'popok-sekali-pakai',
]

/**
 * Menghitung dampak berantai dari daftar id sampah yang salah pilah di Bab 2.
 * Fungsi murni: tidak membaca atau mengubah state apa pun.
 */
export function hitungDampak(pilahSalah: string[]): {
  maggotKenaMinyak: boolean
  komposBau: boolean
} {
  return {
    maggotKenaMinyak: pilahSalah.some((id) =>
      ITEM_BERMINYAK_ATAU_PLASTIK.includes(id),
    ),
    komposBau: pilahSalah.some((id) => ITEM_PENCEMAR_KOMPOS.includes(id)),
  }
}
