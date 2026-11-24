'use client'

// Mini-game Misi Kader "Edu-Lingkungan" — Kak Lala. Versi gestur baru.
// Kuis mengajar: 4 soal per tahap dari KONTEN_TUGAS[tugasId].
// Tiap tahap: KartuMemori — 4 pasang soal-jawaban; balik 2 kartu,
// cocok = terkunci, penjelasan soal tampil setiap pasang ketemu.
// Gestur mengikuti INTERAKSI_MISI['edu-lingkungan'].
// Skor tiap tahap 0–100 dari KartuMemori (makin sedikit balik salah,
// makin tinggi). onStageComplete dipanggil tepat satu kali.
// Prop modeSatuKetukan menampilkan versi tombol lama (logika tombol yang
// sudah ada di file ini) sebagai alternatif aksesibilitas.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, GraduationCap, Sparkles, X } from 'lucide-react'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { SpesifikasiInteraksi } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TahapTugas } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { EfekBenar, KartuMemori, TanganPenunjuk } from '../interaksi'
import { benar, koin, salah } from '../suara'

/** Props mini-game Misi Kader (bentuk sama seperti MiniGameSlotProps, dengan tugasId). */
export interface TugasMiniGameProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  /** Bila true, tampilkan versi tombol lama (mode alternatif satu-ketukan). */
  modeSatuKetukan?: boolean
}

type TahapKuis = Extract<TahapTugas, { jenis: 'kuis' }>

function acak<T>(daftar: T[]): T[] {
  const salin = [...daftar]
  for (let i = salin.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = salin[i]
    salin[i] = salin[j]
    salin[j] = tmp
  }
  return salin
}

/** Petunjuk Magi di data berbentuk 'Magi: "..."' — buang pembungkusnya karena
 *  komponen PetunjukMagi sudah memberi label Magi sendiri. */
function teksMagi(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '')
}

// ------------------------------------------------------ Kuis (gestur) ----
// KartuMemori: 4 pasang per tahap — kartu soal dipasangkan dengan kartu
// jawaban yang benar. Balik 2 kartu; cocok = terkunci. Penjelasan soal
// tampil setiap kali sepasang cocok. Skor 0–100 dari KartuMemori
// (makin sedikit balik salah, makin tinggi skor).

