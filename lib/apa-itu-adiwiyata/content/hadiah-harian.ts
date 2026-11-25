// Hadiah Harian — siklus 7 hari, klaim 1x sehari.
// Sistem sendiri, TERPISAH dari streak harian (DAILY_CHECKIN di
// context.tsx): streak menghitung hari berturut-turut main, hadiah harian
// memberi hadiah per hari kalender. Terlewat sehari hanya mengulang siklus
// dari hari 1 — reset yang lembut, bukan hukuman: tidak ada yang hilang.

export interface HadiahHarian {
  /** Hari ke-1..7 dalam satu siklus mingguan. */
  hari: number
  /** Koin Hijau yang didapat. */
  koinHijau?: number
  /** Uang (Rp) yang didapat. */
  uang?: number
  /** Koin Daun yang didapat. */
  koinDaun?: number
  /** Bila true, lapar & haus dipulihkan penuh ("Makan siang gratis"). */
  pulihkan?: boolean
  /** Label singkat untuk kotak trek (mis. "Hadiah besar"). */
  label: string
}

export const HADIAH_HARIAN: HadiahHarian[] = [
  { hari: 1, koinHijau: 50, label: '50 Koin Hijau' },
  { hari: 2, uang: 2000, label: 'Rp2.000' },
  { hari: 3, koinDaun: 10, label: '10 Koin Daun' },
  { hari: 4, koinHijau: 75, pulihkan: true, label: 'Makan siang gratis' },
  { hari: 5, uang: 5000, label: 'Rp5.000' },
  { hari: 6, koinDaun: 20, label: '20 Koin Daun' },
  { hari: 7, koinHijau: 150, uang: 5000, koinDaun: 25, label: 'Hadiah besar' },
]

/** Teks isi hadiah untuk pesan sukses dan kotak trek. */
export function teksHadiah(hadiah: HadiahHarian): string {
  const bagian: string[] = []
  if (hadiah.koinHijau) bagian.push(`${hadiah.koinHijau} Koin Hijau`)
  if (hadiah.uang) bagian.push(`Rp${hadiah.uang.toLocaleString('id-ID')}`)
  if (hadiah.koinDaun) bagian.push(`${hadiah.koinDaun} Koin Daun`)
  if (hadiah.pulihkan) bagian.push('lapar & haus pulih penuh')
  return bagian.join(' + ')
}

/** Tanggal lokal YYYY-MM-DD (jangan pakai UTC: hari berganti tengah malam setempat). */
export function hariIniLokal(d = new Date()): string {
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tanggal = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tanggal}`
}

/** Kemarin dalam tanggal lokal YYYY-MM-DD, dari tanggal hari ini. */
function kemarinLokal(hariIni: string): string {
  const d = new Date(`${hariIni}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() - 1)
  return hariIniLokal(d)
}

function normalisasiSiklus(siklus: number): number {
  return Number.isInteger(siklus) && siklus >= 1 && siklus <= 7 ? siklus : 1
}

/**
 * Hadiah berikutnya yang bisa diklaim.
 * - `terakhir` = tanggal klaim terakhir (null bila belum pernah klaim).
 * - `siklus` = hari terakhir yang diklaim (1-7); hadiah berikutnya adalah
 *   hari setelahnya, mengulang ke 1 setelah hari 7.
 * - Sudah klaim hari ini (atau tanggal terakhir di masa depan karena jam
 *   perangkat berubah) -> tidak bisa klaim.
 * - Terakhir klaim kemarin -> lanjut ke hari berikutnya dalam siklus.
 * - Belum pernah klaim, atau terakhir lebih lama dari kemarin (sehari
 *   terlewat) -> siklus mulai lagi dari hari 1.
 */
export function hadiahBerikutnya(
  terakhir: string | null,
  siklus: number,
  hariIni: string,
): { siklus: number; bisaKlaim: boolean } {
  const s = normalisasiSiklus(siklus)
  if (terakhir === hariIni) return { siklus: s, bisaKlaim: false }
  if (terakhir !== null && terakhir > hariIni) return { siklus: s, bisaKlaim: false }
  if (terakhir !== null && terakhir === kemarinLokal(hariIni)) {
    return { siklus: (s % 7) + 1, bisaKlaim: true }
  }
  return { siklus: 1, bisaKlaim: true }
}
