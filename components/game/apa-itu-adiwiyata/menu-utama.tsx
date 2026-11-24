'use client'

import { useState } from 'react'
import { Check, Clock, Coins, Flame, Lock, Play } from 'lucide-react'
import { CHAPTERS, CHAPTER_ICONS, CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { selectChapterUnlocked, useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import type { ChapterId } from '@/lib/apa-itu-adiwiyata/types'
import { playPop } from './suara'

const TOTAL_TAHAP = 18

export function MenuUtama({ onPlayChapter }: { onPlayChapter: (chapterId: ChapterId) => void }) {
  const { save, dispatch, hydrated } = useCampaign()
  const [nickname, setNickname] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  if (!hydrated) {
    return (
      <section className="aia-card" aria-label="Memuat kampanye">
        <p className="aia-muted">Memuat progres kampanyemu...</p>
      </section>
    )
  }

  // Belum ada nama panggilan: minta dulu sebelum mulai.
  if (!save.nickname) {
    const mulai = () => {
      const nama = nickname.trim()
      if (!nama) return
      playPop()
      dispatch({ type: 'SET_NICKNAME', nickname: nama })
    }
    return (
      <section className="aia-card" aria-labelledby="aia-nama-title">
        <span className="aia-kicker">Kampanye · Adiwiyata 55</span>
        <h2 id="aia-nama-title" className="aia-section-title">
          Apa itu Adiwiyata?
        </h2>
        <p className="aia-muted">
          Kamu siswa baru yang ditugaskan menjadikan sekolahmu Adiwiyata. Jelajahi 6 bab, lawan ulah Pak Plastik,
          dan dibantu Magi si larva maggot. Tidak ada yang benar-benar sampah.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            mulai()
          }}
        >
          <label className="aia-label" htmlFor="aia-nickname">
            Nama panggilanmu
          </label>
          <input
            id="aia-nickname"
            className="aia-input"
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Contoh: Dimas"
            maxLength={20}
            autoComplete="nickname"
          />
          <div className="aia-actions">
            <button type="submit" className="aia-btn aia-btn-primary aia-btn-block" disabled={!nickname.trim()}>
              <Play aria-hidden="true" /> Mulai Petualangan
            </button>
          </div>
        </form>
      </section>
    )
  }

  const babSelesai = CHAPTER_ORDER.filter((id) => save.chapters[id].done).length
  const tahapSelesai = CHAPTER_ORDER.reduce(
    (total, id) => total + save.chapters[id].stages.filter((s) => s.status === 'done').length,
    0,
  )
  const menitTersisa = CHAPTER_ORDER.filter((id) => !save.chapters[id].done).reduce(
    (total, id) => total + CHAPTERS[id].menit,
    0,
  )
  const adaProgres =
    save.checkpoint !== null || tahapSelesai > 0 || save.coins > 0 || save.completedAt !== null

  const lanjutkan = () => {
    playPop()
    if (save.checkpoint) {
      onPlayChapter(save.checkpoint.chapterId)
      return
    }
    const pertama = CHAPTER_ORDER.find((id) => !save.chapters[id].done)
    if (pertama) onPlayChapter(pertama)
  }

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    playPop()
    dispatch({ type: 'START_NEW' })
    setConfirmReset(false)
  }

  return (
    <div className="aia-stack">
      <section className="aia-card" aria-labelledby="aia-salam-title">
        <span className="aia-kicker">Kampanye · Adiwiyata 55</span>
        <h2 id="aia-salam-title" className="aia-section-title">
          Halo, {save.nickname}!
        </h2>
        <div className="aia-stats">
          <span className="aia-stat">
            <Coins aria-hidden="true" /> {save.coins} Koin Hijau
          </span>
          <span className="aia-stat">
            <Flame aria-hidden="true" /> Streak {save.streak.count} hari
            {save.streak.multiplierActive ? ' · Pengali x2 aktif' : ''}
          </span>
        </div>
        <div className="aia-progress-row">
          <div className="aia-progress" role="progressbar" aria-valuenow={babSelesai} aria-valuemin={0} aria-valuemax={6} aria-label="Progres kampanye">
            <span style={{ width: `${(babSelesai / 6) * 100}%` }} />
          </div>
          <span>
            {babSelesai}/6 bab · {tahapSelesai}/{TOTAL_TAHAP} tahap
          </span>
        </div>
        <p className="aia-muted" style={{ marginBottom: 0 }}>
          <Clock aria-hidden="true" />{' '}
          {menitTersisa > 0 ? `Sisa ±${menitTersisa} menit lagi menuju Sekolah Adiwiyata Mandiri.` : 'Kampanye selesai. Kamu Pahlawan Adiwiyata!'}
        </p>
        <div className="aia-actions">
          {adaProgres && babSelesai < 6 && (
            <button type="button" className="aia-btn aia-btn-primary" onClick={lanjutkan}>
              <Play aria-hidden="true" /> Lanjutkan
            </button>
          )}
          <button type="button" className={`aia-btn ${confirmReset ? 'aia-btn-danger' : 'aia-btn-ghost'}`} onClick={reset}>
            {confirmReset ? 'Yakin hapus progres?' : 'Mulai Baru'}
          </button>
        </div>
        {confirmReset && (
          <p className="aia-muted">Ketuk sekali lagi untuk menghapus semua progres, koin, dan lencana.</p>
        )}
      </section>

      <section aria-labelledby="aia-pilih-bab-title">
        <h2 id="aia-pilih-bab-title" className="aia-section-title">
          Pilih Bab
        </h2>
        <div className="aia-bab-grid">
          {CHAPTER_ORDER.map((id, index) => {
            const meta = CHAPTERS[id]
            const Icon = CHAPTER_ICONS[meta.icon]
            const unlocked = selectChapterUnlocked(save, id)
            const done = save.chapters[id].done
            const skorBab = [0, 1, 2].reduce(
              (total, stage) => total + (save.bestScores[`${id}:${stage}`] ?? 0),
              0,
            )
            return (
              <button
                key={id}
                type="button"
                className={`aia-bab-card${done ? ' done' : ''}${!unlocked ? ' locked' : ''}`}
                disabled={!unlocked}
                onClick={() => {
                  playPop()
                  onPlayChapter(id)
                }}
                aria-label={`Bab ${index + 1}: ${meta.judul}${done ? ', selesai' : ''}${!unlocked ? ', terkunci' : ''}`}
              >
                <span className="aia-bab-icon">
                  {unlocked ? <Icon aria-hidden="true" /> : <Lock aria-hidden="true" />}
                </span>
                <span className="aia-bab-body">
                  <strong>
                    Bab {index + 1} · {meta.judul}
                  </strong>
                  <p>{meta.deskripsi}</p>
                  <span className="aia-bab-meta">
                    <Clock aria-hidden="true" /> ±{meta.menit} menit
                    {done ? (
                      <span className="aia-chip done">
                        <Check aria-hidden="true" /> Selesai
                      </span>
                    ) : unlocked ? (
                      <span className="aia-chip open">Terbuka</span>
                    ) : (
                      <span className="aia-chip">Terkunci</span>
                    )}
                    {skorBab > 0 && <span>Skor terbaik: {skorBab}</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