function EduLingkunganGestur({
  tahap,
  spec,
  onStageComplete,
}: {
  tahap: TahapKuis
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
}) {
  const soal = tahap.soal
  const [skorAkhir, setSkorAkhir] = useState<number | null>(null)
  const [cocok, setCocok] = useState(0)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)
  const [efekBenar, setEfekBenar] = useState(false)
  const [penjelasan, setPenjelasan] = useState<string | null>(null)

  const selesaiRef = useRef(false)
  const timerEfekRef = useRef<number | null>(null)

  // 8 kartu: tiap soal punya kartu soal (teks pertanyaan) dan kartu jawaban
  // (teks pilihan yang benar). KartuMemori mengacak posisinya sendiri.
  const kartu = useMemo(
    () =>
      soal.flatMap((s, i) => [
        {
          id: `soal-${i}`,
          pasanganId: `soal-${i}`,
          konten: <span className="aia-gi-memori-teks">{s.pertanyaan}</span>,
          label: 'Soal',
        },
        {
          id: `jawab-${i}`,
          pasanganId: `soal-${i}`,
          konten: <span className="aia-gi-memori-teks">{s.pilihan[s.jawaban] ?? ''}</span>,
          label: 'Jawaban',
        },
      ]),
    [soal],
  )

  useEffect(
    () => () => {
      if (timerEfekRef.current) window.clearTimeout(timerEfekRef.current)
    },
    [],
  )

  const selesaikan = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(nilai)
  }

  const kilauBenar = () => {
    setEfekBenar(true)
    if (timerEfekRef.current) window.clearTimeout(timerEfekRef.current)
    timerEfekRef.current = window.setTimeout(() => setEfekBenar(false), 1500)
  }

  const onPasangan = (pasanganId: string) => {
    const idx = Number(pasanganId.replace('soal-', ''))
    const s = soal[idx]
    if (!s) return
    setCocok((c) => c + 1)
    setTunjuk(false)
    kilauBenar()
    setPenjelasan(s.penjelasan)
  }

  if (skorAkhir !== null) {
    return (
      <div className="aia-stack">
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Sparkles aria-hidden="true" /> Tahap selesai!
          </h3>
          <p>
            Kamu memasangkan {cocok} dari {soal.length} soal dengan jawabannya — seperti mengajar teman di kelas.{' '}
            {spec.hasilBenar}
          </p>
          <p>
            Skor tahap ini: <strong>{skorAkhir}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesaikan(skorAkhir)}>
            Selesai · +{skorAkhir} Koin Hijau
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <style>{`
        .aia-gi-memori-teks { font-size: 11px; line-height: 1.3; font-weight: 600; text-align: center; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
      <EfekBenar tampil={efekBenar} />
      <div className="aia-card">
        <span className="aia-kicker">
          Kader Edu-Lingkungan · Pasangan {cocok} dari {soal.length}
        </span>
        <h3 className="aia-section-title" style={{ marginTop: 4 }}>
          <GraduationCap aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tahap.judul}
        </h3>
        <p className="aia-muted" style={{ marginBottom: 0 }}>
          {tahap.instruksi}
        </p>
      </div>
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Balik dua kartu — cari soal dan jawabannya yang berpasangan" />
        </div>
      )}
      <KartuMemori
        kartu={kartu}
        onPasangan={onPasangan}
        onSelesai={(skor) => {
          setTunjuk(false)
          setSkorAkhir(skor)
        }}
      />
      {penjelasan && (
        <div role="status" style={{ padding: 12, borderRadius: 12, background: '#dcfce7' }}>
          <strong>Benar!</strong> {penjelasan}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------ Kuis (tombol) ----
// Versi tombol lama — dipakai sebagai mode alternatif satu-ketukan.

function EduLingkunganTombol({ tugasId, stageIndex, onStageComplete }: TugasMiniGameProps) {
  const tahap = KONTEN_TUGAS[tugasId].tahapan[stageIndex]
  const soal = useMemo(() => (tahap.jenis === 'kuis' ? tahap.soal : []), [tahap])
  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [qIndex, setQIndex] = useState(0)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [dijawab, setDijawab] = useState(false)
  const [benarCount, setBenarCount] = useState(0)

  const selesaiRef = useRef(false)
  const pertanyaan = soal[qIndex]
  const skor = benarCount * 25

  const selesai = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(skor)
  }

  if (!tahap || tahap.jenis !== 'kuis' || !pertanyaan) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Soal tahap ini belum tersedia.</p>
      </div>
    )
  }

  const jawab = (index: number) => {
    if (dijawab || fase !== 'main') return
    const isBenar = index === pertanyaan.jawaban
    setDipilih(index)
    setDijawab(true)
    if (isBenar) {
      setBenarCount((c) => c + 1)
      benar()
    } else {
      salah()
    }
  }

  const lanjut = () => {
    if (qIndex + 1 >= soal.length) {
      setFase('selesai')
      return
    }
    setQIndex((q) => q + 1)
    setDipilih(null)
    setDijawab(false)
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">
              Kader Edu-Lingkungan · Soal {qIndex + 1} dari {soal.length}
            </span>
            <h3 className="aia-section-title" style={{ marginTop: 4 }}>
              <GraduationCap aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tahap.judul}
            </h3>
            <p className="aia-muted" style={{ marginBottom: 0 }}>
              {tahap.instruksi}
            </p>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {pertanyaan.pertanyaan}
            </p>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {pertanyaan.pilihan.map((pilihan, i) => {
                const isJawaban = i === pertanyaan.jawaban
                const isDipilih = i === dipilih
                let latar: string | undefined
                let border: string | undefined
                if (dijawab && isJawaban) {
                  latar = '#dcfce7'
                  border = '2px solid #236b4d'
                } else if (dijawab && isDipilih) {
                  latar = '#fee2e2'
                  border = '2px solid #b83232'
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className="aia-btn aia-btn-block"
                    disabled={dijawab}
                    onClick={() => jawab(i)}
                    aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${pilihan}`}
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minHeight: 48,
                      background: latar,
                      border,
                      whiteSpace: 'normal',
                      height: 'auto',
                      padding: '12px 16px',
                    }}
                  >
                    <span aria-hidden="true" style={{ fontWeight: 800 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span>{pilihan}</span>
                    {dijawab && isJawaban && <Check aria-hidden="true" color="#236b4d" />}
                    {dijawab && isDipilih && !isJawaban && <X aria-hidden="true" color="#b83232" />}
                  </button>
                )
              })}
            </div>

            {dijawab && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: dipilih === pertanyaan.jawaban ? '#dcfce7' : '#fee2e2',
                }}
              >
                <strong>{dipilih === pertanyaan.jawaban ? 'Benar!' : 'Belum tepat.'}</strong>{' '}
                {pertanyaan.penjelasan}
              </div>
            )}

            {dijawab && (
              <button
                type="button"
                className="aia-btn aia-btn-primary aia-btn-block"
                style={{ marginTop: 12 }}
                onClick={lanjut}
              >
                {qIndex + 1 >= soal.length ? 'Lihat hasil' : 'Soal berikutnya'}
              </button>
            )}
          </div>
        </>
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Sparkles aria-hidden="true" /> Tahap selesai!
          </h3>
          <p>
            Kamu menjawab {benarCount} dari {soal.length} soal dengan benar — seperti mengajar teman di kelas.
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={selesai}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------- Ekspor utama ----

/**
 * Mini-game Misi Kader "Edu-Lingkungan" — Kak Lala.
 * Menerima props bentuk TugasMiniGameProps; tahap dipilih dari
 * KONTEN_TUGAS[tugasId].tahapan[stageIndex] (ketiga tahap berjenis kuis).
 * modeSatuKetukan = true menampilkan versi tombol lama.
 * TIDAK disambungkan ke mana pun di sini — agen integrasi yang menyambung.
 */
export function EduLingkungan({ tugasId, stageIndex, onStageComplete, modeSatuKetukan = false }: TugasMiniGameProps) {
  const konten = KONTEN_TUGAS[tugasId]
  const tahap = konten?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  if (!tahap || tahap.jenis !== 'kuis' || !spec) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }
  const kunci = `${tugasId}-${stageIndex}`
  if (modeSatuKetukan) {
    return <EduLingkunganTombol key={kunci} tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} />
  }
  return <EduLingkunganGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} />
}
