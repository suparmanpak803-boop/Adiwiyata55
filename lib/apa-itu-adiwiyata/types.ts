// Tipe data model kampanye "Apa itu Adiwiyata".
// Nama field TIDAK BOLEH diubah: dipakai agen mini-game dan sistem pendukung.

export type ChapterId = 'gerbang' | 'kantin' | 'maggot' | 'kompos' | 'air-energi' | 'biodiversitas'
export type TongSampah = 'organik' | 'anorganik' | 'residu' | 'b3'

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
  completedAt: string | null
  updatedAt: string
}
