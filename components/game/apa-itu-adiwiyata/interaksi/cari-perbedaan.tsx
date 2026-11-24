// CariPerbedaan — dua panel berdampingan (menumpuk vertikal di layar
// sempit); pemain mengetuk sel yang berbeda di panel kanan. Benar =
// tanda centang + bunyi benar; salah = bunyi salah, dan setelah 2 salah
// muncul sorotan petunjuk di salah satu yang belum ketemu. Mode
// satu-ketukan: tombol petunjuk selalu tampil. Skor dihitung parent dari
// onSelesai + jumlah temuan (tidak ada skor di sini). Generik: tidak ada
// konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Lightbulb } from 'lucide-react'
import { benar, koin, salah } from '../suara'
import { acak } from './util'

export interface SelPerbedaan {
  id: string
  label: string
  kiri: ReactNode
  kanan: ReactNode
}

export interface CariPerbedaanProps {
  item: SelPerbedaan[]
  /** Id item yang berbeda antara kiri dan kanan. */
  beda: string[]
  /** Batas waktu (ms). 0 = tanpa batas. */
  batasWaktuMs?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda: hitung mundur dibekukan. */
  terjeda?: boolean
  onTemukan: (id: string) => void
  onSelesai: (semuaDitemukan: boolean) => void
}

