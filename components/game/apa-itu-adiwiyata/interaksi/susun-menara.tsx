// SusunMenara — menara mulai kosong; di tiap giliran tampilkan 2 kartu
// lapisan kandidat (satu benar = lapisan berikutnya, satu salah).
// Ketuk kartu yang benar untuk menumpuknya; kartu salah diganti kandidat baru.
// Jenis lapisan berselang-seling cokelat/hijau. Generik: tanpa konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Layers } from 'lucide-react'
import { benar, getar, koin, salah } from '../suara'
import { acak, clamp, useKurangiAnimasi } from './util'
import { EfekBenar, EfekSalah } from './umpan-balik'

export interface LapisanMenara {
  id: string
  label: string
  jenis: 'cokelat' | 'hijau'
  ikon?: ReactNode
}

export interface SusunMenaraProps {
  /** Urutan benar = urutan array, jenis berselang-seling cokelat/hijau. */
  lapisan: LapisanMenara[]
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda: panggilan selesai ditunda sampai lanjut. */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

const WARNA_LAPISAN: Record<LapisanMenara['jenis'], string> = {
  cokelat: '#8b5a2b',
  hijau: '#2f7d4f',
}

export function SusunMenara({ lapisan, modeSatuKetukan = false, disabled = false, terjeda = false, onSelesai }: SusunMenaraProps) {
  const kurangi = useKurangiAnimasi()
  const [tertumpuk, setTertumpuk] = useState(0)
  const [kandidat, setKandidat] = useState<LapisanMenara[]>([])
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
  const tertumpukRef = useRef(tertumpuk)
  tertumpukRef.current = tertumpuk
  const salahRef = useRef(jumlahSalah)
  salahRef.current = jumlahSalah

  /** Kandidat untuk giliran ke-n: lapisan benar berikutnya + satu lapisan salah. */
  const buatKandidat = (n: number): LapisanMenara[] => {
    const benarBerikut = lapisan[n]
    if (!benarBerikut) return []
    const salahKandidat = lapisan.filter((l, i) => i !== n)
    if (salahKandidat.length === 0) return [benarBerikut]
    const salahSatu = acak(salahKandidat)[0]
    return acak([benarBerikut, salahSatu])
  }

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  // Daftar lapisan berubah = mulai dari nol lagi.
  useEffect(() => {
    setTertumpuk(0)
    setKandidat(buatKandidat(0))
    setJumlahSalah(0)
    setSalahTerakhir(false)
    setSelesai(false)
    selesaiRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lapisan])

  const ketukKandidat = (id: string) => {
    if (disabled || selesaiRef.current) return
    const n = tertumpukRef.current
    const benarBerikut = lapisan[n]
    if (!benarBerikut) return
    if (id === benarBerikut.id) {
      const baru = n + 1
      setTertumpuk(baru)
      setSalahTerakhir(false)
      benar()
      getar(15)
      if (baru >= lapisan.length) {
        selesaiRef.current = true
        setSelesai(true)
        koin()
        const dendaPerSalah = lapisan.length > 0 ? 100 / lapisan.length : 0
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
      } else {
        setKandidat(buatKandidat(baru))
      }
    } else {
      salah()
      getar([40, 40, 40])
      setJumlahSalah((s) => s + 1)
      setSalahTerakhir(true)
      // Ganti kartu salah itu dengan kandidat baru (bukan lapisan benar).
      setKandidat((lama) => {
        const pengganti = lapisan.filter(
          (l) => l.id !== benarBerikut.id && !lama.some((k) => k.id === l.id && k.id !== id),
        )
        if (pengganti.length === 0) return lama
        const baru = acak(pengganti)[0]
        return acak(lama.map((k) => (k.id === id ? baru : k)))
      })
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setSalahTerakhir(false), 2500)
    }
  }

