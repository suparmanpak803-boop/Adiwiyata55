// Penyimpanan progres kampanye "Apa itu Adiwiyata" di localStorage.
// Skema berversi: kunci 'aia-save-v1' + field version di dalam save.
// Semua akses localStorage dibungkus try/catch: aman bila window tidak ada
// (render server), storage penuh, atau data rusak.

import { CHAPTER_ORDER } from './chapters'
import { freshDunia, type DuniaHidup } from './dunia-hidup'
import { TUGAS_ORDER } from './types'
import type { CampaignSave, ChapterId, ChapterProgress, StageProgress, TugasKaderId, TugasProgress } from './types'

export const SAVE_KEY = 'aia-save-v1'
export const SAVE_VERSION = 1 as const

function freshStage(status: StageProgress['status']): StageProgress {
  return { status, bestScore: 0 }
}

function freshChapter(firstStageOpen: boolean): ChapterProgress {
  return {
    stages: [
      freshStage(firstStageOpen ? 'open' : 'locked'),
      freshStage('locked'),
      freshStage('locked'),
    ],
    done: false,
    badgeEarned: false,
  }
}

/** Cermin freshChapter: semua Misi Kader mulai dengan tahap pertama terbuka. */
function freshTugas(): TugasProgress {
  return {
    stages: [freshStage('open'), freshStage('locked'), freshStage('locked')],
    done: false,
    badgeEarned: false,
  }
}