export function CariPerbedaan({
  item,
  beda,
  batasWaktuMs = 0,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onTemukan,
  onSelesai,
}: CariPerbedaanProps) {
  const [ditemukan, setDitemukan] = useState<Set<string>>(new Set())
  const [salahKetuk, setSalahKetuk] = useState(0)
  const [petunjukId, setPetunjukId] = useState<string | null>(null)
  const [sisaMs, setSisaMs] = useState(batasWaktuMs)

  const selesaiRef = useRef(false)
  // Jeda: hitung mundur dilewati tiap tick selama terjeda (ref supaya
  // callback interval yang sudah berjalan membaca nilai terbaru).
  const terjedaRef = useRef(false)
  useEffect(() => { terjedaRef.current = terjeda }, [terjeda])
  const timerPetunjukRef = useRef<number | null>(null)
  const ditemukanRef = useRef(ditemukan)
  ditemukanRef.current = ditemukan
  const onSelesaiRef = useRef(onSelesai)
  onSelesaiRef.current = onSelesai
  const onTemukanRef = useRef(onTemukan)
  onTemukanRef.current = onTemukan

  const kunciItem = item.map((i) => i.id).join(',')
  const kunciBeda = beda.join(',')

  // Set item baru = mulai dari nol lagi.
  useEffect(() => {
    setDitemukan(new Set())
    setSalahKetuk(0)
    setPetunjukId(null)
    setSisaMs(batasWaktuMs)
    selesaiRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciItem, kunciBeda])

  useEffect(
    () => () => {
      if (timerPetunjukRef.current) window.clearTimeout(timerPetunjukRef.current)
    },
    [],
  )

  // Timer hitung mundur (dibekukan selama jeda).
  useEffect(() => {
    if (batasWaktuMs <= 0 || selesaiRef.current) return
    const id = window.setInterval(() => {
      if (terjedaRef.current) return
      setSisaMs((s) => Math.max(0, s - 200))
    }, 200)
    return () => window.clearInterval(id)
  }, [batasWaktuMs])

  const selesaikan = (semua: boolean) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    if (semua) {
      benar()
      koin()
    }
    onSelesaiRef.current(semua)
  }

  useEffect(() => {
    if (batasWaktuMs > 0 && sisaMs <= 0 && !selesaiRef.current) {
      selesaikan(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisaMs, batasWaktuMs])

  const tampilkanPetunjuk = () => {
    const belum = beda.filter((id) => !ditemukanRef.current.has(id))
    if (belum.length === 0) return
    const pilih = acak(belum)[0]
    setPetunjukId(pilih)
    if (timerPetunjukRef.current) window.clearTimeout(timerPetunjukRef.current)
    timerPetunjukRef.current = window.setTimeout(() => setPetunjukId(null), 2500)
  }

  const ketukKanan = (id: string) => {
    if (disabled || selesaiRef.current) return
    if (ditemukanRef.current.has(id)) return
    if (beda.includes(id)) {
      const baru = new Set(ditemukanRef.current)
      baru.add(id)
      setDitemukan(baru)
      benar()
      koin()
      onTemukanRef.current(id)
      if (baru.size >= beda.length) selesaikan(true)
    } else {
      salah()
      const baru = salahKetuk + 1
      setSalahKetuk(baru)
      if (baru >= 2) tampilkanPetunjuk()
    }
  }

  const persenWaktu = batasWaktuMs > 0 ? (sisaMs / batasWaktuMs) * 100 : 100
  const detik = Math.ceil(sisaMs / 1000)

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-beda-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .aia-gi-beda-sisi { border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: var(--card, #fff); padding: 12px; }
        .aia-gi-beda-sisi h3 { margin: 0 0 10px; font-size: 15px; }
        .aia-gi-beda-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
        .aia-gi-beda-sel { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 64px; min-width: 56px; padding: 8px 4px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-size: 13px; font-weight: 600; }
        button.aia-gi-beda-sel { cursor: pointer; touch-action: manipulation; }
        .aia-gi-beda-sel.ditemukan { border-color: var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 16%, var(--card, #fff)); }
        .aia-gi-beda-sel.petunjuk { animation: aia-gi-beda-kilau 0.6s ease-in-out infinite alternate; outline: 3px solid #b45309; }
        @keyframes aia-gi-beda-kilau { from { transform: scale(1); } to { transform: scale(1.08); } }
        @media (prefers-reduced-motion: reduce) { .aia-gi-beda-sel.petunjuk { animation: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres cari perbedaan">
        <span className="aia-stat">
          Ditemukan {ditemukan.size}/{beda.length}
        </span>
        <span className="aia-stat">Ketukan salah {salahKetuk}</span>
        {batasWaktuMs > 0 && (
          <span className="aia-stat" aria-label={`Sisa waktu ${detik} detik`}>
            ⏱ {detik} detik
          </span>
        )}
      </div>

      {batasWaktuMs > 0 && (
        <div
          className="aia-progress"
          role="progressbar"
          aria-valuenow={detik}
          aria-valuemin={0}
          aria-valuemax={Math.ceil(batasWaktuMs / 1000)}
          aria-label="Sisa waktu"
        >
          <span style={{ width: `${persenWaktu}%` }} />
        </div>
      )}

      <div className="aia-gi-beda-panel">
        <div className="aia-gi-beda-sisi">
          <h3>Panel kiri — contoh</h3>
          <div className="aia-gi-beda-grid">
            {item.map((s) => (
              <div key={s.id} className="aia-gi-beda-sel" aria-label={s.label}>
                {s.kiri}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="aia-gi-beda-sisi">
          <h3>Panel kanan — ketuk yang berbeda!</h3>
          <div className="aia-gi-beda-grid">
            {item.map((s) => {
              const ketemu = ditemukan.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`aia-gi-beda-sel${ketemu ? ' ditemukan' : ''}${petunjukId === s.id ? ' petunjuk' : ''}`}
                  disabled={disabled || ketemu || selesaiRef.current}
                  aria-label={ketemu ? `${s.label} sudah ditemukan` : `Sel: ${s.label}`}
                  onClick={() => ketukKanan(s.id)}
                >
                  {s.kanan}
                  <span>{s.label}</span>
                  {ketemu && <Check aria-hidden="true" style={{ width: 16, height: 16 }} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="aia-actions" style={{ justifyContent: 'space-between' }}>
        <p className="aia-muted" style={{ margin: 0 }}>
          {ditemukan.size >= beda.length
            ? 'Semua perbedaan ditemukan!'
            : 'Bandingkan kedua panel, lalu ketuk sel yang berbeda di panel kanan.'}
        </p>
        {(modeSatuKetukan || salahKetuk >= 2) && ditemukan.size < beda.length && (
          <button
            type="button"
            className="aia-btn aia-btn-ghost"
            style={{ minHeight: 44 }}
            onClick={tampilkanPetunjuk}
          >
            <Lightbulb aria-hidden="true" /> Petunjuk
          </button>
        )}
      </div>
    </div>
  )
}
