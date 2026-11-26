'use client'

// Mini-game Bab 6 "Inspeksi Tim Adiwiyata" — bos akhir kampanye.
// Versi utama: KuisKilat — satu soal per layar, bar waktu 10 detik per
// soal, bonus beruntun. 12 soal dari SOAL_INSPEKSI, 4 soal per tahap
// sesuai stageIndex. Versi tombol lama (kuis pilihan + timer + nyawa)
// disimpan sebagai mode alternatif satu-ketukan (prop modeSatuKetukan).
// Tiap tahap memanggil onStageComplete(score) TEPAT SATU KALI.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clock, Heart, Lightbulb, RotateCcw, X } from 'lucide-react'
import { SOAL_INSPEKSI } from '@/lib/apa-itu-adiwiyata/content/pertanyaan'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { MiniGameSlotProps } from '../misi-shell'
import { KuisKilat, PetunjukMagi, TanganPenunjuk } from '../interaksi'
import { benar, getar, koin, nyawa, salah, tik } from '../suara'

/** Petunjuk di data diawali 'Magi: "..."' — komponen PetunjukMagi sudah
 *  memberi label Magi sendiri, jadi awalan dan tanda kutipnya dibuang. */
function teksMagi(s: string): string {
  return s.replace(/^Magi:\s*/, '').replace(/^"|"$/g, '')
}

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

