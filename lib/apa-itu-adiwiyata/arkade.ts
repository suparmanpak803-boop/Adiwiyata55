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
