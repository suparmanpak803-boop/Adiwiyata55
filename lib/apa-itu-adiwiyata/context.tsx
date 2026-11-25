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
import {
  BEKAL_JATAH,
  BEKAL_JATAH_LUNCH_BOX,
  BEKAL_LAPAR,
  BEKAL_LAPAR_LUNCH_BOX,
  ECO_SHOP,
  GEAR,
  HARGA_POHON_KOIN_DAUN,
  hargaDiskonDuta,
  KOSTUM,
  MAKANAN,
  MINUMAN,
  POHON_HIJAU,
  SKOR_MISI_PERTAMA,
  SKOR_PANEL_SURYA,
  SKOR_POHON,
} from './content/toko'
import { HADIAH_HARIAN, hadiahBerikutnya } from './content/hadiah-harian'
import { hitungSetoran } from './content/bank-sampah'
import { HADIAH_PILAH_KOIN, HADIAH_PILAH_UANG } from './content/bak'
import type { CampaignSave, Carryover, ChapterId, Checkpoint, JenisKelamin, PakPlastikStatus, PromiseItem, Report, StageProgress, TongSampah, TugasKaderId } from './types'

export type CampaignAction =
  | { type: 'LOAD'; save: CampaignSave }
  | { type: 'SET_NICKNAME'; nickname: string }
  /** Pilih karakter pemain (siswa/siswi). Bisa diganti kapan saja. */
  | { type: 'PILIH_KARAKTER'; jenisKelamin: 'siswa' | 'siswi' }
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
  /** Skor terbaik game arkade: hanya naik, tidak pernah turun. */
  | { type: 'ARKADE_TERBAIK'; game: 'tangkap' | 'kuis'; skor: number }
  /** Kantin: uang (Rp) dan Koin Daun. */
  | { type: 'EARN_UANG'; amount: number }
  | { type: 'EARN_KOIN_DAUN'; amount: number }
  /** Pulihkan bar lapar/haus (dijepit 0-100). Dipakai air keran dan bekal darurat. */
  | { type: 'PULIHKAN'; lapar?: number; haus?: number }
  /** Beli barang toko (validasi dana + kepemilikan ganda di dalam reducer). */
  | { type: 'BELI'; jenis: 'makanan' | 'minuman' | 'gear' | 'kostum'; id: string }
  /** Beli item Eco-Shop (bayar Koin Hijau, sekali beli, validasi dana +
   * kepemilikan ganda di dalam reducer). Pin Duta dan Panel Surya
   * dicatat di flag save, bukan inventaris Koin Daun. */
  | { type: 'BELI_ECO'; id: string }
  /** Tanam 1 pohon (100 Koin Daun): pohon +1, rapor hijau +5. */
  | { type: 'TANAM_POHON' }
  /** Pakai kostum yang dimiliki (null = lepas, kembali ke seragam biasa). */
  | { type: 'PAKAI_KOSTUM'; id: string | null }
  /** Makan bekal gratis harian (jatah 1x/hari, 2x/hari bila punya Lunch Box). */
  | { type: 'PAKAI_BEKAL' }
  /** Klaim Hadiah Harian (atomik, 1x sehari — lihat content/hadiah-harian.ts).
   * Bila sudah klaim di hari yang sama, tidak mengubah apa pun. */
  | { type: 'KLAIM_HADIAH_HARIAN'; hariIni: string }
  /** Pindah peta: 'rumah' (titik awal) atau 'sekolah' (dunia Jelajah).
   * Disimpan di save (provider autosave) supaya peta terakhir terbuka lagi. */
  | { type: 'SET_PETA_AKTIF'; peta: 'rumah' | 'sekolah' }
  /** Uang saku Ibu (atomik, 1x per hari kalender lokal): Rp5.000 + sarapan
   * (lapar +40). Bila sudah diberi di hari yang sama, tidak mengubah apa pun. */
  | { type: 'TERIMA_UANG_SAKU'; hariIni: string }
  /** Pungut 1 sampah liar: sampahLiar -1 (dihitung seperti sebelumnya)
   * dan sampah masuk inventaris `sampahDibawa` — TANPA koin langsung.
   * Hadiah baru didapat saat dipilah di Tempat Sampah Terpilah. */
  | { type: 'PUNGUT_SAMPAH'; jenis: TongSampah }
  /** Pilah 1 jenis sampah yang dibawa ke bak (atomik): bak benar dan jumlah
   * > 0 -> jenis itu hilang dari inventaris, +5 Koin Hijau + Rp200 per
   * sampah; bak salah atau jumlah 0 -> tidak mengubah apa pun (tanpa
   * hukuman, pemain bisa coba lagi). */
  | { type: 'PILAH_SAMPAH'; jenis: TongSampah; bak: TongSampah }
  /** Setor semua sampah yang dibawa ke Bank Sampah (atomik): hitung total
   * dari inventaris -> +Rp500 + 5 Koin Hijau per sampah -> kosongkan
   * inventaris seluruhnya; inventaris kosong -> tidak mengubah apa pun. */
  | { type: 'SETOR_BANK_SAMPAH' }

