// Misi kampanye "Apa itu Adiwiyata": tiap bab adalah satu misi yang
// diberikan NPC di dunia. Daftar bab tetap di chapters.ts; file ini hanya
// memetakan bab ke pemberi misinya dan menghitung status misi dari save.
import { CHAPTER_ORDER } from './chapters'
import { selectChapterUnlocked } from './context'
import { NPCS, type NpcDunia } from './dunia'
import type { CampaignSave, ChapterId } from './types'

/** Lokasi pemberi misi di dunia (label untuk pemain, bukan koordinat). */
export const LOKASI_PEMBERI: Record<string, string> = {
  'pak-plastik': 'Gerbang',
  'kang-kantin': 'Kantin',
  magi: 'Pos Maggot',
  'pak-kebun': 'Kebun',
  'mbak-rani': 'Taman Air',
  'bu-sari': 'dekat Gerbang',
}

export type StatusMisi = 'selesai' | 'tersedia' | 'terkunci'

/** NPC yang memberi misi bab ini. */
export function pemberiMisi(chapterId: ChapterId): NpcDunia | undefined {
  return NPCS.find((n) => n.chapterId === chapterId)
}

export function statusMisi(save: CampaignSave, chapterId: ChapterId): StatusMisi {
  if (save.chapters[chapterId].done) return 'selesai'
  return selectChapterUnlocked(save, chapterId) ? 'tersedia' : 'terkunci'
}

/** Misi yang sedang berjalan: bab pertama yang terbuka tapi belum selesai. */
export function misiSaatIni(save: CampaignSave): ChapterId | null {
  return CHAPTER_ORDER.find((id) => statusMisi(save, id) === 'tersedia') ?? null
}

export function jumlahMisiSelesai(save: CampaignSave): number {
  return CHAPTER_ORDER.filter((id) => save.chapters[id].done).length
}
