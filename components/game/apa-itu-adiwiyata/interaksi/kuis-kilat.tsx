// KuisKilat — satu soal per layar dengan bar waktu; ketuk jawaban,
// lalu tampil penjelasan singkat sebelum soal berikutnya. Jawaban benar
// beruntun memberi bonus beruntun ("Beruntun xN"). Habis waktu = salah.
// Mode satu-ketukan: tanpa batas waktu.
// Skor 0–100: tiap jawaban benar bernilai 10 poin + 2 poin per tingkat
// beruntun (jawaban benar ke-2 beruntun +2, ke-3 +4, dst.), lalu
// dinormalisasi terhadap poin maksimum bila semua soal benar beruntun.
// Generik: tidak ada konten misi.

'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { benar, getar, koin, salah } from '../suara'
import { useKurangiAnimasi } from './util'
import { EfekBenar, EfekSalah } from './umpan-balik'

export interface SoalKilat {
  pertanyaan: string
  pilihan: string[]
  jawaban: number
  penjelasan?: string
}

export interface KuisKilatProps {
  soal: SoalKilat[]
  waktuPerSoalMs?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Jeda: bekukan hitung mundur waktu per soal. */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

export function KuisKilat({
  soal,
  waktuPerSoalMs = 10000,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
}: KuisKilatProps) {
  const kurangi = useKurangiAnimasi()
  const tanpaWaktu = modeSatuKetukan
  const [idx, setIdx] = useState(0)
  const [sisaMs, setSisaMs] = useState(waktuPerSoalMs)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [dijawab, setDijawab] = useState(false)
  const [beruntun, setBeruntun] = useState(0)
  const [benarHitung, setBenarHitung] = useState(0)
  const [umpan, setUmpan] = useState<'benar' | 'salah' | null>(null)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const poinRef = useRef(0)
  const beruntunRef = useRef(0)
  const benarRef = useRef(0)
  const idxRef = useRef(0)
  idxRef.current = idx
  const dijawabRef = useRef(false)
  const onSelesaiRef = useRef(onSelesai)
  onSelesaiRef.current = onSelesai
  const terjedaRef = useRef(terjeda)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  const poinMaks = soal.reduce((total, _, i) => total + 10 + 2 * i, 0)

  // Reset waktu + status jawaban tiap soal baru.
  useEffect(() => {
    setSisaMs(waktuPerSoalMs)
    setDipilih(null)
    setDijawab(false)
    setUmpan(null)
    dijawabRef.current = false
  }, [idx, waktuPerSoalMs])

  const akhiri = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    const skor = poinMaks > 0 ? Math.round((poinRef.current / poinMaks) * 100) : 100
    koin()
    setSelesai(true)
    onSelesaiRef.current(skor)
  }

  const lanjut = () => {
    const berikutnya = idxRef.current + 1
    if (berikutnya >= soal.length) {
      akhiri()
      return
    }
    setIdx(berikutnya)
  }

  const nilaiJawaban = (pilihanIdx: number | null) => {
    if (dijawabRef.current || selesaiRef.current) return
    dijawabRef.current = true
    const kini = soal[idxRef.current]
    if (!kini) return
    setDipilih(pilihanIdx)
    setDijawab(true)
    if (pilihanIdx !== null && pilihanIdx === kini.jawaban) {
      const streakBaru = beruntunRef.current + 1
      beruntunRef.current = streakBaru
      setBeruntun(streakBaru)
      poinRef.current += 10 + 2 * (streakBaru - 1)
      const baru = benarRef.current + 1
      benarRef.current = baru
      setBenarHitung(baru)
      benar()
      getar(20)
      setUmpan('benar')
    } else {
      beruntunRef.current = 0
      setBeruntun(0)
      salah()
      getar([40, 40, 40])
      setUmpan('salah')
    }
  }

  // Hitung mundur per soal (tidak jalan di mode satu-ketukan).
  useEffect(() => {
    if (tanpaWaktu || selesai || soal.length === 0) return
    const id = window.setInterval(() => {
      // Jeda: lewati tick supaya sisa waktu tidak berkurang selama jeda.
      if (terjedaRef.current) return
      setSisaMs((s) => Math.max(0, s - 100))
    }, 100)
    return () => window.clearInterval(id)
  }, [idx, selesai, tanpaWaktu, soal.length])

