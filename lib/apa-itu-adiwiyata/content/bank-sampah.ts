// Bank Sampah di Kebun — stasiun setor sampah liar yang dibawa pemain.
// Beda dengan Tempat Sampah Terpilah (content/bak.ts): di sini pemain
// tidak perlu memilih bak, semua sampah disetor sekaligus dan langsung
// jadi uang + Koin Hijau. Dipakai reducer (context.tsx), dialog Bank
// Sampah (jelajah.tsx), dan Cara Bermain, supaya hadiahnya tidak ditulis
// ulang di tiap file.

/** Hadiah menyetor 1 sampah liar ke Bank Sampah (berapa pun jenisnya). */
export const HADIAH_BANK_UANG = 500
export const HADIAH_BANK_KOIN = 5

export interface RingkasanSetoran {
  /** Jumlah sampah yang disetor (semua jenis digabung). */
  jumlah: number
  /** Total uang (Rp) yang didapat. */
  uang: number
  /** Total Koin Hijau yang didapat. */
  koin: number
}

/** Hitung ringkasan setor dari inventaris `sampahDibawa` (jumlah per jenis).
 * Jumlah rusak (bukan angka positif) diabaikan; inventaris kosong -> 0. */
export function hitungSetoran(sampahDibawa: Record<string, number>): RingkasanSetoran {
  const jumlah = Object.values(sampahDibawa).reduce(
    (a, b) => a + (typeof b === 'number' && Number.isFinite(b) && b > 0 ? Math.floor(b) : 0),
    0,
  )
  return { jumlah, uang: jumlah * HADIAH_BANK_UANG, koin: jumlah * HADIAH_BANK_KOIN }
}
