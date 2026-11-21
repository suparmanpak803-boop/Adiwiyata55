// Penilaian game di server (anti-cheat).
// Log aksi dikirim client (t = ms sejak sesi mulai, monoton naik,
// maks 500 entri — divalidasi di app/api/game/score/route.ts) atau,
// untuk kuis, diambil dari log server-side yang ditulis
// /api/game/quiz-answer (satu jawaban per soal, dengan sisa waktu).
//
// PERINGATAN: rumus skor asli TIDAK tersisa di repo (lihat
// PERBAIKAN.md). Rumus di bawah ini direkonstruksi agar konsisten
// dengan rumus client yang masih ada:
// - Tangkap Sampah (components/game/tangkap-sampah.tsx): tangkapan
//   benar +10 + min(streak-1, 5) * 2 (maks 20), gagal -> streak 0.
// - Kuis: jawaban benar +10 + sisa detik (maks 30/soal).
// maxScore adalah batas atas yang wajar untuk menolak skor curang;
// maxPoints adalah batas poin yang masuk ke total_poin pengguna.
// pointsFromScore: 1 poin per 10 skor, dibatasi maxPoints.
import type { GameKey } from '@/lib/leaderboard-data'

export type GameAction = {
  t: number
  ok: boolean
  sisa?: number
  v?: number
}

export type GameRule = {
  minDuration: number
  maxScore: (durasi: number) => number
  maxPoints: number
  score: (log: GameAction[], durasiDetik: number) => { skor: number; level: number; mencurigakan: boolean }
}

function levelFromScore(skor: number): number {
  return Math.min(10, 1 + Math.floor(Math.max(0, skor) / 100))
}

function tangkapScore(log: GameAction[]): { skor: number; level: number; mencurigakan: boolean } {
  let skor = 0
  let streak = 0
  let correct = 0
  let previousT = -1
  let suspicious = false
  for (const action of log) {
    // Tangkapan tidak mungkin lebih cepat dari spawn (~0,9 detik).
    if (action.ok && previousT >= 0 && action.t - previousT < 300) suspicious = true
    if (action.ok) {
      streak += 1
      correct += 1
      skor += 10 + Math.min(streak - 1, 5) * 2
    } else {
      streak = 0
    }
    previousT = action.t
  }
  // Spawn tercepat ~1 per 0,9 dtk -> tangkapan benar tidak mungkin
  // melebihi ~1,1 per detik permainan.
  const durasiDetik = log.length ? log[log.length - 1].t / 1000 : 0
  if (durasiDetik > 5 && correct > durasiDetik * 1.4) suspicious = true
  return { skor, level: levelFromScore(skor), mencurigakan: suspicious }
}

function kuisScore(log: GameAction[]): { skor: number; level: number; mencurigakan: boolean } {
  let skor = 0
  let suspicious = false
  let previousT = -1
  for (const action of log) {
    const sisa = typeof action.sisa === 'number' ? action.sisa : 0
    if (sisa < 0 || sisa > 20) suspicious = true
    // Dua jawaban dalam < 0,5 detik tidak wajar (soal butuh dibaca).
    if (previousT >= 0 && action.t - previousT < 500) suspicious = true
    if (action.ok) skor += 10 + Math.max(0, Math.min(20, Math.floor(sisa)))
    previousT = action.t
  }
  return { skor, level: levelFromScore(skor), mencurigakan: suspicious }
}

// Game lain (pilah_sampah, memory_daur_ulang, kebun_virtual,
// lama_terurai) tidak punya UI/log di repo: skor generik dihitung
// dari entri ok (10 poin per aksi benar) agar route tidak 501 bila
// game itu diaktifkan admin. Bila UI-nya dibuat, sesuaikan di sini.
function genericScore(log: GameAction[]): { skor: number; level: number; mencurigakan: boolean } {
  const skor = log.filter((action) => action.ok).length * 10
  return { skor, level: levelFromScore(skor), mencurigakan: false }
}

export const GAME_RULES: Record<GameKey, GameRule> = {
  tangkap_sampah: {
    minDuration: 5,
    maxScore: (durasi) => Math.ceil(durasi) * 25,
    maxPoints: 100,
    score: (log) => tangkapScore(log),
  },
  kuis_adiwiyata: {
    minDuration: 10,
    maxScore: (durasi) => Math.ceil(durasi / 5) * 30,
    maxPoints: 100,
    score: (log) => kuisScore(log),
  },
  pilah_sampah: {
    minDuration: 5,
    maxScore: (durasi) => Math.ceil(durasi) * 15,
    maxPoints: 100,
    score: (log) => genericScore(log),
  },
  memory_daur_ulang: {
    minDuration: 5,
    maxScore: (durasi) => Math.ceil(durasi) * 15,
    maxPoints: 100,
    score: (log) => genericScore(log),
  },
  kebun_virtual: {
    minDuration: 5,
    maxScore: (durasi) => Math.ceil(durasi) * 15,
    maxPoints: 50,
    score: (log) => genericScore(log),
  },
  lama_terurai: {
    minDuration: 5,
    maxScore: (durasi) => Math.ceil(durasi) * 15,
    maxPoints: 50,
    score: (log) => genericScore(log),
  },
}

export function pointsFromScore(skor: number, maxPoints: number): number {
  if (!Number.isFinite(skor) || skor <= 0) return 0
  return Math.max(0, Math.min(maxPoints, Math.round(skor / 10)))
}