  // Waktu habis = salah.
  useEffect(() => {
    if (tanpaWaktu || selesai || sisaMs > 0) return
    nilaiJawaban(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisaMs, selesai, tanpaWaktu])

  const kini = soal[idx]
  const persenWaktu = tanpaWaktu ? 100 : (sisaMs / waktuPerSoalMs) * 100
  const detik = Math.ceil(sisaMs / 1000)

  // Keyboard: tombol 1–4 atau A–D memilih jawaban (Tab+Enter tetap bisa).
  const onKeyDownPilihan = (e: React.KeyboardEvent) => {
    if (!kini || dijawabRef.current) return
    const k = e.key.toUpperCase()
    let i = -1
    if (/^[1-9]$/.test(k)) i = Number.parseInt(k, 10) - 1
    else if (/^[A-D]$/.test(k)) i = k.charCodeAt(0) - 65
    if (i >= 0 && i < kini.pilihan.length) nilaiJawaban(i)
  }

  return (
    <div className="aia-stack" onKeyDown={onKeyDownPilihan}>
      <style>{`
        .aia-gi-kuis-soal { padding: 18px; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: var(--card, #fff); color: var(--foreground, #111); font-size: 18px; font-weight: 700; }
        .aia-gi-kuis-pilihan { display: block; width: 100%; min-height: 56px; padding: 14px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-size: 16px; font-weight: 600; text-align: left; cursor: pointer; touch-action: manipulation; }
        @media (hover: hover) { .aia-gi-kuis-pilihan:hover:not(:disabled) { transform: scale(1.01); box-shadow: 0 4px 14px rgba(0,0,0,.12); } }
        .aia-gi-kuis-pilihan:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-kuis-pilihan.benar-dipilih { border-color: var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 14%, var(--card, #fff)); }
        .aia-gi-kuis-pilihan.salah-dipilih { border-color: #b83232; background: color-mix(in srgb, #b83232 10%, var(--card, #fff)); }
        .aia-gi-kuis-pilihan.jawaban-benar { border-color: var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 14%, var(--card, #fff)); }
        .aia-gi-kuis-beruntun { display: inline-flex; align-items: center; gap: 4px; color: #b45309; font-weight: 800; }
        .aia-gi-kuis-beruntun svg { width: 16px; height: 16px; }
      `}</style>

      <div className="aia-stats" aria-label="Progres kuis">
        <span className="aia-stat">
          Soal {Math.min(idx + 1, soal.length)}/{soal.length}
        </span>
        <span className="aia-stat">Benar {benarHitung}</span>
        {beruntun >= 2 && (
          <span className="aia-stat aia-gi-kuis-beruntun">
            <Flame aria-hidden="true" /> Beruntun x{beruntun}
          </span>
        )}
        {!tanpaWaktu && (
          <span className="aia-stat" aria-label={`Sisa waktu ${detik} detik`}>
            ⏱ {detik} detik
          </span>
        )}
      </div>

      {!tanpaWaktu && (
        <div
          className="aia-progress"
          role="progressbar"
          aria-valuenow={detik}
          aria-valuemin={0}
          aria-valuemax={Math.ceil(waktuPerSoalMs / 1000)}
          aria-label="Sisa waktu soal ini"
        >
          <span style={{ width: `${persenWaktu}%` }} />
        </div>
      )}

      {kini && !selesai ? (
        <>
          <div className="aia-gi-kuis-soal">{kini.pertanyaan}</div>

          <div className="aia-stack" style={{ gap: 10 }}>
            {kini.pilihan.map((p, i) => {
              const sudahDijawab = dijawab
              const kelas =
                sudahDijawab && i === kini.jawaban
                  ? ' jawaban-benar'
                  : sudahDijawab && i === dipilih
                    ? i === kini.jawaban
                      ? ' benar-dipilih'
                      : ' salah-dipilih'
                    : ''
              return (
                <button
                  key={i}
                  type="button"
                  className={`aia-gi-kuis-pilihan${kelas}`}
                  disabled={disabled || sudahDijawab}
                  aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${p}`}
                  onClick={() => nilaiJawaban(i)}
                >
                  <strong>{String.fromCharCode(65 + i)}.</strong> {p}
                </button>
              )
            })}
          </div>

          <EfekBenar tampil={umpan === 'benar'} label="Benar!" />
          <EfekSalah tampil={umpan === 'salah'} petunjuk="Belum tepat — baca penjelasannya." />

          {dijawab && (
            <div className="aia-stack">
              {kini.penjelasan && (
                <p style={{ margin: 0, padding: 12, borderRadius: 12, background: 'var(--card, #fff)', border: '1px solid var(--line, #e5e7eb)' }}>
                  💡 {kini.penjelasan}
                </p>
              )}
              <div className="aia-actions" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="aia-btn"
                  style={{ minHeight: 48 }}
                  onClick={lanjut}
                >
                  {idx + 1 >= soal.length ? 'Lihat hasil' : 'Soal berikutnya'}
                </button>
              </div>
            </div>
          )}
          {!dijawab && (
            <p className="aia-muted" style={{ margin: 0, textAlign: 'center' }}>
              {kurangi || tanpaWaktu
                ? 'Ketuk satu jawaban (tombol 1–4 atau A–D juga bisa).'
                : 'Ketuk jawaban sebelum waktu habis! (tombol 1–4 atau A–D juga bisa)'}
            </p>
          )}
        </>
      ) : (
        <p style={{ margin: 0, textAlign: 'center', fontWeight: 700, fontSize: 18 }}>
          Selesai! Kamu menjawab {benarHitung} dari {soal.length} soal dengan benar.
        </p>
      )}
    </div>
  )
}
