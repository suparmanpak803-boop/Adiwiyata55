'use client'

// State global kampanye "Apa itu Adiwiyata": Context + useReducer.
// Progres dimuat dari localStorage setelah mount (supaya tidak bentrok
// dengan render server), lalu disimpan kembali setiap state berubah,
// tiap 30 detik, dan saat tab ditutup / disembunyikan.

import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { syncSettings } from '@/components/game/apa-itu-adiwiyata/suara'
import { CHAPTER_ORDER } from './chapters'
import {
  beriMakanMaggot,
  bersihkanSampah,
  freshDunia,
  majukanDunia,
  panenKasgot,
  panenTanaman,
  siramTanaman,
  type DuniaHidup,
  type PetakId,
} from './dunia-hidup'
import { freshSave, loadSave, saveSave } from './storage'
import type { CampaignSave, Carryover, ChapterId, Checkpoint, PakPlastikStatus, PromiseItem, Report, StageProgress, TugasKaderId } from './types'

export type CampaignAction =
  | { type: 'LOAD'; save: CampaignSave }
  | { type: 'SET_NICKNAME'; nickname: string }
  | { type: 'START_NEW' }
  | { type: 'COMPLETE_STAGE'; chapterId: ChapterId; stageIndex: number; score: number }
  | { type: 'COMPLETE_CHAPTER'; chapterId: ChapterId }
  | { type: 'COMPLETE_TUGAS_STAGE'; tugasId: TugasKaderId; stageIndex: number; score: number }
  | { type: 'COMPLETE_TUGAS'; tugasId: TugasKaderId }
  | { type: 'EARN_COINS'; amount: number }
  | { type: 'UNLOCK_CARD'; cardId: string }
  | { type: 'EARN_BADGE'; badgeId: string }
  | { type: 'ADD_PROMISE'; text: string; chapterId: ChapterId }
  | { type: 'CHECKIN_PROMISE'; id: string }
  | { type: 'SET_CHECKPOINT'; checkpoint: Checkpoint }
  | { type: 'CLEAR_CHECKPOINT' }
  | { type: 'SET_CARRYOVER'; patch: Partial<Carryover> }
  | { type: 'SET_REPORT'; patch: Partial<Report> }
  | { type: 'ADD_SPECIES'; id: string }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'SET_VOLUME_MUSIK'; value: number }
  | { type: 'SET_VOLUME_EFEK'; value: number }
  | { type: 'SET_MODE_SATU_KETUKAN'; value: boolean }
  | { type: 'SET_HIDE_NAME'; hideName: boolean }
  | { type: 'DAILY_CHECKIN' }
  | { type: 'FINISH_CAMPAIGN' }
  | { type: 'MAJUKAN_DUNIA'; sekarang: number; adaMisiBelumSelesai: boolean }
  | {
      type: 'PERAWATAN_DUNIA'
      aksi: 'siram' | 'beriMakan' | 'bersihkan' | 'panen' | 'panenKasgot'
      petakId?: PetakId
      sekarang: number
    }
  | { type: 'PILIH_CERITA'; kunci: string; opsi: string; pakPlastik?: PakPlastikStatus }

function touch(save: CampaignSave, patch: Partial<CampaignSave> = {}): CampaignSave {
  return { ...save, ...patch, updatedAt: new Date().toISOString() }
}

