// SimulasiKantin — pesanan datang satu per satu; pemain mengetuk tindakan
// yang benar di antara 3 kartu tindakan (benar + 2 salah, diacak).
// Benar = pelanggan senang; salah atau habis waktu = pelanggan pergi kecewa.
// Mode satu-ketukan: tanpa batas waktu. Generik: tanpa konten misi.

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, User, UtensilsCrossed } from 'lucide-react'
import { benar, getar, koin, salah } from '../suara'
import { acak, clamp } from './util'
import { EfekBenar, EfekSalah } from './umpan-balik'

export interface PesananKantin {
  id: string
  pelanggan: string
  permintaan: string
  tindakanBenar: string
  tindakanSalah: [string, string]
}

export interface SimulasiKantinProps {
  pesanan: PesananKantin[]
  waktuPerPesananMs?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Jeda: bekukan hitung mundur & tunda lanjut ke pesanan berikutnya. */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

export function SimulasiKantin({
  pesanan,
  waktuPerPesananMs = 12000,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
}: SimulasiKantinProps) {
  const tanpaWaktu = modeSatuKetukan
  const [idx, setIdx] = useState(0)
  const [sisaMs, setSisaMs] = useState(waktuPerPesananMs)
  const [benarHitung, setBenarHitung] = useState(0)
  const [hasil, setHasil] = useState<'senang' | 'kecewa' | null>(null)
  // C-33: kenapa pelanggan kecewa — 'salah' (ketuk tindakan yang salah)
  // vs 'waktu' (waktu habis). Hanya bila 'salah' tindakan benar ikut
  // disorot sebagai umpan belajar.
  const [alasanKecewa, setAlasanKecewa] = useState<'salah' | 'waktu' | null>(null)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const idxRef = useRef(idx)
  idxRef.current = idx
  const benarRef = useRef(benarHitung)
  benarRef.current = benarHitung
  const hasilRef = useRef(hasil)
  hasilRef.current = hasil
  const jedaRef = useRef<number | null>(null)
  const terjedaRef = useRef(terjeda)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  useEffect(
    () => () => {
      if (jedaRef.current) window.clearTimeout(jedaRef.current)
    },
    [],
  )

  // Daftar pesanan berubah = mulai dari nol lagi.
  useEffect(() => {
    setIdx(0)
    setSisaMs(waktuPerPesananMs)
    setBenarHitung(0)
    setHasil(null)
    setAlasanKecewa(null)
    setSelesai(false)
    selesaiRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesanan, waktuPerPesananMs])

  const selesaikan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    setSelesai(true)
    const skor = pesanan.length > 0 ? clamp(Math.round((benarRef.current / pesanan.length) * 100), 0, 100) : 0
    onSelesai(skor)
  }

  const lanjut = () => {
    if (selesaiRef.current) return
    const berikut = idxRef.current + 1
    if (berikut >= pesanan.length) {
      selesaikan()
      return
    }
    setIdx(berikut)
    setSisaMs(waktuPerPesananMs)
    setHasil(null)
    setAlasanKecewa(null)
  }

  // Lanjut ke pesanan berikutnya: bila sedang terjeda, tunda sampai jeda selesai.
  const lanjutTertunda = () => {
    if (terjedaRef.current) {
      jedaRef.current = window.setTimeout(lanjutTertunda, 100)
      return
    }
    lanjut()
  }

  const jadwalkanLanjut = () => {
    if (jedaRef.current) window.clearTimeout(jedaRef.current)
    jedaRef.current = window.setTimeout(lanjutTertunda, 1400)
  }

  // Timer hitung mundur per pesanan.
  useEffect(() => {
    if (tanpaWaktu || disabled || selesaiRef.current || hasil) return
    const id = window.setInterval(() => {
      // Jeda: lewati tick supaya sisa waktu tidak berkurang selama jeda.
      if (terjedaRef.current) return
      setSisaMs((s) => Math.max(0, s - 100))
    }, 100)
    return () => window.clearInterval(id)
  }, [tanpaWaktu, disabled, hasil, idx])

