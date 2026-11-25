// PanenKetuk — grid petak; tiap giliran satu objek muncul di petak acak.
// Ketuk objek yang MATANG saja untuk memanen; yang BELUM matang = salah.
// Membiarkan objek matang lewat = terlewat (tanpa hukuman keras).
// Skor 0–100 = persen objek matang yang dipanen, dikurangi 5 per
// ketukan salah (seperti TangkapJatuh) — mengetuk semua objek tidak
// lagi memberi 100. Mode satu-ketukan: giliran 2× lebih lama.
// Generik: tanpa konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Leaf, Sprout } from 'lucide-react'
import { getar, koin, panen, salah } from '../suara'
import { acak, clamp } from './util'
import { EfekSalah } from './umpan-balik'

export interface ObjekPanen {
  id: string
  label: string
  matang: boolean
  ikon?: ReactNode
}

export interface PanenKetukProps {
  objek: ObjekPanen[]
  giliranMs?: number
  jumlahGiliran?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Jeda: bekukan timer giliran (dijadwalkan ulang dengan sisa waktu saat lanjut). */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

const JUMLAH_PETAK = 6

interface Aktif {
  objek: ObjekPanen
  petak: number
}

export function PanenKetuk({
  objek,
  giliranMs = 2500,
  jumlahGiliran = 8,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
}: PanenKetukProps) {
  const durasi = modeSatuKetukan ? giliranMs * 2 : giliranMs
  const total = Math.max(1, jumlahGiliran)
  const [ronde, setRonde] = useState(0)
  const [aktif, setAktif] = useState<Aktif | null>(null)
  const [panenBenar, setPanenBenar] = useState(0)
  const [jumlahSalah, setJumlahSalah] = useState(0)
  const [terlewat, setTerlewat] = useState(0)
  const [pesanSalah, setPesanSalah] = useState(false)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const rondeRef = useRef(ronde)
  rondeRef.current = ronde
  const aktifRef = useRef(aktif)
  aktifRef.current = aktif
  const panenRef = useRef(panenBenar)
  panenRef.current = panenBenar
  const salahRef = useRef(0)
  const matangRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const timerPesanRef = useRef<number | null>(null)
  const terjedaRef = useRef(terjeda)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])
  // Sisa waktu giliran yang sedang berjalan (untuk dibekukan saat jeda).
  const giliranMulaiRef = useRef(0)
  const giliranSisaRef = useRef(durasi)

  const bersihkanTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(
    () => () => {
      bersihkanTimer()
      if (timerPesanRef.current) window.clearTimeout(timerPesanRef.current)
    },
    [],
  )

  // Daftar objek / jumlah giliran berubah = mulai dari nol lagi.
  useEffect(() => {
    bersihkanTimer()
    setRonde(0)
    setAktif(null)
    setPanenBenar(0)
    setJumlahSalah(0)
    salahRef.current = 0
    setTerlewat(0)
    setPesanSalah(false)
    setSelesai(false)
    selesaiRef.current = false
    matangRef.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objek, jumlahGiliran])

  // Akhir giliran tanpa ketukan (dipakai timer giliran & saat lanjut dari jeda).
  const akhiriGiliran = () => {
    if (aktifRef.current?.objek.matang) setTerlewat((t) => t + 1)
    setAktif(null)
    setRonde((r) => r + 1)
  }

  // Tiap giliran: munculkan satu objek di petak acak.
  useEffect(() => {
    if (selesaiRef.current || objek.length === 0) return
    if (ronde >= total) {
      selesaiRef.current = true
      setSelesai(true)
      // B-13: ketukan salah mengurangi skor (−5 per salah ketuk).
      const skor =
        matangRef.current > 0
          ? clamp(Math.round((panenRef.current / matangRef.current) * 100 - 5 * salahRef.current), 0, 100)
          : 100
      onSelesai(skor)
      return
    }
    const pilihObjek = acak(objek)[0]
    const petak = Math.floor(Math.random() * JUMLAH_PETAK)
    if (pilihObjek.matang) matangRef.current += 1
    setAktif({ objek: pilihObjek, petak })
    giliranSisaRef.current = durasi
    giliranMulaiRef.current = performance.now()
    // Bila sedang terjeda, jangan jalankan timer; dijadwalkan ulang
    // dengan sisa waktu saat jeda selesai.
    if (terjedaRef.current) return bersihkanTimer
    timerRef.current = window.setTimeout(akhiriGiliran, durasi)
    return bersihkanTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ronde, total, durasi])

  // Jeda: bekukan timer giliran — simpan sisa waktu saat jeda mulai,
  // jadwalkan ulang dengan sisa itu saat lanjut.
  useEffect(() => {
    if (terjeda) {
      if (timerRef.current) {
        const berlalu = performance.now() - giliranMulaiRef.current
        giliranSisaRef.current = Math.max(0, durasi - berlalu)
        bersihkanTimer()
      }
    } else if (aktifRef.current && !selesaiRef.current && !timerRef.current) {
      giliranMulaiRef.current = performance.now()
      timerRef.current = window.setTimeout(akhiriGiliran, giliranSisaRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terjeda])

  const ketukPetak = (petak: number) => {
    if (disabled || selesaiRef.current) return
    const a = aktifRef.current
    if (!a || a.petak !== petak) return
    bersihkanTimer()
    setAktif(null)
    if (a.objek.matang) {
      panen()
      koin()
      getar(15)
      setPanenBenar((n) => n + 1)
      setPesanSalah(false)
    } else {
      salah()
      getar([40, 40, 40])
      salahRef.current += 1
      setJumlahSalah((n) => n + 1)
      setPesanSalah(true)
      if (timerPesanRef.current) window.clearTimeout(timerPesanRef.current)
      timerPesanRef.current = window.setTimeout(() => setPesanSalah(false), 2000)
    }
    setRonde((r) => r + 1)
  }

  const skorAkhir =
    matangRef.current > 0
      ? clamp(Math.round((panenBenar / matangRef.current) * 100 - 5 * jumlahSalah), 0, 100)
      : 100

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-panen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .aia-gi-panen-petak { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 84px; padding: 10px 6px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; font-size: 13px; cursor: pointer; touch-action: manipulation; transition: transform .15s ease, outline .15s ease; }
        @media (hover: hover) { .aia-gi-panen-petak:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 4px 14px rgba(0,0,0,.12); } }
        .aia-gi-panen-petak:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-panen-petak.aktif { outline: 3px solid var(--green, #2f7d4f); outline-offset: 1px; background: color-mix(in srgb, #2f7d4f 10%, var(--card, #fff)); }
        .aia-gi-panen-petak.aktif:active { transform: scale(.95); }
        .aia-gi-panen-petak:disabled { cursor: default; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-panen-petak { transition: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres panen">
        <span className="aia-stat">
          <Sprout aria-hidden="true" /> Giliran {Math.min(ronde + 1, total)}/{total}
        </span>
        <span className="aia-stat">
          <Leaf aria-hidden="true" /> Dipanen: {panenBenar}
        </span>
        <span className="aia-stat">Terlewat: {terlewat}</span>
      </div>

      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={Math.min(ronde, total)}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Progres giliran"
      >
        <span style={{ width: `${(Math.min(ronde, total) / total) * 100}%` }} />
      </div>

      <div className="aia-gi-panen-grid" role="group" aria-label="Petak kebun">
        {Array.from({ length: JUMLAH_PETAK }, (_, petak) => {
          const a = aktif && aktif.petak === petak ? aktif : null
          return (
            <button
              key={petak}
              type="button"
              className={`aia-gi-panen-petak${a ? ' aktif' : ''}`}
              disabled={disabled || selesai || !a}
              aria-label={a ? `Objek: ${a.objek.label}${a.objek.matang ? ' (matang, ketuk untuk memanen)' : ' (belum matang)'}` : `Petak ${petak + 1} kosong`}
              onClick={() => ketukPetak(petak)}
            >
              {a ? (
                <>
                  {a.objek.ikon ?? <Sprout aria-hidden="true" />}
                  <span>{a.objek.label}</span>
                  <small className="aia-muted">{a.objek.matang ? 'Matang!' : 'Belum matang'}</small>
                </>
              ) : (
                <span className="aia-muted" aria-hidden="true">
                  ·
                </span>
              )}
            </button>
          )
        })}
      </div>

      <EfekSalah tampil={pesanSalah} petunjuk="Itu belum matang — panen hanya yang sudah matang." />

      {selesai ? (
        <p style={{ textAlign: 'center', margin: 0 }}>
          <strong>Panen selesai!</strong> Skor: {skorAkhir} · Salah ketuk: {jumlahSalah}
        </p>
      ) : (
        <p className="aia-muted" style={{ margin: 0 }}>
          Ketuk hanya objek yang <strong>matang</strong> sebelum giliran berakhir
          {modeSatuKetukan ? ' (giliran 2× lebih lama)' : ''}.
        </p>
      )}
    </div>
  )
}
