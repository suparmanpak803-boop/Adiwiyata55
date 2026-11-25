'use client'

// Mini-game Misi Kader "Inovasi Hijau" — Kak Raka (GESTUR).
// Tiga tahap puzzle geser: susun 9 potongan poster kampanye sampai
// urut. Isi dari KONTEN_TUGAS['inovasi-hijau'] (3 desain per tahap,
// 1 benar + alasan). Gestur tiap tahap dari
// INTERAKSI_MISI['inovasi-hijau'].
// Skor 0–100: aturan PuzzleGeser — mulai 100, dikurangi 5 poin untuk
// setiap pertukaran di atas jumlah minimal. onStageComplete dipanggil
// TEPAT SATU KALI saat tahap selesai.
// Prop modeSatuKetukan menampilkan versi tombol lama (aksesibilitas).

import { useMemo, useRef, useState } from 'react'
import { Check, Lightbulb, Megaphone, Sparkles, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, koin, salah } from '../suara'
import {
  EfekBenar,
  PetunjukMagi,
  PuzzleGeser,
  TanganPenunjuk,
  type PotonganPuzzle,
} from '../interaksi'

export interface TugasMiniGameSlotProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  modeSatuKetukan?: boolean
  terjeda?: boolean
}

/** Bersihkan 'Magi: "..."' menjadi kalimat petunjuk saja. */
function bersihkanPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '').trim()
}

/**
 * Potongan poster 3×3 dari teks data tahap itu saja (tanpa gambar baru):
 * judul + brief + teks desain yang benar, dibagi menjadi 9 kelompok kata.
 * Urutan benar = urutan baca poster dari atas ke bawah.
 */
function potonganPoster(judul: string, brief: string, teksBenar: string): PotonganPuzzle[] {
  const kata = `${judul} ${brief} ${teksBenar}`.split(/\s+/).filter(Boolean)
  const jumlah = 9
  const perKelompok = Math.max(1, Math.ceil(kata.length / jumlah))
  const potongan: PotonganPuzzle[] = []
  for (let i = 0; i < jumlah; i += 1) {
    const kelompok = kata.slice(i * perKelompok, (i + 1) * perKelompok)
    if (kelompok.length === 0) break
    const teks = kelompok.join(' ')
    potongan.push({
      id: `potongan-${i}`,
      label: teks,
      konten: (
        <span aria-hidden="true" style={{ fontSize: 22 }}>
          🧩
        </span>
      ),
    })
  }
  return potongan
}

export function InovasiHijau(props: TugasMiniGameSlotProps) {
  if (props.modeSatuKetukan) return <VersiTombol {...props} />
  return <VersiGestur {...props} />
}

