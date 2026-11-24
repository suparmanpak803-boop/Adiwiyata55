// HiddenObject — cari dan ketuk objek di area dalam batas waktu.
// Objek yang ditemukan diberi tanda; ketukan kosong dua kali memunculkan
// sorotan petunjuk di salah satu objek yang belum ditemukan (kesulitan
// adaptif). Mode satu-ketukan: objek lebih besar + tombol petunjuk selalu
// tampil. Generik: tidak ada konten misi di sini.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Lightbulb } from 'lucide-react'
import { benar, koin, salah } from '../suara'
import { acak } from './util'

export interface ObjekTersembunyi {
  id: string
  label: string
  /** Posisi persen 0..100 dalam area. */
  x: number
  /** Posisi persen 0..100 dalam area. */
  y: number
  ikon?: ReactNode
}

export interface HiddenObjectProps {
  objek: ObjekTersembunyi[]
  /** Batas waktu (ms). 0 atau tidak diisi = tanpa batas. */
  batasWaktuMs?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda: hitung mundur dibekukan. */
  terjeda?: boolean
  onTemukan: (id: string) => void
  onSelesai: (semuaDitemukan: boolean) => void
  onWaktuHabis?: () => void
}

export function HiddenObject({
  objek,
  batasWaktuMs = 0,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onTemukan,
  onSelesai,
  onWaktuHabis,
}: HiddenObjectProps) {
  const [ditemukan, setDitemukan] = useState<Set<string>>(new Set())
  const [sisaMs, setSisaMs] = useState(batasWaktuMs)
  const [salahKetuk, setSalahKetuk] = useState(0)
  const [petunjukId, setPetunjukId] = useState<string | null>(null)

  const selesaiRef = useRef(false)
  // Jeda: hitung mundur dilewati tiap tick selama terjeda (ref supaya
  // callback interval yang sudah berjalan membaca nilai terbaru).
  const terjedaRef = useRef(false)
  useEffect(() => { terjedaRef.current = terjeda }, [terjeda])
  const timerPetunjukRef = useRef<number | null>(null)
  const ditemukanRef = useRef(ditemukan)
  ditemukanRef.current = ditemukan

  // Misi baru (daftar objek berubah) = mulai dari nol lagi.
  useEffect(() => {
    setDitemukan(new Set())
    setSisaMs(batasWaktuMs)
    setSalahKetuk(0)
    setPetunjukId(null)
    selesaiRef.current = false
  }, [objek, batasWaktuMs])

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
    onSelesai(semua)
  }

  useEffect(() => {
    if (batasWaktuMs > 0 && sisaMs <= 0 && !selesaiRef.current) {
      onWaktuHabis?.()
      selesaikan(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisaMs, batasWaktuMs])

  const tampilkanPetunjuk = () => {
    const belum = objek.filter((o) => !ditemukanRef.current.has(o.id))
    if (belum.length === 0) return
    const pilih = acak(belum)[0]
    setPetunjukId(pilih.id)
    if (timerPetunjukRef.current) window.clearTimeout(timerPetunjukRef.current)
    timerPetunjukRef.current = window.setTimeout(() => setPetunjukId(null), 2500)
  }

  const temukan = (id: string) => {
    if (disabled || selesaiRef.current || ditemukanRef.current.has(id)) return
    const baru = new Set(ditemukanRef.current)
    baru.add(id)
    setDitemukan(baru)
    benar()
    koin()
    onTemukan(id)
    if (baru.size >= objek.length) selesaikan(true)
  }

  const ketukKosong = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || selesaiRef.current) return
    if ((e.target as HTMLElement).closest('button')) return
    salah()
    const baru = salahKetuk + 1
    setSalahKetuk(baru)
    if (baru >= 2) tampilkanPetunjuk()
  }

  const persenWaktu = batasWaktuMs > 0 ? (sisaMs / batasWaktuMs) * 100 : 100
  const detik = Math.ceil(sisaMs / 1000)
  const ukuranObjek = modeSatuKetukan ? 56 : 44

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-cari-area { position: relative; aspect-ratio: 4 / 3; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; overflow: hidden; background-color: var(--card, #fff); background-image: radial-gradient(rgba(47,125,79,.14) 1.5px, transparent 1.5px); background-size: 22px 22px; touch-action: manipulation; }
        .aia-gi-cari-objek { position: absolute; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid transparent; background: color-mix(in srgb, var(--card, #fff) 70%, transparent); color: var(--foreground, #111); opacity: .55; cursor: pointer; transition: opacity .15s ease, transform .15s ease; }
        .aia-gi-cari-objek.ditemukan { opacity: 1; border-color: var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 16%, var(--card, #fff)); }
        .aia-gi-cari-objek.petunjuk { animation: aia-gi-kilau 0.6s ease-in-out infinite alternate; outline: 3px solid #b45309; }
        @keyframes aia-gi-kilau { from { transform: translate(-50%, -50%) scale(1); } to { transform: translate(-50%, -50%) scale(1.18); } }
        .aia-gi-cari-tanda { position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; background: #2f7d4f; color: #fff; display: flex; align-items: center; justify-content: center; }
        .aia-gi-cari-tanda svg { width: 13px; height: 13px; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-cari-objek { transition: none; } .aia-gi-cari-objek.petunjuk { animation: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres pencarian">
        <span className="aia-stat">
          Ditemukan {ditemukan.size}/{objek.length}
        </span>
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

      <div
        className="aia-gi-cari-area"
        role="group"
        aria-label="Area pencarian: ketuk objek yang kamu temukan"
        onPointerDown={ketukKosong}
      >
        {objek.map((o) => {
          const ketemu = ditemukan.has(o.id)
          return (
            <button
              key={o.id}
              type="button"
              className={`aia-gi-cari-objek${ketemu ? ' ditemukan' : ''}${petunjukId === o.id ? ' petunjuk' : ''}`}
              style={{
                left: `${o.x}%`,
                top: `${o.y}%`,
                width: ukuranObjek,
                height: ukuranObjek,
                minWidth: ukuranObjek,
                minHeight: ukuranObjek,
              }}
              disabled={disabled || ketemu || selesaiRef.current}
              aria-label={ketemu ? `${o.label} sudah ditemukan` : `Objek: ${o.label}`}
              onClick={() => temukan(o.id)}
            >
              {o.ikon ?? <span style={{ fontWeight: 800 }}>{o.label.slice(0, 1)}</span>}
              {ketemu && (
                <span className="aia-gi-cari-tanda" aria-hidden="true">
                  <Check aria-hidden="true" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="aia-actions" style={{ justifyContent: 'space-between' }}>
        <p className="aia-muted" style={{ margin: 0 }}>
          {ditemukan.size >= objek.length
            ? 'Semua objek ditemukan!'
            : 'Cari dan ketuk objek yang tersembunyi di area.'}
        </p>
        {(modeSatuKetukan || salahKetuk >= 2) && ditemukan.size < objek.length && (
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
