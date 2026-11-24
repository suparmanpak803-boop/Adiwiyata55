'use client'

// Mini-game Bab 6 "Inspeksi Tim Adiwiyata" — bos akhir kampanye.
// Versi utama: gestur drag-drop — seret kartu jawaban ke kotak jawaban
// (BUKAN tombol pilihan). 12 soal dari SOAL_INSPEKSI, 4 soal per tahap
// sesuai stageIndex. Versi tombol lama (kuis pilihan + timer + nyawa)
// disimpan sebagai mode alternatif satu-ketukan (prop modeSatuKetukan).
// Tiap tahap memanggil onStageComplete(score) TEPAT SATU KALI.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clock, Heart, Inbox, Lightbulb, RotateCcw, X } from 'lucide-react'
import { SOAL_INSPEKSI } from '@/lib/apa-itu-adiwiyata/content/pertanyaan'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { MiniGameSlotProps } from '../misi-shell'
import { EfekBenar, EfekSalah, PetunjukMagi, TanganPenunjuk } from '../interaksi'
import { benar, getar, koin, nyawa, salah, tik } from '../suara'

/** Petunjuk di data diawali 'Magi: "..."' — komponen PetunjukMagi sudah
 *  memberi label Magi sendiri, jadi awalan dan tanda kutipnya dibuang. */
function teksMagi(s: string): string {
  return s.replace(/^Magi:\s*/, '').replace(/^"|"$/g, '')
}

// ------------------------------------------------- Versi tombol (lama) ----

const WAKTU_NORMAL = 15
const WAKTU_MUDAH = 25
const NYAWA_AWAL = 3

const LABEL_MEKANIK: Record<string, string> = {
  tas: 'barang bawaan',
  pilah: 'memilah sampah',
  maggot: 'maggot',
  kompos: 'kompos',
  air: 'air dan energi',
}

