// Umpan balik bersama untuk interaksi gestur: efek benar/salah, petunjuk
// Magi, tangan penunjuk tutorial, dan pemetaan mode satu-ketukan.
// Semua efek hanya CSS (tanpa aset); suara berasal dari ../suara.ts.
// Tidak ada teks misi spesifik di sini — petunjuk diisi lewat props.

'use client'

import { Hand, Volume2 } from 'lucide-react'
import { playMumble } from '../suara'
import { useKurangiAnimasi } from './util'

/** Opsi aksesibilitas yang dipakai semua komponen interaksi. */
export interface ModeAksesibilitas {
  /** Bila true, gestur rumit diganti ketuk (lihat PETA_GERAKAN_ALTERNATIF). */
  modeSatuKetukan: boolean
  /** Bila true, animasi dikurangi (biasanya dari prefers-reduced-motion). */
  kurangiAnimasi: boolean
}

/**
 * Pemetaan gestur rumit ke alternatif satu-ketukan.
 * Dipakai komponen gestur saat prop modeSatuKetukan = true.
 */
export const PETA_GERAKAN_ALTERNATIF: Record<string, string> = {
  seret: 'Ketuk benda, lalu ketuk target.',
  lempar: 'Ketuk target untuk melempar.',
  tahan: 'Ketuk sekali untuk mengisi otomatis.',
  putar: 'Ketuk dua kali untuk memutar 90°.',
}

const DAUN_WARNA = ['#2f7d4f', '#4d8a4f', '#8bc34a', '#eab308']

/**
 * Efek aksi benar: confetti daun jatuh + sparkle, lalu label "Benar!".
 * Bila kurangi animasi aktif, hanya tampil label statis.
 * Letakkan di dalam wadah position: relative; efek menutupi wadah.
 */
export function EfekBenar({ tampil, label = 'Benar!' }: { tampil: boolean; label?: string }) {
  const kurangi = useKurangiAnimasi()
  if (!tampil) return null
  const daun = Array.from({ length: 14 }, (_, i) => ({
    kiri: (i * 37 + 11) % 100,
    tunda: (i % 7) * 0.12,
    durasi: 1.6 + (i % 5) * 0.25,
    warna: DAUN_WARNA[i % DAUN_WARNA.length],
    ukuran: 10 + (i % 3) * 4,
  }))
  return (
    <div className="aia-gi-efek" aria-hidden="true">
      <style>{`
        .aia-gi-efek { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 5; }
        .aia-gi-efek-label { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); padding: 6px 14px; border-radius: 999px; background: #2f7d4f; color: #fff; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
        .aia-gi-daun { position: absolute; top: -14px; border-radius: 50% 0 50% 50%; animation: aia-gi-jatuh linear forwards; }
        @keyframes aia-gi-jatuh { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(160px) rotate(320deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .aia-gi-daun { display: none; } }
      `}</style>
      {!kurangi &&
        daun.map((d, i) => (
          <span
            key={i}
            className="aia-gi-daun"
            style={{
              left: `${d.kiri}%`,
              background: d.warna,
              width: d.ukuran,
              height: Math.round(d.ukuran * 0.7),
              animationDelay: `${d.tunda}s`,
              animationDuration: `${d.durasi}s`,
            }}
          />
        ))}
      <span className="aia-gi-efek-label">✓ {label}</span>
    </div>
  )
}

/**
 * Efek aksi salah: panel goyang + petunjuk Magi (bila diisi).
 * Tanpa hukuman keras — hanya akibat visual yang jelas dan 1 kalimat petunjuk.
 */
export function EfekSalah({ tampil, petunjuk }: { tampil: boolean; petunjuk?: string }) {
  if (!tampil) return null
  return (
    <div className="aia-gi-salah" role="alert">
      <style>{`
        .aia-gi-salah { border: 1px solid #b83232; border-left: 4px solid #b83232; border-radius: 12px; background: color-mix(in srgb, #b83232 8%, var(--card, #fff)); padding: 12px 14px; animation: aia-gi-goyang .3s ease; }
        @keyframes aia-gi-goyang { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @media (prefers-reduced-motion: reduce) { .aia-gi-salah { animation: none; } }
      `}</style>
      <strong>Belum tepat.</strong>
      {petunjuk ? <PetunjukMagi teks={petunjuk} /> : null}
    </div>
  )
}

/** Balon petunjuk 1 kalimat dari Magi, dengan tombol dengarkan gumamnya. */
export function PetunjukMagi({ teks }: { teks: string }) {
  return (
    <div className="aia-gi-magi">
      <style>{`
        .aia-gi-magi { display: flex; align-items: flex-start; gap: 10px; margin-top: 8px; padding: 10px 12px; border-radius: 12px; background: var(--card, #fff); border: 1px solid var(--line, #e5e7eb); }
        .aia-gi-magi-avatar { flex: none; width: 36px; height: 36px; border-radius: 50%; background: #2f7d4f; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
        .aia-gi-magi p { margin: 2px 0 0; }
      `}</style>
      <span className="aia-gi-magi-avatar" aria-hidden="true">
        M
      </span>
      <div style={{ flex: 1 }}>
        <strong>Magi</strong>
        <p>{teks}</p>
      </div>
      <button
        type="button"
        className="aia-icon-btn"
        aria-label="Dengarkan suara Magi"
        onClick={() => playMumble('Magi')}
      >
        <Volume2 aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Tangan penunjuk animasi untuk tutorial tahap awal: menunjuk target sambil
 * memantul pelan, dengan label singkat. Parent yang menempatkannya
 * (biasanya position: absolute di dekat target). Bila kurangi animasi
 * aktif, tampil sebagai panah statis.
 */
export function TanganPenunjuk({ label, tampil = true }: { label: string; tampil?: boolean }) {
  const kurangi = useKurangiAnimasi()
  if (!tampil) return null
  return (
    <div className="aia-gi-tangan" aria-hidden="true">
      <style>{`
        .aia-gi-tangan { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; color: #b45309; font-weight: 800; font-size: 13px; pointer-events: none; z-index: 6; }
        .aia-gi-tangan svg { width: 32px; height: 32px; animation: aia-gi-tunjuk 1s ease-in-out infinite alternate; }
        @keyframes aia-gi-tunjuk { from { transform: translateY(0); } to { transform: translateY(8px); } }
        @media (prefers-reduced-motion: reduce) { .aia-gi-tangan svg { animation: none; } }
      `}</style>
      <Hand aria-hidden="true" />
      <span>{kurangi ? `▼ ${label}` : label}</span>
    </div>
  )
}
