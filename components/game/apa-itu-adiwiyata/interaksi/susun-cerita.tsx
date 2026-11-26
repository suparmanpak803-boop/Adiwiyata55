// SusunCerita — susun frame cerita ke storyboard sesuai urutan yang benar.
// Frame diacak; pemain mengetuk kartu sesuai urutan yang menurutnya benar.
// Ketukan yang bukan frame benar berikutnya = salah (kartu kembali).
// Kartu `pengecoh` (opsional) ikut diacak ke dalam tumpukan kartu, tapi
// tidak pernah masuk storyboard: mengetuknya selalu salah — dipakai
// Eco-Communication untuk menampilkan frame dari konsep yang salah,
// supaya pemain benar-benar memilih konsep yang tepat, bukan hanya
// mengurutkan frame yang semuanya benar. Generik: tidak ada konten misi di sini.

'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Check, RotateCcw } from 'lucide-react'
import { benar, getar, klik, koin, salah } from '../suara'
import { acak, clamp, useKurangiAnimasi } from './util'
import { EfekBenar, EfekSalah, PetunjukMagi } from './umpan-balik'

export interface FrameCerita {
  id: string
  teks: string
  ikon?: ReactNode
}

export interface SusunCeritaProps {
  /** Urutan benar = urutan array. */
  frame: FrameCerita[]
  /** Kartu pengecoh: ikut diacak, tapi tidak pernah jadi frame berikutnya
   * (mengetuknya selalu salah). */
  pengecoh?: FrameCerita[]
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda: panggilan selesai ditunda sampai lanjut. */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

export function SusunCerita({ frame, pengecoh, modeSatuKetukan = false, disabled = false, terjeda = false, onSelesai }: SusunCeritaProps) {
  const kurangi = useKurangiAnimasi()
  // Tumpukan kartu = frame benar + pengecoh (di-memo supaya urutan acak
  // stabil selama daftar frame tidak berubah).
  const semuaKartu = useMemo(() => [...frame, ...(pengecoh ?? [])], [frame, pengecoh])
  const [acakFrame, setAcakFrame] = useState<FrameCerita[]>(() => acak(semuaKartu))
  const [terisi, setTerisi] = useState<string[]>([])
  const [jumlahSalah, setJumlahSalah] = useState(0)
  const [salahTerakhir, setSalahTerakhir] = useState(false)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  // Jeda: panggilan selesai ditunda selama terjeda (ref supaya callback
  // timeout membaca nilai terbaru). Timeout kosmetik (umpan balik salah
  // 2500 ms) dibiarkan jalan — tidak memengaruhi skor.
  const terjedaRef = useRef(false)
  useEffect(() => { terjedaRef.current = terjeda }, [terjeda])
  const terisiRef = useRef(terisi)
  terisiRef.current = terisi
  const salahRef = useRef(jumlahSalah)
  salahRef.current = jumlahSalah

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  // Daftar frame berubah = mulai dari nol lagi.
  useEffect(() => {
    setAcakFrame(acak(semuaKartu))
    setTerisi([])
    setJumlahSalah(0)
    setSalahTerakhir(false)
    setSelesai(false)
    selesaiRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semuaKartu])

  const ulangi = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setAcakFrame(acak(semuaKartu))
    setTerisi([])
    // K-6: "Ulangi" mengacak ulang papan TAPI TIDAK menghapus ketukan
    // salah — kalau jumlah salah di-reset, pemain bisa mengulang tanpa
    // batas sampai selalu mendapat skor 100. Ketukan salah yang sudah
    // terjadi tetap dihitung di skor akhir, jadi skor tetap jujur;
    // pemain tetap bisa menyelesaikan cerita (tanpa jalan buntu).
    setSalahTerakhir(false)
    setSelesai(false)
    selesaiRef.current = false
    klik()
  }

  const ketukKartu = (id: string) => {
    if (disabled || selesaiRef.current) return
    if (terisiRef.current.includes(id)) return
    const berikutnya = frame[terisiRef.current.length]
    if (!berikutnya) return
    if (id === berikutnya.id) {
      const baru = [...terisiRef.current, id]
      setTerisi(baru)
      setSalahTerakhir(false)
      benar()
      getar(15)
      if (baru.length >= frame.length) {
        selesaiRef.current = true
        setSelesai(true)
        koin()
        const dendaPerSalah = frame.length > 0 ? 100 / frame.length : 0
        const skor = clamp(Math.round(100 - salahRef.current * dendaPerSalah), 0, 100)
        if (timerRef.current) window.clearTimeout(timerRef.current)
        // Selesai ditunda selama jeda (cek ulang tiap 100 ms).
        const jadwalkanSelesai = (ms: number) => {
          timerRef.current = window.setTimeout(() => {
            if (terjedaRef.current) { jadwalkanSelesai(100); return }
            onSelesai(skor)
          }, ms)
        }
        jadwalkanSelesai(kurangi ? 60 : 600)
      }
    } else {
      salah()
      getar([40, 40, 40])
      setJumlahSalah((s) => s + 1)
      setSalahTerakhir(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setSalahTerakhir(false), 2500)
    }
  }