function InspeksiTombol({ stageIndex, onStageComplete }: MiniGameSlotProps) {
  const soal = useMemo(
    () => SOAL_INSPEKSI.slice(stageIndex * 4, stageIndex * 4 + 4),
    [stageIndex],
  )
  const [fase, setFase] = useState<'main' | 'gagal' | 'selesai'>('main')
  const [mudah, setMudah] = useState(false)
  const [gagal, setGagal] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [nyawaSisa, setNyawaSisa] = useState(NYAWA_AWAL)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [dijawab, setDijawab] = useState(false)
  const [waktuHabis, setWaktuHabis] = useState(false)
  const [waktu, setWaktu] = useState(WAKTU_NORMAL)
  const [habis, setHabis] = useState(false)

  const selesaiRef = useRef(false)
  const totalWaktu = mudah ? WAKTU_MUDAH : WAKTU_NORMAL
  const pertanyaan = soal[qIndex]

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  // Timer: tiap detik berkurang; 5 detik terakhir bunyi tik
  // (makin cepat di 3 detik terakhir). Berhenti saat sudah dijawab.
  useEffect(() => {
    if (fase !== 'main' || dijawab) return
    if (waktu <= 0) return
    if (waktu <= 5) tik(waktu <= 3)
    const id = setTimeout(() => setWaktu((w) => Math.max(0, w - 1)), 1000)
    return () => clearTimeout(id)
  }, [waktu, fase, dijawab])

  // Waktu habis: dianggap salah, nyawa berkurang, penjelasan tampil.
  useEffect(() => {
    if (fase !== 'main' || dijawab || waktu > 0) return
    setWaktuHabis(true)
    setDijawab(true)
    nyawa()
    if (nyawaSisa - 1 <= 0) setHabis(true)
    setNyawaSisa((n) => n - 1)
  }, [waktu, fase, dijawab, nyawaSisa])

  if (!pertanyaan) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Soal tahap ini belum tersedia.</p>
      </div>
    )
  }

  const jawab = (index: number) => {
    if (dijawab || fase !== 'main') return
    const elapsed = totalWaktu - waktu
    const isBenar = index === pertanyaan.jawabanIndex
    setDipilih(index)
    setDijawab(true)
    if (isBenar) {
      const bonus = elapsed <= 5 ? 5 : 0
      setSkor((s) => s + 10 + bonus)
      setBenarCount((c) => c + 1)
      benar()
      koin()
    } else {
      salah()
      nyawa()
      if (nyawaSisa - 1 <= 0) setHabis(true)
      setNyawaSisa((n) => n - 1)
    }
  }

  const lanjut = () => {
    if (habis) {
      setFase('gagal')
      setGagal((g) => g + 1)
      getar([60, 40, 60])
      return
    }
    if (qIndex + 1 >= soal.length) {
      setFase('selesai')
      return
    }
    setQIndex((q) => q + 1)
    setDipilih(null)
    setDijawab(false)
    setWaktuHabis(false)
    setWaktu(totalWaktu)
  }

  const ulangi = (pakaiMudah: boolean) => {
    setMudah(pakaiMudah)
    setQIndex(0)
    setNyawaSisa(NYAWA_AWAL)
    setSkor(0)
    setBenarCount(0)
    setDipilih(null)
    setDijawab(false)
    setWaktuHabis(false)
    setHabis(false)
    setWaktu(pakaiMudah ? WAKTU_MUDAH : WAKTU_NORMAL)
    setFase('main')
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">
              Inspeksi Tim Adiwiyata · Soal {qIndex + 1} dari {soal.length}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 8,
              }}
              role="status"
              aria-label={`Nyawa tersisa ${Math.max(0, nyawaSisa)} dari ${NYAWA_AWAL}`}
            >
              {Array.from({ length: NYAWA_AWAL }).map((_, i) => (
                <Heart
                  key={i}
                  aria-hidden="true"
                  size={20}
                  color={i < nyawaSisa ? '#e11d48' : '#cbd5ce'}
                  fill={i < nyawaSisa ? '#e11d48' : 'transparent'}
                />
              ))}
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700 }}>Skor: {skor}</span>
            </div>
            <div className="aia-progress-row" style={{ marginTop: 10 }}>
              <div
                className="aia-progress"
                role="progressbar"
                aria-valuenow={waktu}
                aria-valuemin={0}
                aria-valuemax={totalWaktu}
                aria-label="Sisa waktu menjawab"
              >
                <span
                  style={{
                    width: `${(waktu / totalWaktu) * 100}%`,
                    background: waktu <= 5 ? '#b83232' : '#236b4d',
                  }}
                />
              </div>
              <span style={{ color: waktu <= 5 ? '#b83232' : undefined, fontWeight: waktu <= 5 ? 700 : undefined }}>
                <Clock aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {waktu} dtk
                {waktu <= 5 && waktu > 0 ? ' · Cepat!' : ''}
              </span>
            </div>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {pertanyaan.pertanyaan}
            </p>
            {mudah && (
              <p className="aia-muted" style={{ margin: '0 0 12px', color: '#236b4d' }}>
                <Lightbulb aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Petunjuk: soal tentang{' '}
                {LABEL_MEKANIK[pertanyaan.mekanik] ?? 'lingkungan'}.
              </p>
            )}
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {pertanyaan.pilihan.map((pilihan, i) => {
                const isJawaban = i === pertanyaan.jawabanIndex
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
                  background: waktuHabis
                    ? '#fef3c7'
                    : dipilih === pertanyaan.jawabanIndex
                      ? '#dcfce7'
                      : '#fee2e2',
                }}
              >
                <strong>
                  {waktuHabis
                    ? 'Waktu habis!'
                    : dipilih === pertanyaan.jawabanIndex
                      ? 'Benar!'
                      : 'Belum tepat.'}
                </strong>{' '}
                {pertanyaan.penjelasan}
                {dijawab && dipilih === pertanyaan.jawabanIndex && totalWaktu - waktu <= 5 && (
                  <span> Bonus kecepatan +5!</span>
                )}
              </div>
            )}

            {dijawab && (
              <button
                type="button"
                className="aia-btn aia-btn-primary aia-btn-block"
                style={{ marginTop: 12 }}
                onClick={lanjut}
              >
                {habis
                  ? 'Lihat hasil'
                  : qIndex + 1 >= soal.length
                    ? 'Lihat hasil'
                    : 'Soal berikutnya'}
              </button>
            )}
          </div>
        </>
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Inspeksi selesai!
          </h3>
          <p>
            Kamu menjawab {benarCount} dari {soal.length} soal dengan benar. Tim Adiwiyata terkesan dengan
            pengetahuanmu!
          </p>
          <p>
            Skor tahap ini: <strong>{skor} Koin Hijau</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}

      {fase === 'gagal' && (
        <div className="aia-card">
          <h3>
            <X aria-hidden="true" /> Nyawa habis
          </h3>
          <p>
            Tim inspeksi masih menunggu — jangan menyerah! Kamu bisa mengulang tahap ini dari awal. Skor
            sementara {skor} tidak disimpan, tapi tenang, jawaban yang sudah kamu pelajari tetap ingat.
          </p>
          <div className="aia-actions">
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => ulangi(mudah)}>
              <RotateCcw aria-hidden="true" /> Coba lagi
            </button>
            {gagal >= 2 && !mudah && (
              <button type="button" className="aia-btn aia-btn-ghost" onClick={() => ulangi(true)}>
                Mode mudah: {WAKTU_MUDAH} detik per soal + petunjuk
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------- Versi gestur (utama) ----

const POIN_PER_SOAL = 25

function InspeksiGestur({
  stageIndex,
  onSelesai,
}: {
  stageIndex: number
  onSelesai: (score: number) => void
}) {
  const soal = useMemo(
    () => SOAL_INSPEKSI.slice(stageIndex * 4, stageIndex * 4 + 4),
    [stageIndex],
  )
  const spec = INTERAKSI_MISI['biodiversitas'][Math.min(stageIndex, 2)]
  const [qIndex, setQIndex] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [gagal, setGagal] = useState(0)
  const [dijawab, setDijawab] = useState(false)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [hasil, setHasil] = useState<{
    benar: boolean
    penjelasan: string
    jawabanBenar: string
  } | null>(null)
  const [drag, setDrag] = useState<{ index: number; dx: number; dy: number } | null>(null)
  const [fase, setFase] = useState<'main' | 'selesai'>('main')

  const kotakRef = useRef<HTMLButtonElement | null>(null)
  const dragRef = useRef<{ index: number; x0: number; y0: number; bergerak: boolean } | null>(null)
  const abaikanKlikRef = useRef(false)

  const pertanyaan = soal[qIndex]
  // Kesulitan adaptif: kotak jawaban membesar setelah 2 kali gagal.
  const perbesarTarget = gagal >= 2

  const submit = (index: number) => {
    if (dijawab || fase !== 'main' || !pertanyaan) return
    setDrag(null)
    setDipilih(null)
    const isBenar = index === pertanyaan.jawabanIndex
    if (isBenar) {
      setSkor((s) => s + POIN_PER_SOAL)
      setBenarCount((c) => c + 1)
      benar()
      koin()
    } else {
      salah()
      getar([40, 40, 40])
      setGagal((g) => g + 1)
    }
    setHasil({
      benar: isBenar,
      penjelasan: pertanyaan.penjelasan,
      jawabanBenar: pertanyaan.pilihan[pertanyaan.jawabanIndex],
    })
    setDijawab(true)
  }

  const lanjut = () => {
    if (qIndex + 1 >= soal.length) {
      setFase('selesai')
      return
    }
    setQIndex((q) => q + 1)
    setDijawab(false)
    setDipilih(null)
    setHasil(null)
    setDrag(null)
  }

  // Seret kartu (pola yang sama seperti DragDrop di pustaka interaksi):
  // pointer capture, translate mengikuti jari/mouse, hit-test ke kotak
  // jawaban saat dilepas. Ketuk biasa (tanpa gerak) memilih kartu — lalu
  // ketuk kotak untuk mengirimnya (alternatif tanpa seret).
  const mulaiSeret = (index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dijawab || fase !== 'main') return
    dragRef.current = { index, x0: e.clientX, y0: e.clientY, bergerak: false }
    setDrag({ index, dx: 0, dy: 0 })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const gerakSeret = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (Math.abs(dx) + Math.abs(dy) > 10) d.bergerak = true
    setDrag({ index: d.index, dx, dy })
  }

  const akhiriSeret = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    setDrag(null)
    if (!d.bergerak) return // Ketuk biasa — ditangani onClick.
    abaikanKlikRef.current = true
    const kotak = kotakRef.current
    if (kotak) {
      const r = kotak.getBoundingClientRect()
      const pad = perbesarTarget ? 28 : 12
      if (
        e.clientX >= r.left - pad &&
        e.clientX <= r.right + pad &&
        e.clientY >= r.top - pad &&
        e.clientY <= r.bottom + pad
      ) {
        submit(d.index)
      }
    }
    // Dilepas di luar kotak — kartu kembali ke tempatnya.
  }

  const klikKartu = (index: number) => () => {
    if (abaikanKlikRef.current) {
      abaikanKlikRef.current = false
      return
    }
    if (dijawab || fase !== 'main') return
    setDipilih((v) => (v === index ? null : index))
  }

  const klikKotak = () => {
    if (dipilih === null || dijawab || fase !== 'main') return
    submit(dipilih)
  }

  if (!pertanyaan && fase === 'main') {
    return (
      <div className="aia-card">
        <p className="aia-muted">Soal tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">
          Inspeksi Tim Adiwiyata · Soal {Math.min(qIndex + 1, soal.length)} dari {soal.length}
        </span>
        <p style={{ margin: '8px 0 0' }}>
          Skor: {skor} · Benar: {benarCount}/{soal.length}
        </p>
      </div>

      {fase === 'main' && pertanyaan && (
        <>
          <div className="aia-card">
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {pertanyaan.pertanyaan}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} role="group" aria-label="Kartu jawaban — seret ke kotak jawaban">
            {pertanyaan.pilihan.map((pilihan, i) => {
              const sedangDrag = drag?.index === i
              const terpilih = dipilih === i
              return (
                <button
                  key={i}
                  type="button"
                  className="aia-btn aia-btn-block"
                  disabled={dijawab}
                  aria-label={`Jawaban ${String.fromCharCode(65 + i)}: ${pilihan}${terpilih ? ' — dipilih' : ''}`}
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    minHeight: 64,
                    height: 'auto',
                    padding: '12px',
                    whiteSpace: 'normal',
                    position: 'relative',
                    zIndex: sedangDrag ? 10 : undefined,
                    transform: sedangDrag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    outline: terpilih ? '3px solid #2f7d4f' : undefined,
                    outlineOffset: 2,
                    cursor: dijawab ? 'default' : 'grab',
                  }}
                  onPointerDown={mulaiSeret(i)}
                  onPointerMove={gerakSeret}
                  onPointerUp={akhiriSeret}
                  onPointerCancel={() => {
                    dragRef.current = null
                    setDrag(null)
                  }}
                  onClick={klikKartu(i)}
                >
                  <span aria-hidden="true" style={{ fontWeight: 800 }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span>{pilihan}</span>
                </button>
              )
            })}
          </div>

          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {spec.tutorial && qIndex === 0 && !dijawab && (
              <TanganPenunjuk label="Seret jawaban ke kotak!" />
            )}
            <button
              ref={kotakRef}
              type="button"
              onClick={klikKotak}
              disabled={dijawab}
              aria-label="Kotak jawaban. Seret kartu jawaban ke sini, atau ketuk kartu lalu ketuk kotak."
              style={{
                width: '100%',
                minHeight: perbesarTarget ? 120 : 88,
                border: '2px dashed #2f7d4f',
                borderRadius: 14,
                background: dipilih !== null ? '#dcfce7' : 'var(--card)',
                color: 'var(--foreground)',
                fontSize: perbesarTarget ? 16 : 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: dijawab ? 'default' : 'pointer',
              }}
            >
              <Inbox aria-hidden="true" />
              Kotak jawaban
              {dipilih !== null ? ' — ketuk untuk mengirim' : ' — seret kartu ke sini'}
            </button>
          </div>

          {hasil && (
            <div style={{ position: 'relative' }}>
              <EfekBenar tampil={hasil.benar} />
              {hasil.benar ? (
                <div role="status" style={{ padding: 12, borderRadius: 12, background: '#dcfce7' }}>
                  <strong>Benar! +{POIN_PER_SOAL}</strong> {hasil.penjelasan}
                </div>
              ) : (
                <EfekSalah tampil petunjuk={teksMagi(spec.petunjukMagi)} />
              )}
              {!hasil.benar && (
                <p className="aia-muted" style={{ margin: '8px 0 0' }}>
                  Jawaban benar: <strong>{hasil.jawabanBenar}</strong>. {hasil.penjelasan}
                </p>
              )}
            </div>
          )}

          {dijawab && (
            <button
              type="button"
              className="aia-btn aia-btn-primary aia-btn-block"
              onClick={lanjut}
            >
              {qIndex + 1 >= soal.length ? 'Lihat hasil' : 'Soal berikutnya'}
            </button>
          )}
        </>
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Inspeksi selesai!
          </h3>
          <p>
            Kamu menjawab {benarCount} dari {soal.length} soal dengan benar. Tim Adiwiyata terkesan dengan
            pengetahuanmu!
          </p>
          <p>
            Skor tahap ini: <strong>{skor} Koin Hijau</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Utama ----

export function Inspeksi({
  chapterId,
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
}: MiniGameSlotProps & { modeSatuKetukan?: boolean }) {
  const selesaiRef = useRef(false)
  const selesai = useCallback(
    (score: number) => {
      if (selesaiRef.current) return
      selesaiRef.current = true
      onStageComplete(score)
    },
    [onStageComplete],
  )

  if (modeSatuKetukan) {
    return (
      <InspeksiTombol
        chapterId={chapterId}
        stageIndex={stageIndex}
        onStageComplete={selesai}
      />
    )
  }
  return <InspeksiGestur stageIndex={stageIndex} onSelesai={selesai} />
}