function InspeksiTombol({ stageIndex, onStageComplete, terjeda = false }: MiniGameSlotProps) {
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
  // B-15: acak urutan pilihan tiap soal sekali per daftar soal (memo) —
  // jawaban benar tidak selalu di posisi yang sama.
  const opsiPerSoal = useMemo(
    () =>
      soal.map((s) => {
        const urutan = acak(s.pilihan.map((_, i) => i))
        return { urutan, jawabanBaru: urutan.indexOf(s.jawabanIndex) }
      }),
    [soal],
  )
  const pertanyaan = soal[qIndex]
  const opsi = pertanyaan ? opsiPerSoal[qIndex] : null
  // B-9: skor mentah maks 60 (4 soal × (10 + 5 bonus cepat)) — kirim persen.
  const skorPersen = Math.min(100, Math.round((skor / 60) * 100))

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  // Timer: tiap detik berkurang; 5 detik terakhir bunyi tik
  // (makin cepat di 3 detik terakhir). Berhenti saat sudah dijawab.
  // Saat terjeda, timeout yang tertunda dibersihkan (cleanup efek) dan
  // tidak ada timeout baru yang dijadwalkan — hitung mundur membeku.
  // Saat lanjut, efek jalan lagi dan menjadwalkan 1 detik penuh yang baru
  // (hitung mundur diskret per detik, jadi tidak ada baseline yang
  // perlu digeser).
  useEffect(() => {
    if (fase !== 'main' || dijawab) return
    if (terjeda) return
    if (waktu <= 0) return
    if (waktu <= 5) tik(waktu <= 3)
    const id = setTimeout(() => setWaktu((w) => Math.max(0, w - 1)), 1000)
    return () => clearTimeout(id)
  }, [waktu, fase, dijawab, terjeda])

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
    if (dijawab || fase !== 'main' || !opsi) return
    const elapsed = totalWaktu - waktu
    const isBenar = index === opsi.jawabanBaru
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
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700 }}>Skor: {skorPersen}</span>
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
              <p className="aia-muted" style={{ margin: '0 0 12px', color: 'var(--green)' }}>
                <Lightbulb aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Petunjuk: soal tentang{' '}
                {LABEL_MEKANIK[pertanyaan.mekanik] ?? 'lingkungan'}.
              </p>
            )}
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {(opsi?.urutan ?? []).map((asli, i) => {
                const pilihan = pertanyaan.pilihan[asli] ?? ''
                const isJawaban = i === opsi?.jawabanBaru
                const isDipilih = i === dipilih
                let kelasUmpan: string | undefined
                let border: string | undefined
                if (dijawab && isJawaban) {
                  kelasUmpan = 'aia-umpan-benar'
                  border = '2px solid #236b4d'
                } else if (dijawab && isDipilih) {
                  kelasUmpan = 'aia-umpan-salah'
                  border = '2px solid #b83232'
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className={`aia-btn aia-btn-block${kelasUmpan ? ` ${kelasUmpan}` : ''}`}
                    disabled={dijawab}
                    onClick={() => jawab(i)}
                    aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${pilihan}`}
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minHeight: 48,
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
                    {dijawab && isJawaban && <Check aria-hidden="true" />}
                    {dijawab && isDipilih && !isJawaban && <X aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            {dijawab && (
              <div
                role="status"
                className={
                  waktuHabis
                    ? 'aia-umpan-waktu'
                    : dipilih === opsi?.jawabanBaru
                      ? 'aia-umpan-benar'
                      : 'aia-umpan-salah'
                }
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <strong>
                  {waktuHabis
                    ? 'Waktu habis!'
                    : dipilih === opsi?.jawabanBaru
                      ? 'Benar!'
                      : 'Belum tepat.'}
                </strong>{' '}
                {pertanyaan.penjelasan}
                {dijawab && dipilih === opsi?.jawabanBaru && totalWaktu - waktu <= 5 && (
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
            Skor tahap ini: <strong>{skorPersen}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skorPersen)}>
            {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skorPersen} Koin Hijau
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

// ------------------------------------------------- Versi gestur --------
// KuisKilat: 4 soal per tahap, bar waktu 10 detik per soal, bonus beruntun.
// Aturan skor (0–100, dinormalisasi oleh KuisKilat): tiap jawaban benar
// bernilai 10 poin + 2 poin per tingkat beruntun (jawaban benar ke-2
// beruntun +2, ke-3 +4, dst.), lalu dinormalisasi terhadap poin maksimum
// bila semua soal benar beruntun — jadi 100 hanya bila semua benar.
// KuisKilat sendiri menampilkan penjelasan soal setelah tiap jawaban,
// menyorot jawaban benar bila salah, dan memberi EfekBenar/EfekSalah;
// petunjuk Magi dari data tampil di kartu atas. TanganPenunjuk hanya di
// tahap 1 (tutorial: true di INTERAKSI_MISI['biodiversitas'][0]).

function InspeksiGestur({
  stageIndex,
  onSelesai,
  terjeda = false,
}: {
  stageIndex: number
  onSelesai: (score: number) => void
  terjeda?: boolean
}) {
  const soal = useMemo(
    () =>
      SOAL_INSPEKSI.slice(stageIndex * 4, stageIndex * 4 + 4).map((s) => ({
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawaban: s.jawabanIndex,
        penjelasan: s.penjelasan,
      })),
    [stageIndex],
  )
  const spec = INTERAKSI_MISI['biodiversitas'][Math.min(stageIndex, 2)]
  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [skor, setSkor] = useState(0)

  const kuisSelesai = useCallback((nilai: number) => {
    setSkor(nilai)
    setFase('selesai')
  }, [])

  if (soal.length === 0) {
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
          Inspeksi Tim Adiwiyata · {soal.length} soal, 10 detik per soal
        </span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          Jawab sebelum waktu habis! Jawaban benar beruntun memberi bonus — jawaban salah menampilkan
          jawaban benar dan penjelasannya.
        </p>
        <PetunjukMagi teks={teksMagi(spec.petunjukMagi)} />
      </div>

      {spec.tutorial && (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <TanganPenunjuk label="Ketuk jawaban sebelum waktu habis!" />
        </div>
      )}

      {fase === 'main' && (
        <KuisKilat soal={soal} waktuPerSoalMs={10000} terjeda={terjeda} onSelesai={kuisSelesai} />
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Inspeksi selesai!
          </h3>
          <p>{spec.hasilBenar}</p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skor} Koin Hijau
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
  terjeda = false,
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
        terjeda={terjeda}
      />
    )
  }
  return <InspeksiGestur stageIndex={stageIndex} onSelesai={selesai} terjeda={terjeda} />
}