function clampReport(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

// Tanggal lokal YYYY-MM-DD (dipakai streak harian; jangan pakai UTC karena
// hari berganti tengah malam waktu setempat).
function hariLokal(d: Date): string {
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tanggal = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tanggal}`
}

function newPromiseId(): string {
  return `aia-p-${Date.now().toString(36)}${Math.floor(Math.random() * 1_000_000).toString(36)}`
}

function reducer(save: CampaignSave, action: CampaignAction): CampaignSave {
  switch (action.type) {
    case 'LOAD':
      return action.save
    case 'SET_NICKNAME':
      return touch(save, { nickname: action.nickname.trim().slice(0, 20) })
    case 'START_NEW': {
      // Progres baru, tapi nama panggilan dan pengaturan (suara + mode
      // satu-ketukan) dipertahankan.
      const fresh = freshSave(save.nickname)
      return touch(fresh, { muted: save.muted, modeSatuKetukan: save.modeSatuKetukan })
    }
    case 'COMPLETE_STAGE': {
      const chapter = save.chapters[action.chapterId]
      const stages = chapter.stages.map((stage, i): StageProgress => {
        if (i === action.stageIndex) {
          return { status: 'done', bestScore: Math.max(stage.bestScore, action.score) }
        }
        if (i === action.stageIndex + 1 && stage.status === 'locked') {
          return { ...stage, status: 'open' }
        }
        return stage
      }) as [StageProgress, StageProgress, StageProgress]
      const isLastStage = action.stageIndex >= 2
      const key = `${action.chapterId}:${action.stageIndex}`
      return touch(save, {
        // Pengali streak: hari ke-5 berturut-turut menggandakan Koin Hijau
        // tahap ini (skor terbaik tetap memakai skor mentah).
        coins: save.coins + Math.max(0, action.score) * (save.streak.multiplierActive ? 2 : 1),
        chapters: { ...save.chapters, [action.chapterId]: { ...chapter, stages } },
        bestScores: { ...save.bestScores, [key]: Math.max(save.bestScores[key] ?? 0, action.score) },
        checkpoint: isLastStage
          ? null
          : {
              chapterId: action.chapterId,
              stageId: action.stageIndex + 1,
              state: null,
              savedAt: new Date().toISOString(),
            },
      })
    }
    case 'COMPLETE_CHAPTER': {
      const chapter = save.chapters[action.chapterId]
      return touch(save, {
        chapters: { ...save.chapters, [action.chapterId]: { ...chapter, done: true, badgeEarned: true } },
        checkpoint: null,
      })
    }
    case 'COMPLETE_TUGAS_STAGE': {
      // Cermin COMPLETE_STAGE untuk Misi Kader, tanpa checkpoint:
      // checkpoint Pos Hijau hanya untuk bab utama.
      const tugas = save.tugas[action.tugasId]
      const stages = tugas.stages.map((stage, i): StageProgress => {
        if (i === action.stageIndex) {
          return { status: 'done', bestScore: Math.max(stage.bestScore, action.score) }
        }
        if (i === action.stageIndex + 1 && stage.status === 'locked') {
          return { ...stage, status: 'open' }
        }
        return stage
      }) as [StageProgress, StageProgress, StageProgress]
      const key = `tugas:${action.tugasId}:${action.stageIndex}`
      return touch(save, {
        coins: save.coins + Math.max(0, action.score) * (save.streak.multiplierActive ? 2 : 1),
        tugas: { ...save.tugas, [action.tugasId]: { ...tugas, stages } },
        bestScores: { ...save.bestScores, [key]: Math.max(save.bestScores[key] ?? 0, action.score) },
      })
    }
    case 'COMPLETE_TUGAS': {
      const tugas = save.tugas[action.tugasId]
      return touch(save, {
        tugas: { ...save.tugas, [action.tugasId]: { ...tugas, done: true, badgeEarned: true } },
      })
    }
    case 'EARN_COINS':
      return touch(save, { coins: save.coins + Math.max(0, action.amount) })
    case 'UNLOCK_CARD':
      return save.unlockedCards.includes(action.cardId)
        ? save
        : touch(save, { unlockedCards: [...save.unlockedCards, action.cardId] })
    case 'EARN_BADGE':
      return save.badges.includes(action.badgeId)
        ? save
        : touch(save, { badges: [...save.badges, action.badgeId] })
    case 'ADD_PROMISE': {
      const item: PromiseItem = {
        id: newPromiseId(),
        text: action.text,
        chapterId: action.chapterId,
        done: false,
        createdAt: new Date().toISOString(),
      }
      return touch(save, { promises: [...save.promises, item] })
    }
    case 'CHECKIN_PROMISE':
      return touch(save, {
        promises: save.promises.map((p) => (p.id === action.id ? { ...p, done: true } : p)),
      })
    case 'SET_CHECKPOINT':
      return touch(save, { checkpoint: action.checkpoint })
    case 'CLEAR_CHECKPOINT':
      return touch(save, { checkpoint: null })
    case 'SET_CARRYOVER':
      return touch(save, { carryover: { ...save.carryover, ...action.patch } })
    case 'SET_REPORT': {
      const report: Report = {
        sampah: clampReport(action.patch.sampah ?? save.report.sampah),
        energi: clampReport(action.patch.energi ?? save.report.energi),
        air: clampReport(action.patch.air ?? save.report.air),
        hijau: clampReport(action.patch.hijau ?? save.report.hijau),
        biodiversitas: clampReport(action.patch.biodiversitas ?? save.report.biodiversitas),
      }
      return touch(save, { report })
    }
    case 'ADD_SPECIES':
      return save.species.includes(action.id) ? save : touch(save, { species: [...save.species, action.id] })
    case 'SET_MUTED':
      return touch(save, { muted: action.muted })
    case 'SET_VOLUME_MUSIK':
      return touch(save, { volumeMusik: clamp01(action.value) })
    case 'SET_VOLUME_EFEK':
      return touch(save, { volumeEfek: clamp01(action.value) })
    case 'SET_MODE_SATU_KETUKAN':
      return touch(save, { modeSatuKetukan: action.value })
    case 'SET_HIDE_NAME':
      return touch(save, { hideName: action.hideName })
    case 'DAILY_CHECKIN': {
      // Streak harian: hari ini sudah dihitung -> tidak berubah; kemarin
      // main -> lanjutkan; selain itu mulai dari 1. Pengali x2 aktif saat
      // streak mencapai 5 hari.
      const hariIni = hariLokal(new Date())
      if (save.streak.lastDay === hariIni) return save
      const kemarin = hariLokal(new Date(Date.now() - 86_400_000))
      const hitung = save.streak.lastDay === kemarin ? save.streak.count + 1 : 1
      return touch(save, {
        streak: { count: hitung, lastDay: hariIni, multiplierActive: hitung >= 5 },
      })
    }
    case 'FINISH_CAMPAIGN':
      return touch(save, { completedAt: new Date().toISOString() })
    case 'MAJUKAN_DUNIA': {
      // majukanDunia murni: 0 hari berlalu mengembalikan referensi dunia
      // yang sama, dan reducer tidak menulis save dalam kasus itu.
      // Daftar peristiwa TIDAK disimpan di save — UI yang butuh teks
      // peristiwa memanggil majukanDunia() langsung dari save.dunia
      // sebelum dispatch (hasilnya identik, lihat dunia-hidup.ts).
      const duniaLama = save.dunia ?? freshDunia()
      const hasil = majukanDunia(duniaLama, action.sekarang, action.adaMisiBelumSelesai)
      if (hasil.dunia === duniaLama) return save
      return touch(save, { dunia: hasil.dunia })
    }
    case 'PERAWATAN_DUNIA': {
      // Satu dispatch: fungsi murni + koin hasilnya ditambahkan di sini.
      // Pesan toast TIDAK dikembalikan reducer — UI memanggil fungsi murni
      // yang sama dari save.dunia sebelum dispatch (lihat dunia-hidup.ts).
      const duniaLama = save.dunia ?? freshDunia()
      let hasil: { dunia: DuniaHidup; koin: number; pesan: string }
      switch (action.aksi) {
        case 'siram':
          hasil = action.petakId
            ? siramTanaman(duniaLama, action.petakId, action.sekarang)
            : { dunia: duniaLama, koin: 0, pesan: '' }
          break
        case 'beriMakan':
          hasil = beriMakanMaggot(duniaLama, action.sekarang)
          break
        case 'bersihkan':
          hasil = bersihkanSampah(duniaLama)
          break
        case 'panen':
          hasil = action.petakId
            ? panenTanaman(duniaLama, action.petakId, action.sekarang)
            : { dunia: duniaLama, koin: 0, pesan: '' }
          break
        case 'panenKasgot':
          hasil = action.petakId
            ? panenKasgot(duniaLama, action.petakId, action.sekarang)
            : { dunia: duniaLama, koin: 0, pesan: '' }
          break
      }
      // Aksi yang tidak mengubah apa pun (koin 0 + referensi sama) tidak
      // menulis save — mis. panen tanaman yang belum siap.
      if (hasil.dunia === duniaLama && hasil.koin === 0) return save
      return touch(save, { dunia: hasil.dunia, coins: save.coins + hasil.koin })
    }
    case 'PILIH_CERITA': {
      // Pilihan terakhir menimpa pilihan sebelumnya di kunci yang sama;
      // status Pak Plastik hanya berubah bila opsi membawa fieldnya.
      const cerita = { ...(save.cerita ?? {}), [action.kunci]: action.opsi }
      return touch(save, {
        cerita,
        ...(action.pakPlastik ? { pakPlastik: action.pakPlastik } : {}),
      })
    }
    default:
      return save
  }
}

interface CampaignContextValue {
  save: CampaignSave
  dispatch: React.Dispatch<CampaignAction>
  /** True setelah save dari localStorage selesai dimuat (mount pertama). */
  hydrated: boolean
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [save, dispatch] = useReducer(reducer, undefined, () => freshSave())
  const [hydrated, setHydrated] = useState(false)
  const saveRef = useRef(save)
  saveRef.current = save

  // Muat save tersimpan setelah mount (hindari selisih render server/klien).
  useEffect(() => {
    dispatch({ type: 'LOAD', save: loadSave() })
    setHydrated(true)
  }, [])

  // Check-in harian sekali per buka: hitung streak berurutan (berjalan
  // setelah save dimuat, karena butuh nilai lastDay yang tersimpan).
  const checkinRef = useRef(false)
  useEffect(() => {
    if (!hydrated || checkinRef.current) return
    checkinRef.current = true
    dispatch({ type: 'DAILY_CHECKIN' })
  }, [hydrated])

  // Lencana streak: dibuka saat streak mencapai 5 hari berturut-turut.
  useEffect(() => {
    if (hydrated && save.streak.count >= 5 && !save.badges.includes('streak-5-hari')) {
      dispatch({ type: 'EARN_BADGE', badgeId: 'streak-5-hari' })
    }
  }, [hydrated, save.streak.count, save.badges])

  // Simpan setiap state berubah.
  useEffect(() => {
    if (hydrated) saveSave(save)
  }, [save, hydrated])

  // Sinkronkan pengaturan suara ke AudioManager setiap kali berubah
  // (termasuk saat pertama dimuat dari localStorage).
  useEffect(() => {
    syncSettings({ musik: save.volumeMusik, efek: save.volumeEfek, muted: save.muted })
  }, [save.volumeMusik, save.volumeEfek, save.muted])

  // Autosave tiap 30 detik + saat tab ditutup/disembunyikan.
  useEffect(() => {
    const persist = () => saveSave(saveRef.current)
    const interval = setInterval(persist, 30_000)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    window.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', persist)
    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', persist)
    }
  }, [])

  return <CampaignContext.Provider value={{ save, dispatch, hydrated }}>{children}</CampaignContext.Provider>
}

export function useCampaign(): CampaignContextValue {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign harus dipakai di dalam CampaignProvider')
  return ctx
}

/** Bab terbuka bila bab sebelumnya sudah selesai; Gerbang selalu terbuka. */
export function selectChapterUnlocked(save: CampaignSave, chapterId: ChapterId): boolean {
  const index = CHAPTER_ORDER.indexOf(chapterId)
  if (index <= 0) return true
  return save.chapters[CHAPTER_ORDER[index - 1]].done
}

/** Kedelapan Misi Kader tersedia sejak awal; tidak berantai seperti bab utama. */
export function selectTugasUnlocked(save: CampaignSave, tugasId: TugasKaderId): boolean {
  void save
  void tugasId
  return true
}
