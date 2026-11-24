// BalasCepat — pesan masuk satu per satu seperti chat; pemain mengetuk
// balasan terbaik sebelum waktu habis. Benar = +poin + alasan singkat.
// Mode satu-ketukan: tanpa batas waktu. Generik: tanpa konten misi.

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, MessageCircle, Send } from 'lucide-react'
import { benar, getar, koin, salah } from '../suara'
import { acak, clamp } from './util'
import { EfekSalah } from './umpan-balik'

export interface BalasanChat {
  teks: string
  benar: boolean
  alasan?: string
}

export interface PesanChat {
  id: string
  pengirim: string
  teks: string
  balasan: BalasanChat[]
}

export interface BalasCepatProps {
  pesan: PesanChat[]
  waktuPerPesanMs?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  onSelesai: (skor: number) => void
}

export function BalasCepat({
  pesan,
  waktuPerPesanMs = 15000,
  modeSatuKetukan = false,
  disabled = false,
  onSelesai,
}: BalasCepatProps) {
  const tanpaWaktu = modeSatuKetukan
  const [idx, setIdx] = useState(0)
  const [sisaMs, setSisaMs] = useState(waktuPerPesanMs)
  const [benarHitung, setBenarHitung] = useState(0)
  const [jawaban, setJawaban] = useState<{ benar: boolean; alasan?: string } | null>(null)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const idxRef = useRef(idx)
  idxRef.current = idx
  const benarRef = useRef(benarHitung)
  benarRef.current = benarHitung
  const jawabanRef = useRef(jawaban)
  jawabanRef.current = jawaban
  const jedaRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (jedaRef.current) window.clearTimeout(jedaRef.current)
    },
    [],
  )

  // Daftar pesan berubah = mulai dari nol lagi.
  useEffect(() => {
    setIdx(0)
    setSisaMs(waktuPerPesanMs)
    setBenarHitung(0)
    setJawaban(null)
    setSelesai(false)
    selesaiRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesan, waktuPerPesanMs])

  const selesaikan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    setSelesai(true)
    const skor = pesan.length > 0 ? clamp(Math.round((benarRef.current / pesan.length) * 100), 0, 100) : 0
    onSelesai(skor)
  }

  const lanjut = () => {
    if (selesaiRef.current) return
    const berikut = idxRef.current + 1
    if (berikut >= pesan.length) {
      selesaikan()
      return
    }
    setIdx(berikut)
    setSisaMs(waktuPerPesanMs)
    setJawaban(null)
  }

  const jadwalkanLanjut = () => {
    if (jedaRef.current) window.clearTimeout(jedaRef.current)
    jedaRef.current = window.setTimeout(lanjut, 1400)
  }

  // Timer hitung mundur per pesan.
  useEffect(() => {
    if (tanpaWaktu || disabled || selesaiRef.current || jawaban) return
    const id = window.setInterval(() => setSisaMs((s) => Math.max(0, s - 100)), 100)
    return () => window.clearInterval(id)
  }, [tanpaWaktu, disabled, jawaban, idx])

  // Waktu habis.
  useEffect(() => {
    if (tanpaWaktu || selesaiRef.current || jawabanRef.current) return
    if (sisaMs <= 0 && pesan.length > 0) {
      salah()
      getar([40, 40, 40])
      setJawaban({ benar: false, alasan: 'Waktu habis — pesan ini terlewat.' })
      jadwalkanLanjut()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisaMs, tanpaWaktu])

  const jawab = (b: BalasanChat) => {
    if (disabled || selesaiRef.current || jawabanRef.current) return
    if (b.benar) {
      benar()
      koin()
      getar(15)
      setBenarHitung((n) => n + 1)
      setJawaban({ benar: true, alasan: b.alasan })
    } else {
      salah()
      getar([40, 40, 40])
      setJawaban({ benar: false, alasan: b.alasan ?? 'Balasan itu kurang tepat.' })
    }
    jadwalkanLanjut()
  }

  const aktif = pesan[idx]
  // Di-memo per pesan: mengacak di badan render membuat urutan tombol
  // berubah tiap tick timer (re-render tiap 100 ms) sehingga tidak bisa diketuk.
  const balasanAcak = useMemo(
    () => (aktif ? acak(aktif.balasan) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx],
  )
  const persenWaktu = waktuPerPesanMs > 0 ? (sisaMs / waktuPerPesanMs) * 100 : 100
  const detik = Math.ceil(sisaMs / 1000)
  const skorAkhir = pesan.length > 0 ? clamp(Math.round((benarHitung / pesan.length) * 100), 0, 100) : 0

  if (!aktif) {
    return (
      <div className="aia-stack">
        <p style={{ textAlign: 'center', margin: 0 }}>Tidak ada pesan.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-chat-pesan { border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: var(--card, #fff); color: var(--foreground, #111); padding: 14px; }
        .aia-gi-chat-balasan { display: block; width: 100%; min-height: 56px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 600; text-align: left; cursor: pointer; touch-action: manipulation; transition: transform .15s ease, outline .15s ease; }
        .aia-gi-chat-balasan:active { transform: scale(.97); }
        .aia-gi-chat-balasan.dipilih-benar { outline: 3px solid var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 12%, var(--card, #fff)); }
        .aia-gi-chat-balasan.dipilih-salah { outline: 3px solid #b83232; background: color-mix(in srgb, #b83232 10%, var(--card, #fff)); }
        .aia-gi-chat-balasan:disabled { cursor: default; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-chat-balasan { transition: none; } .aia-gi-chat-balasan:active { transform: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres pesan">
        <span className="aia-stat">
          <MessageCircle aria-hidden="true" /> Pesan {idx + 1}/{pesan.length}
        </span>
        <span className="aia-stat">Benar: {benarHitung}</span>
        {!tanpaWaktu && (
          <span className="aia-stat" aria-label={`Sisa waktu ${detik} detik`}>
            <Clock aria-hidden="true" /> {detik} detik
          </span>
        )}
      </div>

      {!tanpaWaktu && (
        <div
          className="aia-progress"
          role="progressbar"
          aria-valuenow={detik}
          aria-valuemin={0}
          aria-valuemax={Math.ceil(waktuPerPesanMs / 1000)}
          aria-label="Sisa waktu menjawab"
        >
          <span style={{ width: `${persenWaktu}%` }} />
        </div>
      )}

      <div className="aia-gi-chat-pesan" aria-live="polite">
        <strong>{aktif.pengirim}</strong>
        <p style={{ margin: '6px 0 0' }}>{aktif.teks}</p>
      </div>

      {jawaban && (
        <EfekSalah
          tampil={!jawaban.benar}
          petunjuk={jawaban.alasan}
        />
      )}
      {jawaban?.benar && jawaban.alasan && (
        <p className="aia-muted" role="status" style={{ margin: 0 }}>
          ✓ Benar! {jawaban.alasan}
        </p>
      )}

      {selesai ? (
        <p style={{ textAlign: 'center', margin: 0 }}>
          <strong>Semua pesan terjawab!</strong> Skor: {skorAkhir}
        </p>
      ) : (
        <div className="aia-stack" role="group" aria-label="Pilihan balasan">
          {balasanAcak.map((b) => (
            <button
              key={b.teks}
              type="button"
              className={`aia-gi-chat-balasan${jawaban && b.benar ? ' dipilih-benar' : ''}`}
              style={{ minHeight: modeSatuKetukan ? 64 : 56 }}
              disabled={disabled || jawaban !== null}
              aria-label={`Balas: ${b.teks}`}
              onClick={() => jawab(b)}
            >
              <Send aria-hidden="true" style={{ marginRight: 8, verticalAlign: '-3px' }} />
              {b.teks}
            </button>
          ))}
        </div>
      )}

      <p className="aia-muted" style={{ margin: 0 }}>
        {tanpaWaktu
          ? 'Ketuk balasan terbaik — tanpa batas waktu.'
          : 'Ketuk balasan terbaik sebelum waktu habis.'}
      </p>
    </div>
  )
}
