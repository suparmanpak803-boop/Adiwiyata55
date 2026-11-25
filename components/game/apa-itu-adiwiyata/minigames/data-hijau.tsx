'use client'

// Mini-game Misi Kader "Data Hijau" — Kak Fajar (GESTUR).
// Tiga tahap: gambar grafik batang dari tabel, lalu jawab 3 soal baca
// data dengan kuis kilat. Isi dari KONTEN_TUGAS['data-hijau']
// (tabel + soal baca data). Gestur tiap tahap dari
// INTERAKSI_MISI['data-hijau'].
// Skor 0–100 per tahap: 50/50 — 50% skor grafik (aturan GambarGrafik)
// + 50% skor kuis (aturan KuisKilat). onStageComplete dipanggil
// TEPAT SATU KALI saat tahap selesai.
// Prop modeSatuKetukan menampilkan versi tombol lama (aksesibilitas).

import { useMemo, useRef, useState } from 'react'
import { BarChart3, Check, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, koin, salah } from '../suara'
import {
  EfekBenar,
  GambarGrafik,
  KuisKilat,
  PetunjukMagi,
  TanganPenunjuk,
  type BatangGrafik,
  type SoalKilat,
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

/** "3,0" → 3 ; "12" → 12. */
function angka(teks: string | undefined): number {
  const n = parseFloat((teks ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Ambil satuan dari label baris, mis. "Air (m³)" → "m³". */
function satuanDariLabel(label: string): string | undefined {
  const cocok = label.match(/\(([^)]+)\)/)
  return cocok ? cocok[1] : undefined
}

interface TabelData {
  judul: string
  kolom: string[]
  baris: string[][]
}

/**
 * Batang grafik dari tabel tahap itu (semua angka diambil dari data):
 * - Tahap 0 (Sampah Harian): 6 batang (3 kelas × Organik/Anorganik).
 *   Nilai tabel berkoma (3,0 kg), sedangkan GambarGrafik melangkah 1 —
 *   jadi 1 ketuk = 0,5 kg (nilaiBenar = kg × 2, maks 10).
 * - Tahap 1 (Air+Listrik): 3 batang = yang dihemat minggu ini
 *   (minggu lalu − minggu ini), karena nilai mentahnya sampai 180 dan
 *   tidak masuk akal diketuk satu per satu; hemat adalah isi soal tahap
 *   ini juga.
 * - Tahap 2 (Tanaman): 3 batang = jumlah tanaman per jenis.
 */
function batangDariTabel(stageIndex: number, tabel: TabelData): BatangGrafik[] {
  if (stageIndex === 0) {
    const batang: BatangGrafik[] = []
    tabel.baris.forEach((baris, i) => {
      for (let j = 1; j < baris.length; j += 1) {
        batang.push({
          id: `batang-${i}-${j}`,
          label: `${baris[0] ?? ''} · ${tabel.kolom[j] ?? ''}`,
          nilaiBenar: Math.round(angka(baris[j]) * 2),
          maks: 10,
        })
      }
    })
    return batang
  }
  if (stageIndex === 1) {
    return tabel.baris.map((baris, i) => {
      const hemat = angka(baris[1]) - angka(baris[2])
      return {
        id: `batang-${i}`,
        label: baris[0] ?? '',
        nilaiBenar: Math.round(hemat),
        maks: 20,
        satuan: satuanDariLabel(baris[0] ?? ''),
      }
    })
  }
  return tabel.baris.map((baris, i) => ({
    id: `batang-${i}`,
    label: baris[0] ?? '',
    nilaiBenar: Math.round(angka(baris[1])),
    maks: 30,
    satuan: 'tanaman',
  }))
}

/** Penjelasan skala batang per tahap (ditampilkan di atas grafik). */
function penjelasanSkala(stageIndex: number): string {
  if (stageIndex === 0) return 'Tiap ketuk = 0,5 kg. Atur tiap batang sesuai angka di tabel.'
  if (stageIndex === 1)
    return 'Batang = jumlah yang dihemat minggu ini (minggu lalu − minggu ini).'
  return 'Atur tiap batang sesuai jumlah tanaman di tabel.'
}

export function DataHijau(props: TugasMiniGameSlotProps) {
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
  const isCatat = !!tahap && tahap.jenis === 'catat'
  const tabel = isCatat && tahap.jenis === 'catat' ? tahap.tabel : null
  const soal = isCatat && tahap.jenis === 'catat' ? (tahap.soal ?? []) : []
  const judul = tahap?.judul ?? ''
  const instruksi = tahap?.instruksi ?? ''
  const petunjuk = spek ? bersihkanPetunjuk(spek.petunjukMagi) : 'Coba pikirkan lagi.'
  const hasilBenar = spek?.hasilBenar ?? ''
  const tutorial = spek?.tutorial ?? false
  const langkah = spek?.langkah ?? []

  // Batang grafik dari tabel (sekali per tahap).
  const batang = useMemo(
    () => (tabel ? batangDariTabel(stageIndex, tabel) : []),
    [tabel, stageIndex],
  )

  // Soal kuis kilat dari soal baca data (sekali per tahap).
  const soalKilat = useMemo<SoalKilat[]>(
    () =>
      soal.map((s) => ({
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawaban: s.jawaban,
        penjelasan: s.penjelasan,
      })),
    [soal],
  )

  const [bagian, setBagian] = useState<'grafik' | 'kuis' | 'selesai'>('grafik')
  const [skorGrafik, setSkorGrafik] = useState(0)
  const [skorKuis, setSkorKuis] = useState(0)
  const [tampilPetunjuk, setTampilPetunjuk] = useState(false)

  const selesaiRef = useRef(false)

  // Skor tahap = 50% grafik + 50% kuis.
  const skorAkhir = Math.round((skorGrafik + skorKuis) / 2)

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(nilai)
  }

  if (!tahap || !isCatat || !tabel) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  /** Grafik selesai — lanjut ke kuis soal tabel. */
  const grafikSelesai = (nilai: number) => {
    setSkorGrafik(nilai)
    setBagian('kuis')
  }

  /** Kuis selesai — hitung skor akhir 50/50. */
  const kuisSelesai = (nilai: number) => {
    setSkorKuis(nilai)
    setBagian('selesai')
  }

  return (
    <div className="aia-stack">
      {bagian !== 'selesai' && (
        <div className="aia-card">
          <span className="aia-kicker">
            Data Hijau · {judul} ·{' '}
            {bagian === 'grafik' ? 'Gambar grafik' : `Kuis · ${soal.length} soal`}
          </span>
          <p className="aia-muted" style={{ margin: '8px 0 0' }}>
            {instruksi}
          </p>
          {langkah.length > 0 && (
            <ol style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
              {langkah.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          )}
          {bagian === 'kuis' && (
            <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700 }}>
              Skor grafik: {skorGrafik}
            </p>
          )}
        </div>
      )}

      {bagian === 'grafik' && (
        <>
          <TabelReferensi tabel={tabel} />

          {tutorial && (
            <div style={{ textAlign: 'center' }}>
              <TanganPenunjuk label="Ketuk naik/turun sampai batangnya sesuai tabel" />
            </div>
          )}

          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {penjelasanSkala(stageIndex)}
            </p>
            <GambarGrafik
              key={stageIndex}
              batang={batang}
              modeSatuKetukan={modeSatuKetukan}
              terjeda={terjeda}
              onSelesai={grafikSelesai}
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

      {bagian === 'kuis' && (
        <>
          <TabelReferensi tabel={tabel} />
          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              Sekarang jawab soal dari tabelnya — cepat!
            </p>
            <KuisKilat
              key={stageIndex}
              soal={soalKilat}
              modeSatuKetukan={modeSatuKetukan}
              terjeda={terjeda}
              onSelesai={kuisSelesai}
            />
          </div>
        </>
      )}

      {bagian === 'selesai' && (
        <div className="aia-card aia-pos-hijau" style={{ position: 'relative' }}>
          <EfekBenar tampil />
          <h3>
            <Check aria-hidden="true" /> Pencatatan selesai!
          </h3>
          <p>{hasilBenar}</p>
          <p>
            Skor grafik: <strong>{skorGrafik}</strong> · Skor kuis: <strong>{skorKuis}</strong>
          </p>
          <p>
            Data yang rapi bikin kerja tim Adiwiyata tidak asal tebak!
          </p>
          <p>
            Skor tahap ini: <strong>{skorAkhir} Koin Hijau</strong>
          </p>
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            onClick={() => selesai(skorAkhir)}
          >
            {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skorAkhir} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

/** Tabel data tahap itu, tampil sebagai referensi saat menggambar grafik dan kuis. */
function TabelReferensi({ tabel }: { tabel: TabelData }) {
  return (
    <div className="aia-card" aria-label="Tabel data">
      <p style={{ margin: '0 0 10px', fontWeight: 700 }}>
        <BarChart3 aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tabel.judul}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {tabel.kolom.map((kolom) => (
                <th
                  key={kolom}
                  scope="col"
                  style={{
                    border: '1px solid #cbd5ce',
                    padding: '8px 10px',
                    textAlign: 'left',
                    background: '#eef3ee',
                  }}
                >
                  {kolom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabel.baris.map((baris, i) => (
              <tr key={i}>
                {baris.map((sel, j) => (
                  <td
                    key={j}
                    style={{ border: '1px solid #cbd5ce', padding: '8px 10px' }}
                  >
                    {sel}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Versi tombol lama — dipakai sebagai alternatif satu-ketukan. */
function VersiTombol({ stageIndex, onStageComplete }: TugasMiniGameSlotProps) {
  const tahap = KONTEN_TUGAS['data-hijau'].tahapan[stageIndex]

  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [qIndex, setQIndex] = useState(0)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [dijawab, setDijawab] = useState(false)
  const [benarCount, setBenarCount] = useState(0)

  const selesaiRef = useRef(false)

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  if (!tahap || tahap.jenis !== 'catat' || !tahap.soal || tahap.soal.length === 0) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  const tabel = tahap.tabel
  const soal = tahap.soal
  const pertanyaan = soal[qIndex]
  const skorAkhir = Math.round((benarCount / soal.length) * 100)

  const jawab = (index: number) => {
    if (dijawab || fase !== 'main') return
    const isBenar = index === pertanyaan.jawaban
    setDipilih(index)
    setDijawab(true)
    if (isBenar) {
      setBenarCount((c) => c + 1)
      benar()
      koin()
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
              Data Hijau · {tahap.judul} · Soal {qIndex + 1} dari {soal.length}
            </span>
            <p className="aia-muted" style={{ margin: '8px 0 0' }}>
              {tahap.instruksi}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700 }}>
              Jawaban benar: {benarCount}/{soal.length}
            </p>
          </div>

          <div className="aia-card" aria-label="Tabel data">
            <p style={{ margin: '0 0 10px', fontWeight: 700 }}>
              <BarChart3 aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tabel.judul}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    {tabel.kolom.map((kolom) => (
                      <th
                        key={kolom}
                        scope="col"
                        style={{
                          border: '1px solid #cbd5ce',
                          padding: '8px 10px',
                          textAlign: 'left',
                          background: '#eef3ee',
                        }}
                      >
                        {kolom}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabel.baris.map((baris, i) => (
                    <tr key={i}>
                      {baris.map((sel, j) => (
                        <td
                          key={j}
                          style={{ border: '1px solid #cbd5ce', padding: '8px 10px' }}
                        >
                          {sel}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {pertanyaan.pertanyaan}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
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
            <Check aria-hidden="true" /> Pencatatan selesai!
          </h3>
          <p>
            Kamu menjawab {benarCount} dari {soal.length} soal baca data dengan benar. Data yang
            rapi bikin kerja tim Adiwiyata tidak asal tebak!
          </p>
          <p>
            Skor tahap ini: <strong>{skorAkhir} Koin Hijau</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skorAkhir)}>
            {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skorAkhir} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}
