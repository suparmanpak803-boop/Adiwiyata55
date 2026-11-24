'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { ArrowLeft, Check, Flag, RotateCcw } from 'lucide-react'
import { CHAPTERS, CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { TUGAS } from '@/lib/apa-itu-adiwiyata/tugas'
import { kunciCerita, PILIHAN_CERITA, pilihEpilog } from '@/lib/apa-itu-adiwiyata/content/cerita'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { KARTU_ENSIKLOPEDIA } from '@/lib/apa-itu-adiwiyata/content/ensiklopedia'
import { REFLEKSI } from '@/lib/apa-itu-adiwiyata/content/pertanyaan'
import { SPESIES } from '@/lib/apa-itu-adiwiyata/content/spesies'
import { BAB_BADGE, LENCANA, TUGAS_BADGE } from '@/lib/apa-itu-adiwiyata/lencana'
import { TUGAS_ORDER, type ChapterId, type Report, type TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { JanjiHarian } from './janji-harian'
import { PilihanCerita } from './pilihan-cerita'
import { RaporSekolah } from './rapor-sekolah'
import { KejadianAcak } from './minigames/kejadian-acak'
import { AirEnergi } from './minigames/air-energi'
import { Inspeksi } from './minigames/inspeksi'
import { KomposKebun } from './minigames/kompos-kebun'
import { PilahSampah } from './minigames/pilah-sampah'
import { TasPagi } from './minigames/tas-pagi'
import { ZonaMaggot } from './minigames/zona-maggot'
import { BankSampah } from './minigames/bank-sampah'
import { LingkunganSehat } from './minigames/lingkungan-sehat'
import { EduLingkungan } from './minigames/edu-lingkungan'
import { InovasiHijau } from './minigames/inovasi-hijau'
import { KantinHijau } from './minigames/kantin-hijau'
import { DataHijau } from './minigames/data-hijau'
import { EcoCommunication } from './minigames/eco-communication'
import { JejaringHijau } from './minigames/jejaring-hijau'
import { bendera, lencana, playMenang, playPop, startMusic, type MusicMode } from './suara'

/**
 * Props yang dipakai mini-game bab: tiap mini-game menerima chapterId,
 * stageIndex, dan onStageComplete(score). Mini-game memanggil onStageComplete
 * saat tahap selesai; kerangka misi meneruskannya ke COMPLETE_STAGE.
 * (Dipindah dari bab-shell.tsx — tipe ini dipakai 6 mini-game bab dan shell.)
 */
export interface MiniGameSlotProps {
  chapterId: ChapterId
  stageIndex: number
  onStageComplete: (score: number) => void
}

/**
 * Props mini-game Misi Kader (satu tipe bersama; tiap file mini-game
 * mendefinisikan ulang tipe yang sama bentuknya secara lokal).
 */
export interface TugasMiniGameSlotProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
}

const MODE_BAB: MusicMode[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'bab6']

const MINI_GAME_BAB: Record<ChapterId, ComponentType<MiniGameSlotProps & { modeSatuKetukan?: boolean }>> = {
  gerbang: TasPagi,
  kantin: PilahSampah,
  maggot: ZonaMaggot,
  kompos: KomposKebun,
  'air-energi': AirEnergi,
  biodiversitas: Inspeksi,
}

const MINI_GAME_TUGAS: Record<TugasKaderId, ComponentType<TugasMiniGameSlotProps & { modeSatuKetukan?: boolean }>> = {
  'bank-sampah': BankSampah,
  'lingkungan-sehat': LingkunganSehat,
  'edu-lingkungan': EduLingkungan,
  'inovasi-hijau': InovasiHijau,
  'kantin-hijau': KantinHijau,
  'data-hijau': DataHijau,
  'eco-communication': EcoCommunication,
  'jejaring-hijau': JejaringHijau,
}

// Bonus rapor sekolah saat bab pertama kali diselesaikan (sama seperti bab-shell).
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

/**
 * Kerangka misi VISUAL dan LANGSUNG untuk satu misi (bab utama atau tugas kader).
 * Menggantikan tampilan BabShell lama yang ditolak user (kartu dialog teks
 * panjang + daftar "Tahap" dengan tombol Main dan status Terkunci):
 * - gambar cover + 1 baris tugas di atas,
 * - indikator progres 3 titik (bukan daftar tahap),
 * - mini-game tahap yang sedang berjalan ditampilkan langsung; setelah selesai
 *   lanjut otomatis ke tahap berikutnya dengan efek benar + 1 kalimat
 *   petunjuk Magi dari INTERAKSI_MISI,
 * - tombol "Main lagi" kecil hanya untuk tahap yang sudah selesai.
 * Logika penyelesaian dipertahankan dari bab-shell (COMPLETE_STAGE /
 * COMPLETE_CHAPTER / COMPLETE_TUGAS_STAGE / COMPLETE_TUGAS, bonus rapor,
 * lencana, kartu ensiklopedia, janji harian, spesies, kejadian acak, musik).
 */
export function MisiShell({
  kind,
  id,
  onExit,
  onMissionComplete,
  modeSatuKetukan = false,
  onOpenPanduan,
}: {
  kind: 'bab' | 'tugas'
  id: ChapterId | TugasKaderId
  onExit: () => void
  onMissionComplete: (tamat: boolean) => void
  /** Bila true, mini-game memakai versi tombol (tanpa gestur). */
  modeSatuKetukan?: boolean
  /** Buka panduan Cara Bermain (overlay dari runner); bila tidak diisi, tombol "?" tidak tampil. */
  onOpenPanduan?: () => void
}) {
  const { save, dispatch } = useCampaign()
  const [replayStage, setReplayStage] = useState<number | null>(null)
  const [showEvent, setShowEvent] = useState(false)
  const [eventDone, setEventDone] = useState(false)
  const [pesanSukses, setPesanSukses] = useState<string | null>(null)

  const chapterId = kind === 'bab' ? (id as ChapterId) : null
  const tugasId = kind === 'tugas' ? (id as TugasKaderId) : null
  const meta = kind === 'bab' ? CHAPTERS[id as ChapterId] : TUGAS[id as TugasKaderId]
  const progress = kind === 'bab' ? save.chapters[id as ChapterId] : save.tugas[id as TugasKaderId]
  const tahapSelesai = progress.stages.filter((s) => s.status === 'done').length
  const semuaSelesai = tahapSelesai === 3
  const tahapBerjalan = replayStage ?? progress.stages.findIndex((s) => s.status !== 'done')
  const tampilkanGame = tahapBerjalan >= 0
  // Misi ini pertama kali diselesaikan bila progress.done masih false
  // (dipakai render epilog + pemberian bonus sekali di selesaikanMisi).
  const pertamaKali = !progress.done
  // Titik pilihan 2 (Cerita Bercabang, hanya bab utama): tampil sebelum
  // tahap ke-3, menggantikan slot mini-game sampai pemain memilih.
  const titikPilihan2 = kind === 'bab' && chapterId ? PILIHAN_CERITA[chapterId][1] : null
  const kunciPilihan2 = titikPilihan2 && chapterId ? kunciCerita(chapterId, titikPilihan2.id) : null
  const sudahPilih2 = kunciPilihan2 ? save.cerita?.[kunciPilihan2] !== undefined : false
  const tampilkanPilihan2 = kind === 'bab' && !!titikPilihan2 && tahapBerjalan === 2 && !sudahPilih2
  // Epilog Pos Hijau (hanya bab utama; misi tugas tidak punya pilihan).
  const epilog = kind === 'bab' && chapterId ? pilihEpilog(chapterId, save.cerita ?? {}) : null
  const tahapTerakhirSelesai = Math.max(
    -1,
    ...progress.stages.map((s, i) => (s.status === 'done' ? i : -1)),
  )
  const petunjukMagi = tampilkanGame
    ? (INTERAKSI_MISI[id][tahapBerjalan]?.petunjukMagi ?? '').replace(/^Magi:\s*/, '')
    : ''
  const MiniGameBab = chapterId ? MINI_GAME_BAB[chapterId] : null
  const MiniGameTugas = tugasId ? MINI_GAME_TUGAS[tugasId] : null
  // Apakah misi tugas ini akan melengkapi semua 8 Misi Kader bila diselesaikan.
  const lengkapiKader =
    kind === 'tugas' && tugasId
      ? TUGAS_ORDER.every((tid) => (tid === tugasId ? true : save.tugas[tid].done))
      : false
  const namaLencanaTugas =
    kind === 'tugas' && tugasId
      ? LENCANA.find((l) => l.id === TUGAS_BADGE[tugasId])?.nama ?? 'Lencana Misi Kader'
      : ''

  // Reset status kunjungan saat pindah misi.
  useEffect(() => {
    setReplayStage(null)
    setShowEvent(false)
    setEventDone(false)
    setPesanSukses(null)
  }, [kind, id])

  // Musik: bab memakai musik babnya, tugas memakai mode 'menu'.
  useEffect(() => {
    if (kind === 'bab') {
      startMusic(MODE_BAB[CHAPTER_ORDER.indexOf(id as ChapterId)])
    } else {
      startMusic('menu')
    }
  }, [kind, id])

  // Pesan sukses hilang sendiri setelah 3 detik.
  useEffect(() => {
    if (!pesanSukses) return
    const t = setTimeout(() => setPesanSukses(null), 3000)
    return () => clearTimeout(t)
  }, [pesanSukses])

  const selesaikanTahap = (stageIndex: number, score: number) => {
    if (kind === 'bab' && chapterId) {
      dispatch({ type: 'COMPLETE_STAGE', chapterId, stageIndex, score })
    } else if (kind === 'tugas' && tugasId) {
      dispatch({ type: 'COMPLETE_TUGAS_STAGE', tugasId, stageIndex, score })
    }
    setReplayStage(null)
    setPesanSukses(`Tahap ${stageIndex + 1} selesai! +${score} Koin Hijau.`)
    bendera()
    // Satu kejadian acak per kunjungan bab, muncul setelah tahap pertama
    // yang diselesaikan di kunjungan ini (sama seperti bab-shell).
    if (kind === 'bab' && !eventDone) setShowEvent(true)
  }

  const selesaikanMisi = () => {
    playMenang()
    if (kind === 'bab' && chapterId) {
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
        // Bonus epilog Cerita Bercabang, SATU KALI saat pertama selesai.
        // (pilihEpilog dihitung dari pilihan yang tersimpan; bila belum
        // memilih di titik kuncinya, bonusnya 15 koin — lihat cerita.ts.)
        const hasilEpilog = pilihEpilog(chapterId, save.cerita ?? {})
        dispatch({ type: 'EARN_COINS', amount: hasilEpilog.bonus })
        // Koleksi spesies terbuka saat Bab 6 selesai.
        if (chapterId === 'biodiversitas') {
          SPESIES.forEach((s) => dispatch({ type: 'ADD_SPECIES', id: s.id }))
        }
      }
      lencana()
      // Tamat bila semua bab lain sudah selesai (bab ini baru saja selesai).
      const tamat = CHAPTER_ORDER.every((cid) => (cid === chapterId ? true : save.chapters[cid].done))
      onMissionComplete(tamat)
      return
    }
    if (kind === 'tugas' && tugasId) {
      dispatch({ type: 'COMPLETE_TUGAS', tugasId })
      dispatch({ type: 'EARN_BADGE', badgeId: TUGAS_BADGE[tugasId] })
      // Lencana Kader Lengkap bila kedelapan Misi Kader sudah selesai.
      if (lengkapiKader) {
        dispatch({ type: 'EARN_BADGE', badgeId: 'kader-lengkap' })
      }
      lencana()
      onMissionComplete(false)
    }
  }

  return (
    <div className="aia-stack">
      <section className="aia-card" aria-labelledby="aia-misi-title">
        <img
          src={`/images/game/misi/${id}.jpg`}
          alt={`Gambar misi ${meta.judul}`}
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            borderRadius: 12,
            display: 'block',
            marginBottom: 12,
          }}
        />
        <span className="aia-kicker">Misi · ±{meta.menit} menit</span>
        <h2 id="aia-misi-title" className="aia-section-title">
          {meta.judul}
        </h2>
        <p className="aia-muted" style={{ marginBottom: 12 }}>
          {meta.deskripsi}
        </p>
        <div
          className="aia-progress-row"
          role="progressbar"
          aria-valuenow={tahapSelesai}
          aria-valuemin={0}
          aria-valuemax={3}
          aria-label={`Progres misi: ${tahapSelesai} dari 3 tahap selesai`}
        >
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }} aria-hidden="true">
            {progress.stages.map((stage, i) => (
              <span
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: stage.status === 'done' ? '#2f7d4f' : 'transparent',
                  border: '2px solid #2f7d4f',
                  opacity: i === tahapBerjalan ? 1 : stage.status === 'done' ? 1 : 0.4,
                }}
              />
            ))}
          </span>
          <span>{tahapSelesai}/3 tahap</span>
          {onOpenPanduan && (
            <button
              type="button"
              className="aia-icon-btn"
              onClick={onOpenPanduan}
              aria-label="Cara bermain"
              style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}
            >
              <span aria-hidden="true">?</span>
            </button>
          )}
        </div>
        {tahapTerakhirSelesai >= 0 && replayStage === null && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="aia-btn aia-btn-ghost"
              style={{ minHeight: 44 }}
              onClick={() => {
                playPop()
                setReplayStage(tahapTerakhirSelesai)
              }}
            >
              <RotateCcw aria-hidden="true" /> Main lagi
            </button>
          </div>
        )}
        {replayStage !== null && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="aia-btn aia-btn-ghost"
              style={{ minHeight: 44 }}
              onClick={() => {
                playPop()
                setReplayStage(null)
              }}
            >
              Kembali ke{' '}
              {semuaSelesai
                ? 'Pos Hijau'
                : `Tahap ${progress.stages.findIndex((s) => s.status !== 'done') + 1}`}
            </button>
          </div>
        )}
      </section>

      {pesanSukses && (
        <div className="aia-card" role="status" style={{ borderColor: '#2f7d4f' }}>
          <span className="aia-chip done">
            <Check aria-hidden="true" /> {pesanSukses}
          </span>
        </div>
      )}

      {tampilkanGame && (
        <div className="aia-card" role="status" aria-label="Petunjuk Magi">
          <span className="aia-kicker">Magi</span>
          <p style={{ margin: 0 }}>{petunjukMagi}</p>
        </div>
      )}

      {showEvent && kind === 'bab' && chapterId && (
        <section className="aia-slot" aria-label="Kejadian acak">
          <KejadianAcak
            chapterId={chapterId}
            onDone={() => {
              setShowEvent(false)
              setEventDone(true)
            }}
          />
        </section>
      )}

      {tampilkanGame && !showEvent && (
        <section className="aia-slot" aria-label="Permainan misi">
          {tampilkanPilihan2 && titikPilihan2 && kunciPilihan2 ? (
            <PilihanCerita
              titik={titikPilihan2}
              onSelesai={(opsi) => {
                dispatch({
                  type: 'PILIH_CERITA',
                  kunci: kunciPilihan2,
                  opsi: opsi.id,
                  pakPlastik: opsi.pakPlastik,
                })
              }}
            />
          ) : (
            <>
              {kind === 'bab' && chapterId && MiniGameBab && (
                <MiniGameBab
                  chapterId={chapterId}
                  stageIndex={tahapBerjalan}
                  onStageComplete={(score) => selesaikanTahap(tahapBerjalan, score)}
                  modeSatuKetukan={modeSatuKetukan}
                />
              )}
              {kind === 'tugas' && tugasId && MiniGameTugas && (
                <MiniGameTugas
                  tugasId={tugasId}
                  stageIndex={tahapBerjalan}
                  onStageComplete={(score) => selesaikanTahap(tahapBerjalan, score)}
                  modeSatuKetukan={modeSatuKetukan}
                />
              )}
            </>
          )}
        </section>
      )}

      {semuaSelesai && replayStage === null && (
        <section className="aia-card aia-pos-hijau" aria-label="Pos Hijau">
          <h3>
            <Flag aria-hidden="true" /> Pos Hijau
          </h3>
          {kind === 'bab' && chapterId ? (
            <>
              <p>
                Ketiga tahap selesai! Di Pos Hijau progresmu disimpan, rapor sekolah diperbarui, dan kamu mendapat
                lencana misi ini.
              </p>
              <RaporSekolah />
              <p>
                <strong>Refleksi:</strong> {REFLEKSI[chapterId]}
              </p>
              {epilog && (
                <>
                  <p>
                    <strong>Epilog:</strong> {epilog.teks}
                  </p>
                  <p className="aia-muted">
                    {pertamaKali
                      ? `+${epilog.bonus} Koin Hijau dari epilog ini.`
                      : `Bonus epilog (+${epilog.bonus} Koin Hijau) sudah kamu terima saat pertama menyelesaikan misi ini.`}
                  </p>
                </>
              )}
              <JanjiHarian />
            </>
          ) : (
            <p>
              Ketiga tahap selesai! Kamu mendapat lencana {namaLencanaTugas}.
              {lengkapiKader ? ' Ini misi kader terakhir — kamu juga mendapat lencana Kader Lengkap!' : ''}
            </p>
          )}
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            style={{ minHeight: 44 }}
            onClick={selesaikanMisi}
          >
            <Check aria-hidden="true" /> Selesaikan Misi
          </button>
        </section>
      )}

      <div className="aia-actions">
        <button type="button" className="aia-btn aia-btn-ghost" style={{ minHeight: 44 }} onClick={onExit}>
          <ArrowLeft aria-hidden="true" /> Kembali ke dunia
        </button>
      </div>
    </div>
  )
}
