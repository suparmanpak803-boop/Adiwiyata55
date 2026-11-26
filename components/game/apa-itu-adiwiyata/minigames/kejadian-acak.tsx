'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bug, Check, CloudRain, SkipForward, Trash2, Wind } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ChapterId } from '@/lib/apa-itu-adiwiyata/types'
import { badai, getar, hujan, klik, lalat } from '../suara'

type JenisKejadian = 'hujan' | 'badai' | 'lalat'

interface KejadianInfo {
  jenis: JenisKejadian
  judul: string
  deskripsi: string
  target: string
  warna: string
  ikon: LucideIcon
  sfx: () => void
}

// Gelombang B: `warna` memakai variabel tema (bukan hex mentah) supaya
// ikon judul + tombol target tetap ≥3:1 di mode gelap — hex mentah
// #a13b3b hanya 2,17:1 di atas kartu gelap.
const KEJADIAN: Record<ChapterId, KejadianInfo> = {
  gerbang: {
    jenis: 'hujan',
    judul: 'Hujan Deras',
    deskripsi: 'Hujan deras turun di gerbang! Ketuk 5 tetes hujan untuk berteduh di bawah atap.',
    target: 'tetes hujan',
    warna: 'var(--aia-sky)',
    ikon: CloudRain,
    sfx: hujan,
  },
  kantin: {
    jenis: 'badai',
    judul: 'Badai Sampah',
    deskripsi: 'Angin kencang menerbangkan sampah di kantin! Ketuk 5 sampah beterbangan untuk menangkapnya.',
    target: 'sampah beterbangan',
    warna: 'var(--ink-soft)',
    ikon: Wind,
    sfx: badai,
  },
  maggot: {
    jenis: 'lalat',
    judul: 'Serangan Lalat',
    deskripsi: 'Lalat datang mengerumuni kotak maggot! Ketuk 5 lalat untuk mengusirnya.',
    target: 'lalat',
    warna: 'var(--aia-merah)',
    ikon: Bug,
    sfx: lalat,
  },
  kompos: {
    jenis: 'hujan',
    judul: 'Hujan Deras',
    deskripsi: 'Hujan deras mengguyur kebun! Ketuk 5 tetes hujan untuk meneduh di bawah pohon.',
    target: 'tetes hujan',
    warna: 'var(--aia-sky)',
    ikon: CloudRain,
    sfx: hujan,
  },
  'air-energi': {
    jenis: 'badai',
    judul: 'Badai Sampah',
    deskripsi: 'Angin kencang menerbangkan sampah di taman air! Ketuk 5 sampah beterbangan untuk menangkapnya.',
    target: 'sampah beterbangan',
    warna: 'var(--ink-soft)',
    ikon: Wind,
    sfx: badai,
  },
  biodiversitas: {
    jenis: 'lalat',
    judul: 'Serangan Lalat',
    deskripsi: 'Lalat berdatangan ke taman! Ketuk 5 lalat untuk mengusirnya supaya kupu-kupu betah.',
    target: 'lalat',
    warna: 'var(--aia-merah)',
    ikon: Bug,
    sfx: lalat,
  },
}

const JUMLAH_TARGET = 5

/**
 * Kartu overlay kejadian acak per bab (maks ~30 detik, tanpa gagal):
 * ketuk 5 target yang muncul satu per satu di posisi acak, lalu lanjut.
 * Ada tombol "Lewati" supaya pemain tidak pernah terjebak di sini.
 */
export function KejadianAcak({ chapterId, onDone }: { chapterId: ChapterId; onDone: () => void }) {
  const info = KEJADIAN[chapterId]
  const [ditangkap, setDitangkap] = useState(0)
  const [selesai, setSelesai] = useState(false)

  // 5 posisi acak, dibuat sekali saat kartu dibuka.
  const posisi = useMemo(
    () =>
      Array.from({ length: JUMLAH_TARGET }, () => ({
        left: 8 + Math.random() * 68,
        top: 8 + Math.random() * 58,
      })),
    [],
  )

  // Bunyi suasana kejadian sekali saat kartu dibuka.
  // C-29: deps memakai chapterId — bila chapterId berubah tanpa remount,
  // SFX kejadian baru ikut berbunyi (sebelumnya deps kosong = stale).
  useEffect(() => {
    info.sfx()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId])

  const ketukTarget = () => {
    if (selesai) return
    klik()
    getar(15)
    const baru = ditangkap + 1
    setDitangkap(baru)
    if (baru >= JUMLAH_TARGET) {
      setSelesai(true)
    }
  }

  const IkonTarget = info.jenis === 'hujan' ? CloudRain : info.jenis === 'badai' ? Trash2 : Bug
  const IkonJudul = info.ikon
  const targetAktif = posisi[Math.min(ditangkap, JUMLAH_TARGET - 1)]

  return (
    <div className="aia-stack">
      <style>{`
        @keyframes aia-ka-muncul { from { opacity: 0; transform: translate(-50%, -50%) scale(.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        .aia-ka-target { animation: aia-ka-muncul .2s ease; }
        @media (prefers-reduced-motion: reduce) {
          .aia-ka-target { animation: none !important; }
        }
      `}</style>

      <section className="aia-card" aria-labelledby="aia-ka-title">
        <span className="aia-kicker">Kejadian acak</span>
        <h3 id="aia-ka-title" className="aia-section-title" style={{ marginTop: 4 }}>
          <IkonJudul aria-hidden="true" style={{ width: 18, height: 18, color: info.warna, verticalAlign: -3 }} />{' '}
          {info.judul}
        </h3>
        <p className="aia-muted">{info.deskripsi}</p>

        <div className="aia-progress-row" style={{ marginTop: 12 }}>
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={ditangkap}
            aria-valuemin={0}
            aria-valuemax={JUMLAH_TARGET}
            aria-label={`Ditangkap ${ditangkap} dari ${JUMLAH_TARGET}`}
          >
            <span style={{ width: `${(ditangkap / JUMLAH_TARGET) * 100}%` }} />
          </div>
          <span>
            {ditangkap}/{JUMLAH_TARGET}
          </span>
        </div>

        <div
          style={{
            position: 'relative',
            height: 260,
            marginTop: 12,
            overflow: 'hidden',
            border: '1px solid var(--line)',
            borderRadius: 16,
            background: 'var(--muted)',
          }}
        >
          {!selesai && targetAktif && (
            <button
              key={ditangkap}
              type="button"
              className="aia-ka-target"
              style={{
                position: 'absolute',
                left: `${targetAktif.left}%`,
                top: `${targetAktif.top}%`,
                display: 'grid',
                width: 56,
                height: 56,
                placeItems: 'center',
                border: `2px solid ${info.warna}`,
                borderRadius: '50%',
                background: 'var(--card)',
                color: info.warna,
                cursor: 'pointer',
              }}
              aria-label={`Ketuk ${info.target} ${ditangkap + 1} dari ${JUMLAH_TARGET}`}
              onClick={ketukTarget}
            >
              <IkonTarget aria-hidden="true" style={{ width: 26, height: 26 }} />
            </button>
          )}
          {selesai && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div>
                <Check aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
                <p style={{ margin: '8px 0 0', fontWeight: 700 }}>Berhasil! Kejadian teratasi.</p>
              </div>
            </div>
          )}
        </div>

        <div className="aia-actions">
          {selesai ? (
            <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={onDone}>
              <Check aria-hidden="true" /> Lanjutkan
            </button>
          ) : (
            <button type="button" className="aia-btn aia-btn-ghost aia-btn-block" onClick={onDone}>
              <SkipForward aria-hidden="true" /> Lewati kejadian
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
