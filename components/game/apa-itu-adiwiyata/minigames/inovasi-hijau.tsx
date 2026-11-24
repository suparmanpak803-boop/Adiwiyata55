'use client'

// Mini-game Misi Kader "Inovasi Hijau" — Kak Raka (GESTUR).
// Tiga tahap drag-drop: seret desain yang paling efektif ke kanvas
// (bukan tombol pilihan). Isi dari KONTEN_TUGAS['inovasi-hijau'].
// Gestur tiap tahap dari INTERAKSI_MISI['inovasi-hijau'].
// Skor 0–100: benar di percobaan pertama 100, kedua 60, ketiga 30.
// onStageComplete dipanggil TEPAT SATU KALI saat tahap selesai.
// Prop modeSatuKetukan menampilkan versi tombol lama (aksesibilitas).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Frame, Lightbulb, Megaphone, Sparkles, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, koin, salah } from '../suara'
import { DragDrop, EfekBenar, EfekSalah, TanganPenunjuk } from '../interaksi'

export interface TugasMiniGameSlotProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  modeSatuKetukan?: boolean
}

/** Bersihkan 'Magi: "..."' menjadi kalimat petunjuk saja. */
function bersihkanPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '').trim()
}

export function InovasiHijau(props: TugasMiniGameSlotProps) {
  if (props.modeSatuKetukan) return <VersiTombol {...props} />
  return <VersiGestur {...props} />
}

function VersiGestur({ tugasId, stageIndex, onStageComplete }: TugasMiniGameSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId].tahapan[stageIndex]
  const spek = INTERAKSI_MISI[tugasId]?.[stageIndex]
  const pilihan = tahap && tahap.jenis === 'pilih' ? tahap.pilihan : []
  const brief = tahap && tahap.jenis === 'pilih' ? tahap.brief : ''
  const judul = tahap?.judul ?? ''
  const instruksi = tahap?.instruksi ?? ''
  const petunjuk = spek ? bersihkanPetunjuk(spek.petunjukMagi) : 'Coba pikirkan lagi.'
  const targetLabel = spek?.target ?? 'Kanvas'
  const hasilBenar = spek?.hasilBenar ?? ''
  const hasilSalah = spek?.hasilSalah ?? ''
  const tutorial = spek?.tutorial ?? false
  const langkah = spek?.langkah ?? []

  const [dipilih, setDipilih] = useState(0)
  const [salahDipilih, setSalahDipilih] = useState<number[]>([])
  const [gagal, setGagal] = useState(0)
  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [skor, setSkor] = useState(0)
  const [umpanSalah, setUmpanSalah] = useState<string | null>(null)
  const [efekBenar, setEfekBenar] = useState(false)
  const [terkunci, setTerkunci] = useState(false)
  const [ronde, setRonde] = useState(0)

  const selesaiRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(nilai)
  }

  if (!tahap || tahap.jenis !== 'pilih' || pilihan.length === 0) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  const opsi = pilihan[dipilih]

  /** DragDrop memanggil ini saat benda dilepas di kanvas. */
  const dropKeKanvas = () => {
    if (terkunci || !opsi) return
    if (opsi.benar) {
      const nilai = gagal === 0 ? 100 : gagal === 1 ? 60 : 30
      setSkor(nilai)
      setEfekBenar(true)
      setUmpanSalah(null)
      setTerkunci(true)
      timerRef.current = window.setTimeout(() => setFase('selesai'), 1200)
    } else {
      const gagalBaru = [...salahDipilih, dipilih]
      setGagal((g) => g + 1)
      setSalahDipilih(gagalBaru)
      setUmpanSalah(petunjuk)
      setRonde((r) => r + 1)
      // Pilih otomatis desain berikutnya yang belum dicoba salah.
      const berikutnya = pilihan.findIndex((_, i) => !gagalBaru.includes(i))
      if (berikutnya >= 0) setDipilih(berikutnya)
    }
  }

  const pilihKartu = (index: number) => {
    if (terkunci || salahDipilih.includes(index)) return
    setDipilih(index)
    setUmpanSalah(null)
  }

  const opsiBenar = pilihan.find((p) => p.benar)

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">Kader Inovasi Hijau</span>
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
              Ketuk desainnya, lalu seret ke kanvas.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {pilihan.map((p, i) => {
                const isSalah = salahDipilih.includes(i)
                const isDipilih = i === dipilih
                let latar: string | undefined
                let border: string | undefined
                if (isDipilih) {
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
                    disabled={terkunci || isSalah}
                    onClick={() => pilihKartu(i)}
                    aria-label={`Desain ${String.fromCharCode(65 + i)}: ${p.teks}`}
                    aria-pressed={isDipilih}
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
                    <span>{p.teks}</span>
                    {isDipilih && !isSalah && <Check aria-hidden="true" color="#236b4d" />}
                    {isSalah && <X aria-hidden="true" color="#b83232" />}
                  </button>
                )
              })}
            </div>
          </div>

          {tutorial && (
            <div style={{ textAlign: 'center' }}>
              <TanganPenunjuk label="Seret desain terbaik ke kanvas" />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <EfekBenar tampil={efekBenar} />
            {opsi && (
              <DragDrop
                key={`${dipilih}-${ronde}`}
                benda={{
                  id: `desain-${dipilih}`,
                  label: `Desain ${String.fromCharCode(65 + dipilih)}`,
                  konten: <span style={{ fontSize: 14, lineHeight: 1.5 }}>{opsi.teks}</span>,
                }}
                target={{
                  id: 'kanvas',
                  label: targetLabel,
                  ikon: <Frame aria-hidden="true" />,
                }}
                perbesarTarget={gagal >= 2}
                disabled={terkunci}
                onBenar={dropKeKanvas}
                onSalah={() => undefined}
              />
            )}
          </div>

          {umpanSalah && (
            <div>
              <p className="aia-muted" style={{ margin: '0 0 8px' }}>
                {hasilSalah}
              </p>
              <EfekSalah tampil petunjuk={umpanSalah} />
            </div>
          )}
        </>
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Sparkles aria-hidden="true" /> Tahap selesai!
          </h3>
          <p>{hasilBenar}</p>
          {opsiBenar && (
            <p>
              <strong>Kenapa ini yang terbaik:</strong> {opsiBenar.alasan}
            </p>
          )}
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
            Selesai · +{skor} Koin Hijau
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
            <span className="aia-kicker">Kader Inovasi Hijau</span>
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
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}