  const skorAkhir = clamp(
    Math.round(100 - jumlahSalah * (lapisan.length > 0 ? 100 / lapisan.length : 0)),
    0,
    100,
  )

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <style>{`
        .aia-gi-menara { display: flex; flex-direction: column-reverse; align-items: center; gap: 4px; min-height: 120px; padding: 12px; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: var(--card, #fff); }
        .aia-gi-menara-lapisan { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; max-width: 260px; min-height: 36px; border-radius: 8px; color: #fff; font-weight: 700; font-size: 14px; padding: 6px 10px; animation: aia-gi-menara-masuk .25s ease; }
        @keyframes aia-gi-menara-masuk { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .aia-gi-menara-kosong { color: var(--foreground, #111); opacity: .6; font-weight: 600; }
        .aia-gi-menara-kartu { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 64px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; text-align: left; cursor: pointer; touch-action: manipulation; transition: transform .15s ease; }
        .aia-gi-menara-kartu:active { transform: scale(.97); }
        @media (hover: hover) { .aia-gi-menara-kartu:hover:not(:disabled) { transform: scale(1.01); box-shadow: 0 4px 14px rgba(0,0,0,.12); } }
        .aia-gi-menara-kartu:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-menara-kartu:disabled { cursor: default; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-menara-lapisan { animation: none; } .aia-gi-menara-kartu { transition: none; } .aia-gi-menara-kartu:active { transform: none; } }
      `}</style>

      <EfekBenar tampil={selesai} label="Menara selesai!" />

      <div className="aia-stats" aria-label="Progres menara">
        <span className="aia-stat">
          <Layers aria-hidden="true" /> Lapisan {tertumpuk} dari {lapisan.length}
        </span>
        <span className="aia-stat">Ketukan salah: {jumlahSalah}</span>
      </div>

      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={tertumpuk}
        aria-valuemin={0}
        aria-valuemax={lapisan.length}
        aria-label="Progres menara"
      >
        <span style={{ width: `${lapisan.length > 0 ? (tertumpuk / lapisan.length) * 100 : 0}%` }} />
      </div>

      {/* Visual menara yang tumbuh (lapisan bawah dulu). */}
      <div className="aia-gi-menara" aria-label={`Menara: ${tertumpuk} dari ${lapisan.length} lapisan tertumpuk`}>
        {tertumpuk === 0 && (
          <span className="aia-gi-menara-kosong">Menara masih kosong — mulai menumpuk!</span>
        )}
        {lapisan.slice(0, tertumpuk).map((l) => (
          <div
            key={l.id}
            className="aia-gi-menara-lapisan"
            style={{ background: WARNA_LAPISAN[l.jenis] }}
          >
            <Check aria-hidden="true" />
            {l.ikon}
            {l.label}
          </div>
        ))}
      </div>

      {selesai ? (
        <p style={{ textAlign: 'center', margin: 0 }}>
          <strong>Menara selesai!</strong> Skor: {skorAkhir}
        </p>
      ) : (
        <p className="aia-muted" style={{ margin: 0 }}>
          Ketuk lapisan yang benar untuk menumpuknya — cokelat dan hijau berselang-seling.
        </p>
      )}

      <EfekSalah tampil={salahTerakhir} petunjuk="Bukan lapisan itu — coba kartu yang satunya." />

      {!selesai && (
        <div className="aia-stack" role="group" aria-label="Kandidat lapisan">
          {kandidat.map((k) => (
            <button
              key={k.id}
              type="button"
              className="aia-gi-menara-kartu"
              style={{
                minHeight: modeSatuKetukan ? 72 : 64,
                borderLeft: `6px solid ${WARNA_LAPISAN[k.jenis]}`,
              }}
              disabled={disabled}
              aria-label={`Lapisan: ${k.label}`}
              onClick={() => ketukKandidat(k.id)}
            >
              {k.ikon}
              <span>{k.label}</span>
              <span className="aia-muted" style={{ marginLeft: 'auto' }}>
                {k.jenis === 'cokelat' ? 'Cokelat' : 'Hijau'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