  // Waktu habis: pelanggan pergi kecewa.
  useEffect(() => {
    if (tanpaWaktu || selesaiRef.current || hasilRef.current) return
    if (sisaMs <= 0 && pesanan.length > 0) {
      salah()
      getar([40, 40, 40])
      setHasil('kecewa')
      setAlasanKecewa('waktu')
      jadwalkanLanjut()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisaMs, tanpaWaktu])

  const pilihTindakan = (tindakan: string) => {
    if (disabled || selesaiRef.current || hasilRef.current) return
    const aktif = pesanan[idxRef.current]
    if (!aktif) return
    if (tindakan === aktif.tindakanBenar) {
      benar()
      koin()
      getar(15)
      setBenarHitung((n) => n + 1)
      setHasil('senang')
      setAlasanKecewa(null)
    } else {
      salah()
      getar([40, 40, 40])
      setHasil('kecewa')
      setAlasanKecewa('salah')
    }
    jadwalkanLanjut()
  }

  const aktif = pesanan[idx]
  const berikut = pesanan[idx + 1]
  // Di-memo per pesanan: mengacak di badan render membuat urutan kartu
  // berubah tiap tick timer (re-render tiap 100 ms) sehingga tidak bisa diketuk.
  const tindakanAcak = useMemo(
    () => (aktif ? acak([aktif.tindakanBenar, ...aktif.tindakanSalah]) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx],
  )
  const persenWaktu = waktuPerPesananMs > 0 ? (sisaMs / waktuPerPesananMs) * 100 : 100
  const detik = Math.ceil(sisaMs / 1000)
  const skorAkhir = pesanan.length > 0 ? clamp(Math.round((benarHitung / pesanan.length) * 100), 0, 100) : 0

  // Keyboard: tombol 1..n memilih tindakan (Tab+Enter tetap bisa).
  const onKeyDownPilihan = (e: React.KeyboardEvent) => {
    const n = Number.parseInt(e.key, 10)
    if (Number.isNaN(n) || n < 1 || n > tindakanAcak.length) return
    pilihTindakan(tindakanAcak[n - 1])
  }

  if (!aktif) {
    return (
      <div className="aia-stack">
        <p style={{ textAlign: 'center', margin: 0 }}>Tidak ada pesanan.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }} onKeyDown={onKeyDownPilihan}>
      <style>{`
        .aia-gi-kantin-pesanan { border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: var(--card, #fff); color: var(--foreground, #111); padding: 14px; }
        .aia-gi-kantin-tindakan { display: block; width: 100%; min-height: 64px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 600; text-align: left; cursor: pointer; touch-action: manipulation; transition: transform .15s ease, outline .15s ease; }
        .aia-gi-kantin-tindakan:active { transform: scale(.97); }
        @media (hover: hover) { .aia-gi-kantin-tindakan:hover:not(:disabled) { transform: scale(1.01); box-shadow: 0 4px 14px rgba(0,0,0,.12); } }
        .aia-gi-kantin-tindakan:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-kantin-tindakan.dipilih-benar { outline: 3px solid var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 12%, var(--card, #fff)); }
        .aia-gi-kantin-tindakan:disabled { cursor: default; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-kantin-tindakan { transition: none; } .aia-gi-kantin-tindakan:active { transform: none; } }
      `}</style>

      <EfekBenar tampil={hasil === 'senang'} label="Pelanggan senang!" />

      <div className="aia-stats" aria-label="Progres pesanan">
        <span className="aia-stat">
          <UtensilsCrossed aria-hidden="true" /> Pesanan {idx + 1}/{pesanan.length}
        </span>
        <span className="aia-stat">Dilayani benar: {benarHitung}</span>
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
          aria-valuemax={Math.ceil(waktuPerPesananMs / 1000)}
          aria-label="Sisa waktu melayani"
        >
          <span style={{ width: `${persenWaktu}%` }} />
        </div>
      )}

      <div className="aia-gi-kantin-pesanan" aria-live="polite">
        <strong>
          <User aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />
          {aktif.pelanggan}
        </strong>
        <p style={{ margin: '6px 0 0' }}>{aktif.permintaan}</p>
        {hasil === 'senang' && <p style={{ margin: '8px 0 0' }}>😊 Pelanggan senang, terima kasih!</p>}
        {hasil === 'kecewa' && <p style={{ margin: '8px 0 0' }}>😞 Pelanggan pergi kecewa.</p>}
        {/* C-33: jawaban salah menyorot tindakan benar (teks) sebagai
            umpan belajar — sebelumnya hanya "pergi kecewa" tanpa petunjuk
            mana tindakan yang benar. Waktu habis tidak menyorot, karena
            pemain belum sempat memilih. */}
        {hasil === 'kecewa' && alasanKecewa === 'salah' && (
          <p style={{ margin: '8px 0 0', fontWeight: 700 }}>Tindakan yang benar: {aktif.tindakanBenar}</p>
        )}
      </div>

      <EfekSalah tampil={hasil === 'kecewa'} petunjuk="Perhatikan baik-baik permintaannya, lalu pilih tindakan yang cocok." />

      {selesai ? (
        <p style={{ textAlign: 'center', margin: 0 }}>
          <strong>Semua pesanan selesai!</strong> Skor: {skorAkhir}
        </p>
      ) : (
        <div className="aia-stack" role="group" aria-label="Pilihan tindakan">
          {tindakanAcak.map((t) => (
            <button
              key={t}
              type="button"
              // C-33: tindakan benar ikut disorot hijau bila jawaban salah
              // (sebelumnya hanya saat jawaban benar).
              className={`aia-gi-kantin-tindakan${(hasil === 'senang' || (hasil === 'kecewa' && alasanKecewa === 'salah')) && t === aktif.tindakanBenar ? ' dipilih-benar' : ''}`}
              style={{ minHeight: modeSatuKetukan ? 72 : 64 }}
              disabled={disabled || hasil !== null}
              aria-label={`Tindakan: ${t}`}
              onClick={() => pilihTindakan(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {berikut && !selesai && (
        <p className="aia-muted" style={{ margin: 0 }}>
          Berikutnya: <strong>{berikut.pelanggan}</strong> — {berikut.permintaan}
        </p>
      )}
      <p className="aia-muted" style={{ margin: 0 }}>
        {tanpaWaktu
          ? 'Ketuk tindakan yang benar — tanpa batas waktu (tombol 1–3 juga bisa).'
          : 'Layani pesanan sebelum waktu habis! (tombol 1–3 juga bisa)'}
      </p>
    </div>
  )
}
