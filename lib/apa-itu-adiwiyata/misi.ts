// Misi kampanye "Apa itu Adiwiyata": tiap bab adalah satu misi yang
// diberikan NPC di dunia. Daftar bab tetap di chapters.ts; file ini hanya
// memetakan bab ke pemberi misinya dan menghitung status misi dari save.
// Misi Kader (trek paralel) dipetakan dengan cara yang sama di bawah.
import { CHAPTER_ORDER } from './chapters'
import { selectChapterUnlocked, selectTugasUnlocked } from './context'
import { TUGAS } from './tugas'
import { NPCS, type NpcDunia } from './dunia'
import type { CampaignSave, ChapterId, TugasKaderId } from './types'
import { TUGAS_ORDER } from './types'

/** Lokasi pemberi misi di dunia (label untuk pemain, bukan koordinat). */
export const LOKASI_PEMBERI: Record<string, string> = {
  'pak-plastik': 'Gerbang',
  'kang-kantin': 'Kantin',
  magi: 'Pos Maggot',
  'pak-kebun': 'Kebun',
  'mbak-rani': 'Taman Air',
  'bu-sari': 'dekat Gerbang',
  // Pemberi Misi Kader (lokasi = zona dari TUGAS).
  'npc-bank-sampah': 'Bank Sampah',
  'npc-lingkungan-sehat': 'Taman & Toilet',
  'npc-edu-lingkungan': 'Kebun',
  'npc-inovasi-hijau': 'Taman',
  'npc-kantin-hijau': 'Kantin',
  'npc-data-hijau': 'Pos Data',
  'npc-eco-communication': 'Kebun',
  'npc-jejaring-hijau': 'Gerbang',
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

// ------------------------------------------------------- Misi Kader ----

/** NPC yang memberi Misi Kader ini. */
export function pemberiTugas(tugasId: TugasKaderId): NpcDunia | undefined {
  return NPCS.find((n) => n.tugasId === tugasId)
}

/** Status Misi Kader: selesai bila sudah dikerjakan, selain itu tersedia
 * (kedelapan Misi Kader tersedia sejak awal, tidak berantai seperti bab). */
export function statusTugas(save: CampaignSave, tugasId: TugasKaderId): StatusMisi {
  if (save.tugas[tugasId].done) return 'selesai'
  return selectTugasUnlocked(save, tugasId) ? 'tersedia' : 'terkunci'
}

/** Misi Kader yang sedang berjalan: yang pertama belum selesai. */
export function tugasSaatIni(save: CampaignSave): TugasKaderId | null {
  return TUGAS_ORDER.find((id) => !save.tugas[id].done) ?? null
}

export function jumlahTugasSelesai(save: CampaignSave): number {
  return TUGAS_ORDER.filter((id) => save.tugas[id].done).length
}

/** Label lokasi pemberi Misi Kader (zona dari data TUGAS). */
export function lokasiTugas(tugasId: TugasKaderId): string {
  return TUGAS[tugasId].zona
}