function VersiGestur({
  tugasId,
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
  terjeda = false,
}: TugasMiniGameSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId].tahapan[stageIndex]
  const spek = INTERAKSI_MISI[tugasId]?.[stageIndex]
  const pilihan = tahap && tahap.jenis === 'pilih' ? tahap.pilihan : []
  const brief = tahap && tahap.jenis === 'pilih' ? tahap.brief : ''
  const judul = tahap?.judul ?? ''
  const instruksi = tahap?.instruksi ?? ''
  const petunjuk = spek ? bersihkanPetunjuk(spek.petunjukMagi) : 'Coba pikirkan lagi.'
  const hasilBenar = spek?.hasilBenar ?? ''
  const tutorial = spek?.tutorial ?? false
  const langkah = spek?.langkah ?? []

  const opsiBenar = pilihan.find((p) => p.benar)

  // 9 potongan poster dari desain yang benar (sekali per tahap).
  const potongan = useMemo(
    () => (opsiBenar ? potonganPoster(judul, brief, opsiBenar.teks) : []),
    [opsiBenar, judul, brief],
  )

  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [skor, setSkor] = useState(0)
  const [tampilPetunjuk, setTampilPetunjuk] = useState(false)

  const selesaiRef = useRef(false)

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(nilai)
  }

  if (!tahap || tahap.jenis !== 'pilih' || pilihan.length === 0 || !opsiBenar) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  /** Puzzle selesai — komponen sudah menghitung skor 0–100. */
  const puzzleSelesai = (nilai: number) => {
    setSkor(nilai)
    setFase('selesai')
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">Inovasi Hijau</span>
            <h3 className="aia-section-title" style={{ marginTop: 4 }}>
              <Lightbulb aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {judul}
            </h3>
            <p className="aia-muted" style={{ marginBottom: 0 }}>
              {instruksi}
            </p>
            {langkah.length > 0 && (
              <ol style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
                {langkah.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
            )}
          </div>

          <div className="aia-dialog" aria-label="Brief kampanye">
            <strong>
              <Megaphone aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Brief:
            </strong>
            <p>{brief}</p>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              Susun posternya: ketuk dua petak untuk menukar isinya sampai urut.
            </p>
            {tutorial && (
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <TanganPenunjuk label="Ketuk dua petak untuk menukar isinya" />
              </div>
            )}
            <PuzzleGeser
              key={stageIndex}
              potongan={potongan}
              modeSatuKetukan={modeSatuKetukan}
              terjeda={terjeda}
              onSelesai={puzzleSelesai}
            />
          </div>

          {!tampilPetunjuk ? (
            <button
              type="button"
              className="aia-btn aia-btn-ghost"
              style={{ minHeight: 44, alignSelf: 'center' }}
              onClick={() => setTampilPetunjuk(true)}
            >
              Minta petunjuk Magi
            </button>
          ) : (
            <PetunjukMagi teks={petunjuk} />
          )}
        </>
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau" style={{ position: 'relative' }}>
          <EfekBenar tampil />
          <h3>
            <Sparkles aria-hidden="true" /> Tahap selesai!
          </h3>
          <p>{hasilBenar}</p>
          <p>
            <strong>Kenapa ini yang terbaik:</strong> {opsiBenar.alasan}
          </p>
          <p>
            Desain yang benar: <strong>{opsiBenar.teks}</strong>
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
            {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

/** Versi tombol lama — dipakai sebagai alternatif satu-ketukan. */
function VersiTombol({ tugasId, stageIndex, onStageComplete }: TugasMiniGameSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId].tahapan[stageIndex]
  const pilihan = useMemo(() => (tahap && tahap.jenis === 'pilih' ? tahap.pilihan : []), [tahap])
  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [dipilihBenar, setDipilihBenar] = useState(false)
  const [salahDipilih, setSalahDipilih] = useState<number[]>([])
  const [percobaan, setPercobaan] = useState(0)
  const [skor, setSkor] = useState(0)
  const [umpan, setUmpan] = useState<{ jenis: 'benar' | 'salah'; teks: string } | null>(null)

  const selesaiRef = useRef(false)

  const selesai = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(skor)
  }

  if (!tahap || tahap.jenis !== 'pilih') {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  const pilih = (index: number) => {
    if (fase !== 'main' || dipilihBenar || salahDipilih.includes(index)) return
    const opsi = pilihan[index]
    if (!opsi) return
    const percobaanBaru = percobaan + 1
    setPercobaan(percobaanBaru)
    if (opsi.benar) {
      setDipilihBenar(true)
      setSkor(percobaanBaru === 1 ? 100 : percobaanBaru === 2 ? 60 : 30)
      setUmpan({ jenis: 'benar', teks: opsi.alasan })
      benar()
    } else {
      setSalahDipilih((d) => [...d, index])
      setUmpan({
        jenis: 'salah',
        teks: opsi.alasan.trim() ? opsi.alasan : 'Coba pikirkan lagi.',
      })
      salah()
    }
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">Inovasi Hijau</span>
            <h3 className="aia-section-title" style={{ marginTop: 4 }}>
              <Lightbulb aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tahap.judul}
            </h3>
            <p className="aia-muted" style={{ marginBottom: 0 }}>
              {tahap.instruksi}
            </p>
          </div>

          <div className="aia-dialog" aria-label="Brief kampanye">
            <strong>
              <Megaphone aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Brief:
            </strong>
            <p>{tahap.brief}</p>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              Mana desain yang paling efektif?
            </p>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {pilihan.map((opsi, i) => {
                const isSalah = salahDipilih.includes(i)
                const isBenarDipilih = dipilihBenar && opsi.benar
                let latar: string | undefined
                let border: string | undefined
                if (isBenarDipilih) {
                  latar = '#dcfce7'
                  border = '2px solid #236b4d'
                } else if (isSalah) {
                  latar = '#fee2e2'
                  border = '2px solid #b83232'
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className="aia-btn aia-btn-block"
                    disabled={dipilihBenar || isSalah}
                    onClick={() => pilih(i)}
                    aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${opsi.teks}`}
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
                    <span>{opsi.teks}</span>
                    {isBenarDipilih && <Check aria-hidden="true" color="#236b4d" />}
                    {isSalah && <X aria-hidden="true" color="#b83232" />}
                  </button>
                )
              })}
            </div>

            {umpan && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: umpan.jenis === 'benar' ? '#dcfce7' : '#fee2e2',
                }}
              >
                <strong>{umpan.jenis === 'benar' ? 'Tepat!' : 'Belum tepat.'}</strong> {umpan.teks}
              </div>
            )}

            {dipilihBenar && (
              <button
                type="button"
                className="aia-btn aia-btn-primary aia-btn-block"
                style={{ marginTop: 12 }}
                onClick={() => setFase('selesai')}
              >
                Lihat hasil
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
            Kamu menemukan desain yang paling efektif
            {percobaan > 1 ? ` setelah ${percobaan} percobaan` : ' di percobaan pertama'}.
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={selesai}>
            {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}
