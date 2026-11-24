// Penyimpanan progres kampanye "Apa itu Adiwiyata" di localStorage.
// Skema berversi: kunci 'aia-save-v1' + field version di dalam save.
// Semua akses localStorage dibungkus try/catch: aman bila window tidak ada
// (render server), storage penuh, atau data rusak.

import { CHAPTER_ORDER } from './chapters'
import type { CampaignSave, ChapterId, ChapterProgress, StageProgress } from './types'

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

export function freshSave(nickname = ''): CampaignSave {
  const chapters = {} as Record<ChapterId, ChapterProgress>
  for (const id of CHAPTER_ORDER) {
    chapters[id] = freshChapter(id === 'gerbang')
  }
  return {
    version: SAVE_VERSION,
    nickname,
    hideName: false,
    coins: 0,
    streak: { count: 0, lastDay: null, multiplierActive: false },
    chapters,
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
    completedAt: null,
    updatedAt: new Date().toISOString(),
  }
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
    return { ...freshSave(), ...parsed }
  } catch {
    // JSON rusak, storage tidak bisa dibaca, atau mode privat yang menolak akses.
    return freshSave()
  }
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
