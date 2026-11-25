// SiramRitme — metronom berdetak sesuai tempo; pemain mengetuk tombol
// besar tepat pada ketukan. Tiap ketukan dinilai: Sempurna (±150ms),
// Bagus (±350ms), selebihnya meleset. Jam berbasis performance.now().
// Mode satu-ketukan: toleransi lebih longgar. Generik: tanpa konten misi.

'use client'

import { useEffect, useRef, useState } from 'react'
import { Droplets, RotateCcw, Timer } from 'lucide-react'
import { benar, getar, klik, koin, salah, tik } from '../suara'
import { clamp, useKurangiAnimasi } from './util'

export type NilaiKetukan = 'Sempurna' | 'Bagus' | 'Meleset'

export interface SiramRitmeProps {
  /** Jumlah ketukan yang harus dijawab. */
  ketukan: number
  tempoBpm?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Jeda: bekukan metronom (baseline digeser sebesar durasi jeda). */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

const NILAI_POIN: Record<NilaiKetukan, number> = {
  Sempurna: 100,
  Bagus: 60,
  Meleset: 0,
}

export function SiramRitme({
  ketukan,
  tempoBpm = 80,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
}: SiramRitmeProps) {
  const kurangi = useKurangiAnimasi()
  const total = Math.max(1, ketukan)
  const intervalMs = Math.max(300, 60000 / Math.max(30, tempoBpm))
  // Mode satu-ketukan: toleransi lebih longgar.
  const toleransiSempurna = modeSatuKetukan ? 250 : 150
  const toleransiBagus = modeSatuKetukan ? 500 : 350

  const [penilaian, setPenilaian] = useState<NilaiKetukan[]>([])
  const [denyut, setDenyut] = useState(false)
  const [selesai, setSelesai] = useState(false)
  const [ronde, setRonde] = useState(0)

  const selesaiRef = useRef(false)
  const penilaianRef = useRef<NilaiKetukan[]>([])
  const waktuMulaiRef = useRef(0)
  const timerRef = useRef<number[]>([])
  const intervalRef = useRef<number | null>(null)
  const terjedaRef = useRef(terjeda)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])
  // Jeda: catat waktu mulai jeda; saat lanjut, geser baseline metronom
  // sebesar durasi jeda supaya ketukan tidak maju selama jeda.
  const jedaMulaiRef = useRef<number | null>(null)
  useEffect(() => {
    if (terjeda) {
      if (jedaMulaiRef.current === null) jedaMulaiRef.current = performance.now()
    } else if (jedaMulaiRef.current !== null) {
      waktuMulaiRef.current += performance.now() - jedaMulaiRef.current
      jedaMulaiRef.current = null
    }
  }, [terjeda])

  const bersihkanTimer = () => {
    timerRef.current.forEach((id) => window.clearTimeout(id))
    timerRef.current = []
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => bersihkanTimer, [])

  const selesaikan = (daftar: NilaiKetukan[]) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    bersihkanTimer()
    setSelesai(true)
    const totalPoin = daftar.reduce((s, n) => s + NILAI_POIN[n], 0)
    const skor = daftar.length > 0 ? clamp(Math.round(totalPoin / daftar.length), 0, 100) : 0
    if (skor >= 60) {
      benar()
      koin()
    } else {
      salah()
    }
    onSelesai(skor)
  }

  const catatNilai = (nilai: NilaiKetukan) => {
    const baru = [...penilaianRef.current, nilai]
    penilaianRef.current = baru
    setPenilaian(baru)
    if (baru.length >= total) selesaikan(baru)
  }

  // Ketukan metronom: bila sedang terjeda, tunda bunyi/denyut sampai
  // jeda selesai (baseline sudah digeser saat lanjut, jadi ketukan
  // tetap jatuh pada waktu yang benar).
  const jadwalkanDenyut = (tunda: number) => {
    const id = window.setTimeout(() => {
      if (terjedaRef.current) {
        jadwalkanDenyut(100)
        return
      }
      tik()
      if (!kurangi) {
        setDenyut(true)
        const lepas = window.setTimeout(() => setDenyut(false), 220)
        timerRef.current.push(lepas)
      }
    }, tunda)
    timerRef.current.push(id)
  }

  const mulai = () => {
    bersihkanTimer()
    penilaianRef.current = []
    setPenilaian([])
    setDenyut(false)
    setSelesai(false)
    selesaiRef.current = false
    // Bila diulang saat terjeda, mulai hitung jeda dari sekarang supaya
    // geseran baseline saat lanjut tidak memakai jeda yang lama.
    jedaMulaiRef.current = terjedaRef.current ? performance.now() : null
    // Hitungan awal 800ms sebelum ketukan pertama.
    const mulaiPada = performance.now() + 800
    waktuMulaiRef.current = mulaiPada
    for (let i = 0; i < total; i += 1) {
      const tunda = 800 + i * intervalMs
      jadwalkanDenyut(tunda)
    }
    // Pemeriksa ketukan yang terlewat: bila jendela Bagus sudah lewat
    // tanpa ketukan, ketukan itu dinilai Meleset.
    intervalRef.current = window.setInterval(() => {
      // Jeda: lewati pemeriksaan supaya ketukan tidak dinilai Meleset selama jeda.
      if (terjedaRef.current || selesaiRef.current) return
      const sekarang = performance.now()
      const idxBerikut = penilaianRef.current.length
      if (idxBerikut >= total) return
      const waktuKetuk = waktuMulaiRef.current + idxBerikut * intervalMs
      if (sekarang > waktuKetuk + toleransiBagus) {
        catatNilai('Meleset')
      }
    }, 50)
  }

  // Mulai metronom saat tampil / saat tempo atau jumlah ketukan berubah.
  useEffect(() => {
    setRonde((r) => r + 1)
    mulai()
    return bersihkanTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ketukan, tempoBpm])

  const ketuk = () => {
    // Ketukan saat terjeda diabaikan: penilaiannya memakai baseline
    // yang baru digeser saat jeda selesai.
    if (terjedaRef.current || disabled || selesaiRef.current) return
    const idxBerikut = penilaianRef.current.length
    if (idxBerikut >= total) return
    const sekarang = performance.now()
    const waktuKetuk = waktuMulaiRef.current + idxBerikut * intervalMs
    const selisih = sekarang - waktuKetuk
    const mutlak = Math.abs(selisih)
    // Terlalu dini (di luar jendela) = ketukan liar, abaikan.
    if (selisih < -toleransiBagus) {
      klik()
      return
    }
    if (mutlak <= toleransiSempurna) {
      benar()
      getar(15)
      catatNilai('Sempurna')
    } else if (mutlak <= toleransiBagus) {
      klik()
      getar(10)
      catatNilai('Bagus')
    } else {
      salah()
      getar([40, 40])
      catatNilai('Meleset')
    }
  }

  const skorAkhir =
    penilaian.length > 0
      ? clamp(Math.round(penilaian.reduce((s, n) => s + NILAI_POIN[n], 0) / penilaian.length), 0, 100)
      : 0

  // Keyboard: Enter/Spasi = ketukan (onPointerDown tidak dipicu keyboard).
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (e.repeat) return
    ketuk()
  }
  const detikPerKetuk = (intervalMs / 1000).toFixed(2)

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-ritme-tombol { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 120px; padding: 20px; border-radius: 16px; border: 2px solid var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 10%, var(--card, #fff)); color: var(--foreground, #111); font-weight: 800; font-size: 18px; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
        @media (hover: hover) { .aia-gi-ritme-tombol:hover { box-shadow: 0 4px 14px rgba(0,0,0,.15); } }
        .aia-gi-ritme-tombol:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-ritme-tombol svg { width: 40px; height: 40px; }
        .aia-gi-ritme-tombol.denyut { animation: aia-gi-denyut .22s ease; }
        @keyframes aia-gi-denyut { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
        .aia-gi-ritme-tombol:active { transform: scale(.96); }
        .aia-gi-ritme-nilai { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 32px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); font-weight: 700; font-size: 13px; }
        .aia-gi-ritme-nilai.Sempurna { border-color: var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 14%, var(--card, #fff)); }
        .aia-gi-ritme-nilai.Bagus { border-color: #b45309; background: color-mix(in srgb, #b45309 12%, var(--card, #fff)); }
        .aia-gi-ritme-nilai.Meleset { border-color: #b83232; background: color-mix(in srgb, #b83232 10%, var(--card, #fff)); }
        @media (prefers-reduced-motion: reduce) { .aia-gi-ritme-tombol.denyut { animation: none; } .aia-gi-ritme-tombol:active { transform: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres ritme">
        <span className="aia-stat">
          <Timer aria-hidden="true" /> {tempoBpm} BPM · {detikPerKetuk} detik/ketukan
        </span>
        <span className="aia-stat">
          Ketukan {penilaian.length}/{total}
        </span>
      </div>

      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={penilaian.length}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Progres ketukan"
      >
        <span style={{ width: `${(penilaian.length / total) * 100}%` }} />
      </div>

      <button
        type="button"
        className={`aia-gi-ritme-tombol${denyut ? ' denyut' : ''}`}
        disabled={disabled || selesai}
        aria-label={
          kurangi
            ? 'Ketuk! Ketuk tombol ini tepat pada ketukan metronom.'
            : 'Ketuk tombol ini tepat pada ketukan metronom.'
        }
        onPointerDown={ketuk}
        onKeyDown={onKeyDown}
      >
        <Droplets aria-hidden="true" />
        {kurangi ? 'Ketuk!' : denyut ? 'Ketuk!' : 'Siap… ketuk pada ketukan!'}
      </button>

      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
        aria-label="Penilaian tiap ketukan"
      >
        {penilaian.map((n, i) => (
          <span key={`${ronde}-${i}`} className={`aia-gi-ritme-nilai ${n}`}>
            {i + 1}. {n}
          </span>
        ))}
        {penilaian.length === 0 && <span className="aia-muted">Belum ada ketukan dinilai.</span>}
      </div>

      {selesai && (
        <p style={{ textAlign: 'center', margin: 0 }}>
          <strong>Ritme selesai!</strong> Skor: {skorAkhir}
        </p>
      )}

      <p className="aia-muted" style={{ margin: 0, textAlign: 'center' }}>
        Sempurna = tepat ±{toleransiSempurna}ms · Bagus = ±{toleransiBagus}ms
        {modeSatuKetukan ? ' (toleransi longgar)' : ''}
      </p>

      {selesai && (
        <div className="aia-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="aia-btn aia-btn-ghost"
            style={{ minHeight: 44 }}
            onClick={mulai}
            // C-27: "Ulangi" dinonaktifkan setelah onSelesai dipanggil —
            // pengulangan ronde dikendalikan parent lewat `key` baru
            // (kompos menaikkan `ulangan`), bukan dari tombol internal
            // yang bisa me-restart ronde yang sudah diproses.
            disabled={disabled || selesai}
          >
            <RotateCcw aria-hidden="true" /> Ulangi
          </button>
        </div>
      )}
    </div>
  )
}
