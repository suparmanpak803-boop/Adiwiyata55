'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { ArrowLeft, Check, Flag, Play, Volume2 } from 'lucide-react'
import { CHAPTERS, CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { DIALOG_AWAL } from '@/lib/apa-itu-adiwiyata/content/dialog'
import { KARTU_ENSIKLOPEDIA } from '@/lib/apa-itu-adiwiyata/content/ensiklopedia'
import { REFLEKSI } from '@/lib/apa-itu-adiwiyata/content/pertanyaan'
import { SPESIES } from '@/lib/apa-itu-adiwiyata/content/spesies'
import { BAB_BADGE } from '@/lib/apa-itu-adiwiyata/lencana'
import type { ChapterId, Report } from '@/lib/apa-itu-adiwiyata/types'
import { JanjiHarian } from './janji-harian'
import { RaporSekolah } from './rapor-sekolah'
import { KejadianAcak } from './minigames/kejadian-acak'
import { AirEnergi } from './minigames/air-energi'
import { Inspeksi } from './minigames/inspeksi'
import { KomposKebun } from './minigames/kompos-kebun'
import { PilahSampah } from './minigames/pilah-sampah'
import { TasPagi } from './minigames/tas-pagi'
import { ZonaMaggot } from './minigames/zona-maggot'
import { bendera, lencana, playMumble, playMenang, playPop } from './suara'

/**
 * Props yang dipakai mini-game: tiap mini-game menerima chapterId,
 * stageIndex, dan onStageComplete(score). Mini-game memanggil onStageComplete
 * saat tahap selesai; kerangka bab meneruskannya ke COMPLETE_STAGE.
 */
export interface MiniGameSlotProps {
  chapterId: ChapterId
  stageIndex: number
  onStageComplete: (score: number) => void
}

const NAMA_TAHAP = ['Tahap 1', 'Tahap 2', 'Tahap 3']

const MINI_GAME: Record<ChapterId, ComponentType<MiniGameSlotProps>> = {
  gerbang: TasPagi,
  kantin: PilahSampah,
  maggot: ZonaMaggot,
  kompos: KomposKebun,
  'air-energi': AirEnergi,
  biodiversitas: Inspeksi,
}

// Bonus rapor sekolah saat bab pertama kali diselesaikan.
const BONUS_RAPOR: Record<ChapterId, Partial<Report>> = {
  gerbang: { sampah: 20, hijau: 10 },
  kantin: { sampah: 20 },
  maggot: { hijau: 20 },
  kompos: { hijau: 20 },
  'air-energi': { air: 20, energi: 20 },
  biodiversitas: { biodiversitas: 20, hijau: 10 },
}

// SET_REPORT mengganti nilai (bukan menambah), jadi hitung nilai baru di sini.
function tambahRapor(laporan: Report, bonus: Partial<Report>): Partial<Report> {
  const patch: Partial<Report> = {}
  if (bonus.sampah !== undefined) patch.sampah = laporan.sampah + bonus.sampah
  if (bonus.energi !== undefined) patch.energi = laporan.energi + bonus.energi
  if (bonus.air !== undefined) patch.air = laporan.air + bonus.air
  if (bonus.hijau !== undefined) patch.hijau = laporan.hijau + bonus.hijau
  if (bonus.biodiversitas !== undefined) patch.biodiversitas = laporan.biodiversitas + bonus.biodiversitas
  return patch
}

export function BabShell({
  chapterId,
  onExit,
  onChapterComplete,
}: {
  chapterId: ChapterId
  onExit: () => void
  onChapterComplete: (tamat: boolean) => void
}) {
  const { save, dispatch } = useCampaign()
  const [activeStage, setActiveStage] = useState<number | null>(null)
  const [showEvent, setShowEvent] = useState(false)
  const [eventDone, setEventDone] = useState(false)
  const meta = CHAPTERS[chapterId]
  const progress = save.chapters[chapterId]
  const tahapSelesai = progress.stages.filter((s) => s.status === 'done').length
  const semuaSelesai = tahapSelesai === 3
  const MiniGame = MINI_GAME[chapterId]

  // Reset status kejadian saat pindah bab.
  useEffect(() => {
    setShowEvent(false)
    setEventDone(false)
    setActiveStage(null)
  }, [chapterId])

  const selesaikanTahap = (stageIndex: number, score: number) => {
    dispatch({ type: 'COMPLETE_STAGE', chapterId, stageIndex, score })
    setActiveStage(null)
    bendera()
    // Satu kejadian acak per kunjungan bab, muncul setelah tahap pertama
    // yang diselesaikan di kunjungan ini.
    if (!eventDone) setShowEvent(true)
  }

  const selesaikanBab = () => {
    playMenang()
    const pertamaKali = !progress.done
    dispatch({ type: 'COMPLETE_CHAPTER', chapterId })
    dispatch({ type: 'EARN_BADGE', badgeId: BAB_BADGE[chapterId] })
    // Bab 5 punya dua tema (air + energi) sehingga memberi dua lencana.
    if (chapterId === 'air-energi') {
      dispatch({ type: 'EARN_BADGE', badgeId: 'pahlawan-energi' })
    }
    // Kartu ensiklopedia bab ini terbuka.
    KARTU_ENSIKLOPEDIA.filter((k) => k.babTerkait === chapterId).forEach((k) => {
      dispatch({ type: 'UNLOCK_CARD', cardId: k.id })
    })
    if (pertamaKali) {
      dispatch({ type: 'SET_REPORT', patch: tambahRapor(save.report, BONUS_RAPOR[chapterId]) })
      // Koleksi spesies terbuka saat Bab 6 selesai.
      if (chapterId === 'biodiversitas') {
        SPESIES.forEach((s) => dispatch({ type: 'ADD_SPECIES', id: s.id }))
      }
    }
    lencana()
    // Tamat bila semua bab lain sudah selesai (bab ini baru saja selesai).
    const tamat = CHAPTER_ORDER.every((id) => (id === chapterId ? true : save.chapters[id].done))
    onChapterComplete(tamat)
  }

  return (
    <div className="aia-stack">
      <section className="aia-card" aria-labelledby="aia-bab-title">
        <span className="aia-kicker">Bab · ±{meta.menit} menit</span>
        <h2 id="aia-bab-title" className="aia-section-title">
          {meta.judul}
        </h2>
        <p className="aia-muted">{meta.deskripsi}</p>
        <div className="aia-progress-row">
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={tahapSelesai}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-label="Progres tahap bab ini"
          >
            <span style={{ width: `${(tahapSelesai / 3) * 100}%` }} />
          </div>
          <span>{tahapSelesai}/3 tahap</span>
        </div>
      </section>

      <section className="aia-dialog" aria-label="Dialog pembuka bab">
        <span className="aia-kicker">Cerita bab ini</span>
        {DIALOG_AWAL[chapterId].map((baris, i) => (
          <p key={i}>
            <strong>{baris.tokoh}:</strong> {baris.teks}{' '}
            {(baris.tokoh === 'Magi' || baris.tokoh === 'Pak Plastik') && (
              <button
                type="button"
                className="aia-icon-btn"
                aria-label={`Dengarkan suara ${baris.tokoh}`}
                onClick={() => playMumble(baris.tokoh === 'Magi' ? 'Magi' : 'Pak Plastik')}
              >
                <Volume2 aria-hidden="true" />
              </button>
            )}
          </p>
        ))}
      </section>

      <section aria-labelledby="aia-tahap-title">
        <h2 id="aia-tahap-title" className="aia-section-title">
          Tahap
        </h2>
        <ol className="aia-stage-list">
          {progress.stages.map((stage, index) => {
            const skor = save.bestScores[`${chapterId}:${index}`] ?? 0
            return (
              <li key={index} className="aia-stage-row">
                <div>
                  <strong>{NAMA_TAHAP[index]}</strong>
                  <small>
                    {stage.status === 'done'
                      ? `Selesai · Skor terbaik ${stage.bestScore}`
                      : stage.status === 'open'
                        ? 'Terbuka'
                        : 'Terkunci · selesaikan tahap sebelumnya'}
                    {skor > 0 && stage.status !== 'done' ? ` · Skor terbaik ${skor}` : ''}
                  </small>
                </div>
                {stage.status === 'done' ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="aia-chip done">
                      <Check aria-hidden="true" /> Selesai
                    </span>
                    <button
                      type="button"
                      className="aia-btn aia-btn-ghost"
                      onClick={() => {
                        playPop()
                        setActiveStage(index)
                      }}
                    >
                      <Play aria-hidden="true" /> Main lagi
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="aia-btn aia-btn-primary"
                    disabled={stage.status !== 'open'}
                    onClick={() => {
                      playPop()
                      setActiveStage(index)
                    }}
                  >
                    <Play aria-hidden="true" /> Main
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {activeStage !== null && (
        <section className="aia-slot" aria-label="Mini-game">
          <MiniGame
            chapterId={chapterId}
            stageIndex={activeStage}
            onStageComplete={(score) => selesaikanTahap(activeStage, score)}
          />
          <button type="button" className="aia-btn aia-btn-ghost" onClick={() => setActiveStage(null)}>
            Tutup
          </button>
        </section>
      )}

      {showEvent ? (
        <section className="aia-slot" aria-label="Kejadian acak">
          <KejadianAcak
            chapterId={chapterId}
            onDone={() => {
              setShowEvent(false)
              setEventDone(true)
            }}
          />
        </section>
      ) : (
        <section className="aia-slot" aria-label="Kejadian acak">
          <strong>Kejadian acak</strong>
          <p>
            Kejadian acak (Badai Sampah, Serangan Lalat, Hujan Deras, dan lainnya) muncul setelah kamu menyelesaikan
            satu tahap di bab ini.
          </p>
        </section>
      )}

      <section className="aia-card" aria-label="Checkpoint">
        <span className="aia-kicker">Checkpoint</span>
        <p className="aia-muted" style={{ marginBottom: 0 }}>
          Progresmu tersimpan otomatis setiap selesai tahap dan tiap 30 detik. Kalau nyawamu habis, kamu mengulang
          dari awal tahap itu, bukan dari awal bab.
        </p>
      </section>

      {semuaSelesai && (
        <section className="aia-card aia-pos-hijau" aria-label="Pos Hijau">
          <h3>
            <Flag aria-hidden="true" /> Pos Hijau
          </h3>
          <p>
            Ketiga tahap selesai! Di Pos Hijau progresmu disimpan, rapor sekolah diperbarui, dan kamu mendapat
            lencana bab ini.
          </p>
          <RaporSekolah />
          <p>
            <strong>Refleksi:</strong> {REFLEKSI[chapterId]}
          </p>
          <JanjiHarian />
          <button type="button" className="aia-btn aia-btn-primary" onClick={selesaikanBab}>
            <Check aria-hidden="true" /> Selesaikan Bab
          </button>
        </section>
      )}

      <div className="aia-actions">
        <button type="button" className="aia-btn aia-btn-ghost" onClick={onExit}>
          <ArrowLeft aria-hidden="true" /> Kembali ke menu
        </button>
      </div>
    </div>
  )
}