export function freshSave(nickname = ''): CampaignSave {
  const chapters = {} as Record<ChapterId, ChapterProgress>
  for (const id of CHAPTER_ORDER) {
    chapters[id] = freshChapter(id === 'gerbang')
  }
  const tugas = {} as Record<TugasKaderId, TugasProgress>
  for (const id of TUGAS_ORDER) {
    tugas[id] = freshTugas()
  }
  return {
    version: SAVE_VERSION,
    nickname,
    hideName: false,
    coins: 0,
    streak: { count: 0, lastDay: null, multiplierActive: false },
    chapters,
    tugas,
    checkpoint: null,
    bestScores: {},
    unlockedCards: [],
    badges: [],
    promises: [],
    report: { sampah: 0, energi: 0, air: 0, hijau: 0, biodiversitas: 0 },
    carryover: { maggotKenaMinyak: false, komposBau: false, kebunLayu: false },
    species: [],
    muted: false,
    volumeMusik: 0.7,
    volumeEfek: 0.9,
    modeSatuKetukan: false,
    dunia: freshDunia(),
    cerita: {},
    pakPlastik: 'netral',
    arkade: { tangkap: 0, kuis: 0 },
    completedAt: null,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Apakah save ini punya progres yang layak dilanjutkan (bukan permainan
 * baru)? Dipakai Layar Awal: ada progres -> tampil "Lanjutkan" +
 * "Mulai dari Awal" (dengan konfirmasi); belum ada -> tombol utama "Mulai".
 * Nama panggilan saja belum dihitung progres — pemain yang baru mengisi nama
 * tetap mendapat "Mulai". Nilai awal dunia (maggot lapar 20, sampah liar 3,
 * petak tahap 0) bukan progres; perubahan dari nilai itulah yang dihitung.
 */
export function hasProgress(save: CampaignSave): boolean {
  for (const id of CHAPTER_ORDER) {
    if (save.chapters[id].stages.some((s) => s.status === 'done')) return true
  }
  for (const id of TUGAS_ORDER) {
    if (save.tugas[id].stages.some((s) => s.status === 'done')) return true
  }
  if (save.coins > 0) return true
  if (
    save.badges.length > 0 ||
    save.unlockedCards.length > 0 ||
    save.promises.length > 0 ||
    save.species.length > 0
  ) {
    return true
  }
  if (save.streak.count > 0) return true
  if (save.completedAt !== null) return true
  if (save.checkpoint !== null) return true
  if (Object.keys(save.cerita ?? {}).length > 0 || save.pakPlastik !== 'netral') return true
  const dunia = save.dunia
  if (dunia) {
    if (dunia.petak.some((p) => p.tahap > 0 || p.layu)) return true
    if (dunia.maggot.tahap > 0 || dunia.maggot.kaliDiberiMakan > 0 || dunia.maggot.lapar !== 20) return true
    if (dunia.sampahLiar !== 3) return true
  }
  return false
}

/** Cek bentuk save secara longgar; data yang gagal cek dianggap rusak. */
export function isSaveValid(value: unknown): value is CampaignSave {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<CampaignSave>
  if (v.version !== SAVE_VERSION) return false
  if (typeof v.nickname !== 'string') return false
  if (typeof v.coins !== 'number' || Number.isNaN(v.coins)) return false
  if (typeof v.chapters !== 'object' || v.chapters === null) return false
  for (const id of CHAPTER_ORDER) {
    const chapter = (v.chapters as Partial<Record<ChapterId, ChapterProgress>>)[id]
    if (!chapter || !Array.isArray(chapter.stages) || chapter.stages.length !== 3) return false
    for (const stage of chapter.stages) {
      if (!stage || typeof stage.bestScore !== 'number') return false
      if (stage.status !== 'locked' && stage.status !== 'open' && stage.status !== 'done') return false
    }
  }
  if (typeof v.report !== 'object' || v.report === null) return false
  if (typeof v.carryover !== 'object' || v.carryover === null) return false
  if (!Array.isArray(v.unlockedCards) || !Array.isArray(v.badges) || !Array.isArray(v.promises) || !Array.isArray(v.species)) return false
  return true
}

export function loadSave(): CampaignSave {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return freshSave()
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return freshSave()
    const parsed: unknown = JSON.parse(raw)
    if (!isSaveValid(parsed)) return freshSave()
    // Gabung dengan default baru: save lama (tanpa field volume) tetap
    // bisa dimuat; field yang belum ada memakai nilai default.
    const merged = { ...freshSave(), ...parsed }
    // Pengaman sempit untuk field baru: bila `dunia` tersimpan tapi bentuknya
    // rusak (mis. diedit manual), ganti bagian itu saja dengan default baru
    // supaya UI Dunia Hidup tidak crash — sisa progres tetap dipertahankan.
    // isSaveValid sengaja TIDAK diubah: save lama tanpa `dunia` tetap valid
    // dan mendapat default dari gabungan di atas.
    if (!isDuniaValid(merged.dunia)) merged.dunia = freshDunia()
    if (typeof merged.cerita !== 'object' || merged.cerita === null) merged.cerita = {}
    if (
      merged.pakPlastik !== 'netral' &&
      merged.pakPlastik !== 'dibujuk' &&
      merged.pakPlastik !== 'dilawan' &&
      merged.pakPlastik !== 'dijebak'
    ) {
      merged.pakPlastik = 'netral'
    }
    if (
      typeof merged.arkade !== 'object' ||
      merged.arkade === null ||
      typeof merged.arkade.tangkap !== 'number' ||
      typeof merged.arkade.kuis !== 'number'
    ) {
      merged.arkade = { tangkap: 0, kuis: 0 }
    }
    return merged
  } catch {
    // JSON rusak, storage tidak bisa dibaca, atau mode privat yang menolak akses.
    return freshSave()
  }
}

/** Cek bentuk `dunia` secara longgar; dipakai loadSave sebagai pengaman. */
function isDuniaValid(value: unknown): value is DuniaHidup {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Partial<DuniaHidup>
  if (!Array.isArray(d.petak) || d.petak.length !== 3) return false
  for (const p of d.petak) {
    if (!p || typeof p.id !== 'string' || typeof p.jenis !== 'string') return false
    if (typeof p.tahap !== 'number' || typeof p.layu !== 'boolean') return false
    if (typeof p.terakhirDisiram !== 'number' || typeof p.ditanam !== 'number') return false
  }
  if (typeof d.maggot !== 'object' || d.maggot === null) return false
  const m = d.maggot as Partial<DuniaHidup['maggot']>
  if (typeof m.lapar !== 'number' || typeof m.tahap !== 'number' || typeof m.kaliDiberiMakan !== 'number') return false
  if (typeof d.sampahLiar !== 'number' || typeof d.hariTerakhirKunjung !== 'string') return false
  return true
}

export function saveSave(save: CampaignSave): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // Storage penuh atau tidak bisa ditulis: progres tetap jalan di memori
    // selama tab terbuka, tapi tidak tersimpan.
  }
}