function touch(save: CampaignSave, patch: Partial<CampaignSave> = {}): CampaignSave {
  return { ...save, ...patch, updatedAt: new Date().toISOString() }
}

function clampReport(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/** Jepit bar lapar/haus ke 0-100. */
function clampBar(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

/** Selisih hari kalender (tanggal lokal YYYY-MM-DD), 0 bila tanggal rusak. */
function selisihHariKalender(dari: string, sampai: string): number {
  const a = new Date(`${dari}T00:00:00`).getTime()
  const b = new Date(`${sampai}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/**
 * Drain lapar/haus tiap tahap selesai: lapar -10, haus -8 — atau -4 bila
 * punya Tumbler (drain haus dibagi 2, dibulatkan ke bawah: floor(8/2) = 4).
 */
function drainTahap(save: CampaignSave): { lapar: number; haus: number } {
  const punyaTumbler = (save.inventaris ?? []).includes('tumbler')
  return {
    lapar: clampBar((save.lapar ?? 100) - 10),
    haus: clampBar((save.haus ?? 100) - (punyaTumbler ? 4 : 8)),
  }
}

/** Bonus Tas Kain: +5 Koin Hijau tiap tahap selesai (di luar pengali streak). */
function bonusTasKain(save: CampaignSave): number {
  return (save.inventaris ?? []).includes('tas-kain') ? 5 : 0
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
    case 'PILIH_KARAKTER':
      return touch(save, { jenisKelamin: action.jenisKelamin })
    case 'START_NEW': {
      // Progres baru, tapi nama panggilan, karakter, dan pengaturan (suara
      // + mode satu-ketukan) dipertahankan.
      const fresh = freshSave(save.nickname)
      return touch(fresh, {
        muted: save.muted,
        modeSatuKetukan: save.modeSatuKetukan,
        jenisKelamin: save.jenisKelamin ?? null,
      })
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
      const drain = drainTahap(save)
      return touch(save, {
        // Pengali streak: hari ke-5 berturut-turut menggandakan Koin Hijau
        // tahap ini (skor terbaik tetap memakai skor mentah).
        coins:
          save.coins + Math.max(0, action.score) * (save.streak.multiplierActive ? 2 : 1) + bonusTasKain(save),
        lapar: drain.lapar,
        haus: drain.haus,
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
      // Skor Adiwiyata +5 HANYA saat pertama kali selesai: chapter.done
      // masih false di sini; ulangan (done sudah true) tidak menambah skor.
      const skorBaru = chapter.done ? 0 : SKOR_MISI_PERTAMA
      return touch(save, {
        chapters: { ...save.chapters, [action.chapterId]: { ...chapter, done: true, badgeEarned: true } },
        checkpoint: null,
        skorAdiwiyata: (save.skorAdiwiyata ?? 0) + skorBaru,
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
      const drain = drainTahap(save)
      return touch(save, {
        coins:
          save.coins + Math.max(0, action.score) * (save.streak.multiplierActive ? 2 : 1) + bonusTasKain(save),
        lapar: drain.lapar,
        haus: drain.haus,
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
      // Drain harian: tiap hari berlalu lapar -5 dan haus -5 (maks 30 hari,
      // sama seperti majukanDunia). Hanya bar yang berkurang — tidak ada
      // progres atau koin yang hilang.
      const hariBerlalu = Math.min(
        30,
        selisihHariKalender(duniaLama.hariTerakhirKunjung, hariLokal(new Date(action.sekarang))),
      )
      return touch(save, {
        dunia: hasil.dunia,
        lapar: clampBar((save.lapar ?? 100) - 5 * hariBerlalu),
        haus: clampBar((save.haus ?? 100) - 5 * hariBerlalu),
      })
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
    case 'ARKADE_TERBAIK': {
      const arkade = save.arkade ?? { tangkap: 0, kuis: 0 }
      return touch(save, {
        arkade: { ...arkade, [action.game]: Math.max(arkade[action.game], Math.max(0, action.skor)) },
      })
    }
    case 'EARN_UANG':
      return touch(save, { uang: (save.uang ?? 0) + Math.max(0, action.amount) })
    case 'EARN_KOIN_DAUN':
      return touch(save, { koinDaun: (save.koinDaun ?? 0) + Math.max(0, action.amount) })
    case 'PULIHKAN':
      return touch(save, {
        lapar: clampBar((save.lapar ?? 100) + (action.lapar ?? 0)),
        haus: clampBar((save.haus ?? 100) + (action.haus ?? 0)),
      })
    case 'BELI': {
      // Validasi di dalam reducer: dana kurang atau sudah dimiliki -> no-op.
      // Harga makanan/minuman memakai diskon Duta 25% bila punya Pin Duta
      // (sama seperti yang ditampilkan Toko Kantin).
      const inventaris = save.inventaris ?? []
      const hargaKantin = (harga: number) => (save.pinDuta ? hargaDiskonDuta(harga) : harga)
      if (action.jenis === 'makanan') {
        const item = MAKANAN.find((m) => m.id === action.id)
        if (!item || (save.uang ?? 0) < hargaKantin(item.harga)) return save
        return touch(save, {
          uang: (save.uang ?? 0) - hargaKantin(item.harga),
          lapar: clampBar((save.lapar ?? 100) + item.lapar),
        })
      }
      if (action.jenis === 'minuman') {
        const item = MINUMAN.find((m) => m.id === action.id)
        if (!item || (save.uang ?? 0) < hargaKantin(item.harga)) return save
        return touch(save, {
          uang: (save.uang ?? 0) - hargaKantin(item.harga),
          haus: clampBar((save.haus ?? 100) + item.haus),
        })
      }
      if (action.jenis === 'gear') {
        const item = GEAR.find((g) => g.id === action.id)
        if (!item || inventaris.includes(item.id) || (save.koinDaun ?? 0) < item.hargaKoinDaun) return save
        return touch(save, {
          koinDaun: (save.koinDaun ?? 0) - item.hargaKoinDaun,
          inventaris: [...inventaris, item.id],
        })
      }
      const item = KOSTUM.find((k) => k.id === action.id)
      if (!item || inventaris.includes(item.id) || (save.koinDaun ?? 0) < item.hargaKoinDaun) return save
      return touch(save, {
        koinDaun: (save.koinDaun ?? 0) - item.hargaKoinDaun,
        inventaris: [...inventaris, item.id],
      })
    }
    case 'BELI_ECO': {
      // Validasi di dalam reducer: item tidak dikenal, sudah dimiliki, atau
      // Koin Hijau kurang -> no-op. Panel Surya menambah Skor Adiwiyata +20
      // saat pembelian berhasil (bukan saat dipakai, karena efeknya langsung).
      const item = ECO_SHOP.find((e) => e.id === action.id)
      if (!item || (save.coins ?? 0) < item.hargaKoinHijau) return save
      const koinSisa = save.coins - item.hargaKoinHijau
      if (item.id === 'sepatu-eco') {
        if (save.sepatuEco) return save
        return touch(save, { coins: koinSisa, sepatuEco: true })
      }
      if (item.id === 'pin-duta') {
        if (save.pinDuta) return save
        return touch(save, { coins: koinSisa, pinDuta: true })
      }
      if (item.id === 'panel-surya') {
        if (save.panelSurya) return save
        return touch(save, {
          coins: koinSisa,
          panelSurya: true,
          skorAdiwiyata: (save.skorAdiwiyata ?? 0) + SKOR_PANEL_SURYA,
        })
      }
      return save
    }
    case 'TANAM_POHON': {
      if ((save.koinDaun ?? 0) < HARGA_POHON_KOIN_DAUN) return save
      return touch(save, {
        koinDaun: (save.koinDaun ?? 0) - HARGA_POHON_KOIN_DAUN,
        pohonDitanam: (save.pohonDitanam ?? 0) + 1,
        report: { ...save.report, hijau: clampReport(save.report.hijau + POHON_HIJAU) },
        skorAdiwiyata: (save.skorAdiwiyata ?? 0) + SKOR_POHON,
      })
    }
    case 'PAKAI_KOSTUM': {
      if (action.id !== null && !(save.inventaris ?? []).includes(action.id)) return save
      return touch(save, { kostumDipakai: action.id })
    }
    case 'KLAIM_HADIAH_HARIAN': {
      // Satu aksi atomik: cek klaim ganda + terapkan hadiah + catat tanggal
      // dalam satu langkah, supaya hadiah tidak bisa diklaim dua kali.
      // DAILY_CHECKIN (streak) tidak diutak-atik — sistem ini berdiri sendiri.
      const { siklus, bisaKlaim } = hadiahBerikutnya(
        save.hadiahTerakhir ?? null,
        save.hadiahSiklus ?? 1,
        action.hariIni,
      )
      if (!bisaKlaim) return save
      const hadiah = HADIAH_HARIAN[siklus - 1]
      if (!hadiah) return save
      return touch(save, {
        coins: save.coins + (hadiah.koinHijau ?? 0),
        uang: (save.uang ?? 0) + (hadiah.uang ?? 0),
        koinDaun: (save.koinDaun ?? 0) + (hadiah.koinDaun ?? 0),
        lapar: hadiah.pulihkan ? 100 : save.lapar,
        haus: hadiah.pulihkan ? 100 : save.haus,
        hadiahTerakhir: action.hariIni,
        hadiahSiklus: siklus,
      })
    }
    case 'SET_PETA_AKTIF':
      return touch(save, { petaAktif: action.peta })
    case 'TERIMA_UANG_SAKU': {
      // Satu aksi atomik: cek tanggal + beri uang dan sarapan + catat tanggal
      // dalam satu langkah, supaya tidak bisa diklaim dua kali di hari sama.
      if ((save.ibuTanggal ?? null) === action.hariIni) return save
      return touch(save, {
        uang: (save.uang ?? 0) + 5000,
        lapar: clampBar((save.lapar ?? 100) + 40),
        ibuTanggal: action.hariIni,
      })
    }
    case 'PUNGUT_SAMPAH': {
      const duniaLama = save.dunia ?? freshDunia()
      if (duniaLama.sampahLiar <= 0) return save
      const dibawa = { ...(save.sampahDibawa ?? {}) }
      dibawa[action.jenis] = (dibawa[action.jenis] ?? 0) + 1
      return touch(save, {
        dunia: { ...duniaLama, sampahLiar: duniaLama.sampahLiar - 1 },
        sampahDibawa: dibawa,
      })
    }
    case 'PILAH_SAMPAH': {
      const dibawa = { ...(save.sampahDibawa ?? {}) }
      const jumlah = dibawa[action.jenis] ?? 0
      if (jumlah <= 0 || action.bak !== action.jenis) return save
      delete dibawa[action.jenis]
      return touch(save, {
        sampahDibawa: dibawa,
        coins: save.coins + HADIAH_PILAH_KOIN * jumlah,
        uang: (save.uang ?? 0) + HADIAH_PILAH_UANG * jumlah,
      })
    }
    case 'SETOR_BANK_SAMPAH': {
      const { jumlah, uang, koin } = hitungSetoran(save.sampahDibawa ?? {})
      if (jumlah <= 0) return save
      return touch(save, {
        sampahDibawa: {},
        coins: save.coins + koin,
        uang: (save.uang ?? 0) + uang,
      })
    }
    case 'PAKAI_BEKAL': {
      // Jatah bekal harian: 1x/hari, 2x/hari bila punya Lunch Box.
      // Tanggal berganti -> hitungan hari itu mulai dari 0 lagi.
      const hariIni = hariLokal(new Date())
      const punyaLunchBox = (save.inventaris ?? []).includes('lunch-box')
      const jatah = punyaLunchBox ? BEKAL_JATAH_LUNCH_BOX : BEKAL_JATAH
      const dipakaiHariIni = save.bekalTanggal === hariIni ? (save.bekalDipakai ?? 0) : 0
      if (dipakaiHariIni >= jatah) return save
      const pulih = punyaLunchBox ? BEKAL_LAPAR_LUNCH_BOX : BEKAL_LAPAR
      return touch(save, {
        lapar: clampBar((save.lapar ?? 100) + pulih),
        bekalTanggal: hariIni,
        bekalDipakai: dipakaiHariIni + 1,
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
