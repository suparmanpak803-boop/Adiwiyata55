// Tipe data model kampanye "Apa itu Adiwiyata".
// Nama field TIDAK BOLEH diubah: dipakai agen mini-game dan sistem pendukung.

import type { DuniaHidup } from './dunia-hidup'

export type ChapterId = 'gerbang' | 'kantin' | 'maggot' | 'kompos' | 'air-energi' | 'biodiversitas'
export type TongSampah = 'organik' | 'anorganik' | 'residu' | 'b3'

/** Status Pak Plastik dalam alur Cerita Bercabang (lihat content/cerita.ts). */
export type PakPlastikStatus = 'netral' | 'dibujuk' | 'dilawan' | 'dijebak'

// Trek paralel "Misi Kader": 8 misi penuh (masing-masing 3 tahap) untuk
// 8 tim kader yang belum tercakup kampanye 6 bab. Trek ini independen dari
// bab utama: semua misi tersedia sejak awal, tidak berantai.
export type TugasKaderId =
  | 'bank-sampah'
  | 'lingkungan-sehat'
  | 'edu-lingkungan'
  | 'inovasi-hijau'
  | 'kantin-hijau'
  | 'data-hijau'
  | 'eco-communication'
  | 'jejaring-hijau'

export const TUGAS_ORDER: TugasKaderId[] = [
  'bank-sampah',
  'lingkungan-sehat',
  'edu-lingkungan',
  'inovasi-hijau',
  'kantin-hijau',
  'data-hijau',
  'eco-communication',
  'jejaring-hijau',
]

export type StageStatus = 'locked' | 'open' | 'done'

export interface StageProgress {
  status: StageStatus
  bestScore: number
}

export interface ChapterProgress {
  stages: [StageProgress, StageProgress, StageProgress]
  done: boolean
  badgeEarned: boolean
}

/** Cermin ChapterProgress untuk satu Misi Kader. */
export interface TugasProgress {
  stages: [StageProgress, StageProgress, StageProgress]
  done: boolean
  badgeEarned: boolean
}

export interface Checkpoint {
  chapterId: ChapterId
  stageId: number
  state: unknown
  savedAt: string
}

export interface PromiseItem {
  id: string
  text: string
  chapterId: ChapterId
  done: boolean
  createdAt: string
}

export interface Report {
  sampah: number
  energi: number
  air: number
  hijau: number
  biodiversitas: number
}

export interface Carryover {
  maggotKenaMinyak: boolean
  komposBau: boolean
  kebunLayu: boolean
}

export interface CampaignSave {
  version: 1
  nickname: string
  hideName: boolean
  coins: number
  streak: { count: number; lastDay: string | null; multiplierActive: boolean }
  chapters: Record<ChapterId, ChapterProgress>
  tugas: Record<TugasKaderId, TugasProgress>
  checkpoint: Checkpoint | null
  bestScores: Record<string, number>
  unlockedCards: string[]
  badges: string[]
  promises: PromiseItem[]
  report: Report
  carryover: Carryover
  species: string[]
  muted: boolean
  volumeMusik: number
  volumeEfek: number
  /** Mode satu-ketukan: mini-game memakai versi tombol (tanpa gestur seret/putar/tahan). */
  modeSatuKetukan: boolean
  /** Simulasi Dunia Hidup: kebun, maggot, sampah liar (lihat dunia-hidup.ts). */
  dunia: DuniaHidup
  /** Pilihan Cerita Bercabang: kunci `${misi}:${titikId}` -> id opsi (lihat content/cerita.ts). */
  cerita: Record<string, string>
  /** Status Pak Plastik dalam alur Cerita Bercabang. */
  pakPlastik: PakPlastikStatus
  /** Skor terbaik dua game arkade di dunia (Tangkap Sampah, Kuis Adiwiyata). */
  arkade: { tangkap: number; kuis: number }
  /** Bar lapar & haus (0-100). Berkurang tiap tahap selesai dan tiap hari
   * berlalu di Dunia Hidup; dipulihkan lewat Kantin / bekal / air keran.
   * Bila salah satunya 0, pemain "lemas" dan tidak bisa mulai tahap baru
   * (bukan hukuman: tidak ada progres/koin yang hilang). */
  lapar: number
  haus: number
  /** Uang (Rp) untuk belanja makanan/minuman di Kantin. */
  uang: number
  /** Koin Daun: mata uang hadiah untuk gear, pohon, dan kostum. */
  koinDaun: number
  /** Id gear/kostum yang sudah dibeli di Toko Kantin. */
  inventaris: string[]
  /** Kostum yang sedang dipakai tokoh pemain (null = seragam biasa). */
  kostumDipakai: string | null
  /** Jumlah pohon yang ditanam lewat Toko Kantin (100 Koin Daun/pohon). */
  pohonDitanam: number
  /** Bekal gratis harian: tanggal lokal terakhir bekal diambil + berapa
   * kali diambil hari itu (jatah 1x/hari, 2x/hari bila punya Lunch Box). */
  bekalTanggal: string | null
  bekalDipakai: number
  completedAt: string | null
  updatedAt: string
}
