// Hadiah Koin Hijau untuk dua game arkade di dunia (Tangkap Sampah dan
// Kuis Adiwiyata). Satu tempat supaya angka yang ditampilkan game dan yang
// diberikan runner tidak pernah berbeda.

/** Game arkade yang dibuka lewat NPC di dunia. */
export type ArkadeGame = 'tangkap' | 'kuis'

/** Tangkap Sampah: 1 koin per 10 poin skor, maksimal 30 koin per main. */
export function koinTangkapSampah(skor: number): number {
  return Math.min(30, Math.max(0, Math.floor(skor / 10)))
}

/** Kuis Adiwiyata: 3 koin per jawaban benar (12 soal -> maksimal 36 koin). */
export function koinKuis(benar: number): number {
  return Math.min(36, Math.max(0, benar * 3))
}

/** Satu fungsi untuk runner: game + skor mentah -> koin. */
export function koinArkade(game: ArkadeGame, skor: number): number {
  return game === 'tangkap' ? koinTangkapSampah(skor) : koinKuis(skor)
}

/** Batas harian koin arkade (F13): 150 Koin Hijau/hari gabungan kedua
 * game arkade (Tangkap Sampah + Kuis Adiwiyata). */
export const BATAS_KOIN_ARKADE_HARIAN = 150

/** Tanggal lokal hari ini (YYYY-MM-DD, bukan UTC — hari berganti tengah
 * malam waktu setempat, sama seperti streak/kasur/uang saku). */
export function tanggalHariIni(): string {
  const d = new Date()
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tanggal = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tanggal}`
}

/** Koin arkade yang benar-benar diberikan: koin yang diminta dijepit ke
 * sisa batas harian. Hari baru (tanggal tersimpan != hari ini) memulai
 * hitungan dari 0. Fungsi murni — dipakai runner, layar hasil game, dan
 * (sebagai validasi ulang) reducer ARKADE_KOIN supaya angka yang
 * ditampilkan selalu sama dengan yang masuk ke saldo. */
export function koinArkadeDiberikan(
  koinDiminta: number,
  tanggalTersimpan: string | null,
  koinHariIni: number,
  hariIni: string,
): number {
  const sudah = tanggalTersimpan === hariIni ? Math.max(0, koinHariIni) : 0
  return Math.max(0, Math.min(Math.max(0, koinDiminta), BATAS_KOIN_ARKADE_HARIAN - sudah))
}