  const sisa = acakFrame.filter((f) => !terisi.includes(f.id))
  const skorAkhir = clamp(Math.round(100 - jumlahSalah * (frame.length > 0 ? 100 / frame.length : 0)), 0, 100)

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <style>{`
        .aia-gi-cerita-slot { min-height: 64px; border: 2px dashed var(--line, #e5e7eb); border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; background: var(--card, #fff); color: var(--foreground, #111); }
        .aia-gi-cerita-slot.terisi { border-style: solid; border-color: var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 10%, var(--card, #fff)); }
        /* Gelombang B: nomor memakai #2f7d4f tetap, bukan var(--green) —
           di mode gelap --green = #9fd2ae sehingga teks putih di atasnya
           hanya 1,71:1; #2f7d4f + #fff = 5,04:1 di kedua tema. */
        .aia-gi-cerita-nomor { flex: none; width: 28px; height: 28px; border-radius: 50%; background: #2f7d4f; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
        .aia-gi-cerita-kartu { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 56px; padding: 12px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 600; text-align: left; cursor: pointer; touch-action: manipulation; transition: transform .15s ease, outline .15s ease; }
        .aia-gi-cerita-kartu:active { transform: scale(.97); }
        @media (hover: hover) { .aia-gi-cerita-kartu:hover:not(:disabled) { transform: scale(1.01); box-shadow: 0 4px 14px rgba(0,0,0,.12); } }
        .aia-gi-cerita-kartu:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-cerita-kartu:disabled { opacity: .45; cursor: default; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-cerita-kartu { transition: none; } .aia-gi-cerita-kartu:active { transform: none; } }
      `}</style>

      <EfekBenar tampil={selesai} label="Cerita tersusun!" />

      <div className="aia-stats" aria-label="Progres cerita">
        <span className="aia-stat">
          <BookOpen aria-hidden="true" /> {terisi.length}/{frame.length} frame
        </span>
        <span className="aia-stat">Ketukan salah: {jumlahSalah}</span>
      </div>

      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={terisi.length}
        aria-valuemin={0}
        aria-valuemax={frame.length}
        aria-label="Progres storyboard"
      >
        <span style={{ width: `${frame.length > 0 ? (terisi.length / frame.length) * 100 : 0}%` }} />
      </div>

      {/* Storyboard: slot urutan benar. */}
      <div className="aia-stack" aria-label="Storyboard">
        {frame.map((f, i) => {
          const sudah = terisi[i] === f.id
          return (
            <div key={f.id} className={`aia-gi-cerita-slot${sudah ? ' terisi' : ''}`}>
              <span className="aia-gi-cerita-nomor" aria-hidden="true">
                {sudah ? <Check aria-hidden="true" /> : i + 1}
              </span>
              {sudah ? (
                <span>
                  {f.ikon} {f.teks}
                </span>
              ) : (
                <span className="aia-muted">Frame ke-{i + 1} — ketuk kartu yang cocok</span>
              )}
            </div>
          )
        })}
      </div>

      {selesai ? (
        <p style={{ textAlign: 'center', margin: 0 }}>
          <strong>Cerita selesai!</strong> Skor: {skorAkhir}
        </p>
      ) : (
        <p className="aia-muted" style={{ margin: 0 }}>
          Ketuk kartu di bawah sesuai urutan ceritanya, dari awal sampai akhir.
        </p>
      )}

      <EfekSalah tampil={salahTerakhir} petunjuk="Coba urutan lain — frame itu belum gilirannya." />

      {!selesai && (
        <div className="aia-stack" role="group" aria-label="Kartu frame yang diacak">
          {sisa.map((f) => (
            <button
              key={f.id}
              type="button"
              className="aia-gi-cerita-kartu"
              style={{ minHeight: modeSatuKetukan ? 64 : 56 }}
              disabled={disabled}
              aria-label={`Frame: ${f.teks}`}
              onClick={() => ketukKartu(f.id)}
            >
              {f.ikon}
              <span>{f.teks}</span>
            </button>
          ))}
        </div>
      )}

      {pengecoh && pengecoh.length > 0 && !selesai && (
        <p className="aia-muted" style={{ margin: 0, textAlign: 'center' }}>
          Awas: ada kartu pengecoh dari konsep lain — kartu itu bukan bagian cerita ini, jangan diketuk.
        </p>
      )}

      <PetunjukMagi teks="Susun dari awal cerita sampai akhir — tiap ketukan menaruh kartu ke slot berikutnya." />
      <div className="aia-actions">
        <button
          type="button"
          className="aia-btn aia-btn-ghost"
          style={{ minHeight: 44 }}
          onClick={ulangi}
          disabled={disabled}
        >
          <RotateCcw aria-hidden="true" /> Ulangi
        </button>
      </div>
    </div>
  )
}
