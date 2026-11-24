'use client'

// Mini-game Bab 6 "Inspeksi Tim Adiwiyata" — bos akhir kampanye.
// Kuis aksi cepat dari SOAL_INSPEKSI (12 soal): 4 soal per tahap sesuai
// stageIndex. Tiap soal punya bar waktu 15 detik (25 detik di mode mudah),
// 3 nyawa per tahap. Jawaban benar +10, bonus +5 bila dijawab dalam 5 detik
// pertama. Salah atau waktu habis: -1 nyawa + penjelasan soal. Setelah 4
// soal, onStageComplete(score) dipanggil TEPAT SATU KALI.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clock, Heart, Lightbulb, RotateCcw, X } from 'lucide-react'
import { SOAL_INSPEKSI } from '@/lib/apa-itu-adiwiyata/content/pertanyaan'
import type { MiniGameSlotProps } from '../bab-shell'
import { benar, getar, koin, nyawa, salah, tik } from '../suara'

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

export function Inspeksi({ stageIndex, onStageComplete }: MiniGameSlotProps) {
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
