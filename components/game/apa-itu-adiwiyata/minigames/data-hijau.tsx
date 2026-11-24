'use client'

// Mini-game Misi Kader "Data Hijau" — Kak Fajar (GESTUR).
// Tiga tahap drag-drop: seret slip data ke sel tabel yang benar, lalu
// seret jawaban ke kotak soal. Isi dari KONTEN_TUGAS['data-hijau']
// (tabel + soal baca data). Gestur tiap tahap dari
// INTERAKSI_MISI['data-hijau'].
// Skor 0–100: Math.round(benar / total * 100) — 3 sel tabel + soal,
// benar di percobaan pertama. onStageComplete dipanggil TEPAT SATU KALI.
// Prop modeSatuKetukan menampilkan versi tombol lama (aksesibilitas).

import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Check, Inbox, X } from 'lucide-react'
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

/** Kolom data pertama dikosongkan untuk dicatat pemain (sisanya terisi). */
const KOLOM_KOSONG = 1

export function DataHijau(props: TugasMiniGameSlotProps) {
  if (props.modeSatuKetukan) return <VersiTombol {...props} />
  return <VersiGestur {...props} />
}

function VersiGestur({ tugasId, stageIndex, onStageComplete }: TugasMiniGameSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId].tahapan[stageIndex]
  const spek = INTERAKSI_MISI[tugasId]?.[stageIndex]
  const isCatat = !!tahap && tahap.jenis === 'catat'
  const tabel = isCatat && tahap.jenis === 'catat' ? tahap.tabel : null
  const soal = isCatat && tahap.jenis === 'catat' ? (tahap.soal ?? []) : []
  const judul = tahap?.judul ?? ''
  const instruksi = tahap?.instruksi ?? ''
  const petunjuk = spek ? bersihkanPetunjuk(spek.petunjukMagi) : 'Coba pikirkan lagi.'
  const hasilBenar = spek?.hasilBenar ?? ''
  const hasilSalah = spek?.hasilSalah ?? ''
  const tutorial = spek?.tutorial ?? false
  const langkah = spek?.langkah ?? []

  // Slip data: satu per baris, nilainya dari kolom yang dikosongkan.
  const slip = useMemo(() => {
    if (!tabel) return []
    return tabel.baris.map((baris, i) => {
      const sel = `${baris[0] ?? ''} · ${tabel.kolom[KOLOM_KOSONG] ?? ''}`
      return {
        kunci: `sel-${i}`,
        label: sel,
        nilai: baris[KOLOM_KOSONG] ?? '',
        teks: `${sel}: ${baris[KOLOM_KOSONG] ?? ''}`,
      }
    })
  }, [tabel])

  const totalItem = slip.length + soal.length

  const [bagian, setBagian] = useState<'catat' | 'soal' | 'selesai'>('catat')
  const [selIndex, setSelIndex] = useState(0)
  const [terisi, setTerisi] = useState<Record<string, string>>({})
  const [upayaSel, setUpayaSel] = useState<Record<number, number>>({})
  const [benarSel, setBenarSel] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [jawabanDipilih, setJawabanDipilih] = useState<number | null>(null)
  const [salahJawaban, setSalahJawaban] = useState<number[]>([])
  const [upayaSoal, setUpayaSoal] = useState<Record<number, number>>({})
  const [benarSoal, setBenarSoal] = useState(0)
  const [umpanSalah, setUmpanSalah] = useState<string | null>(null)
  const [umpanBenar, setUmpanBenar] = useState<string | null>(null)
  const [efekBenar, setEfekBenar] = useState(false)
  const [terkunci, setTerkunci] = useState(false)

  const selesaiRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const skorAkhir = totalItem > 0 ? Math.round(((benarSel + benarSoal) / totalItem) * 100) : 0

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

  const slipAktif = slip[selIndex]
  const pertanyaan = soal[qIndex]
  const jawaban = jawabanDipilih !== null && pertanyaan ? pertanyaan.pilihan[jawabanDipilih] : undefined
  const gagalSel = upayaSel[selIndex] ?? 0
  const gagalSoal = upayaSoal[qIndex] ?? 0

  /** Slip dilepas di sel tabel (benar menurut komponen = sel yang dituju). */
  const dropSlip = () => {
    if (terkunci || !slipAktif) return
    setTerisi((t) => ({ ...t, [slipAktif.kunci]: slipAktif.nilai }))
    if (gagalSel === 0) setBenarSel((b) => b + 1)
    setEfekBenar(true)
    setUmpanSalah(null)
    setUmpanBenar('Tercatat! Lanjut ke slip berikutnya.')
    setTerkunci(true)
    timerRef.current = window.setTimeout(() => {
      setEfekBenar(false)
      setUmpanBenar(null)
      setTerkunci(false)
      if (selIndex + 1 >= slip.length) {
        setBagian(soal.length > 0 ? 'soal' : 'selesai')
      } else {
        setSelIndex((s) => s + 1)
      }
    }, 1000)
  }

  const dropSlipSalah = (_bendaId: string, _targetId?: string) => {
    if (terkunci) return
    setUpayaSel((u) => ({ ...u, [selIndex]: (u[selIndex] ?? 0) + 1 }))
    setUmpanSalah(petunjuk)
  }

  /** Jawaban dilepas di kotak soal. */
  const dropJawaban = () => {
    if (terkunci || jawabanDipilih === null || !pertanyaan) return
    if (jawabanDipilih === pertanyaan.jawaban) {
      if (gagalSoal === 0) setBenarSoal((b) => b + 1)
      setEfekBenar(true)
      setUmpanSalah(null)
      setUmpanBenar(pertanyaan.penjelasan)
      setTerkunci(true)
      timerRef.current = window.setTimeout(() => {
        setEfekBenar(false)
        setUmpanBenar(null)
        setTerkunci(false)
        setJawabanDipilih(null)
        setSalahJawaban([])
        if (qIndex + 1 >= soal.length) {
          setBagian('selesai')
        } else {
          setQIndex((q) => q + 1)
        }
      }, 1200)
    } else {
      setUpayaSoal((u) => ({ ...u, [qIndex]: (u[qIndex] ?? 0) + 1 }))
      setSalahJawaban((d) => [...d, jawabanDipilih])
      // Penjelasan soal dipakai sebagai petunjuk Magi (1 kalimat dari data).
      setUmpanSalah(pertanyaan.penjelasan)
      setJawabanDipilih(null)
    }
  }

  return (
    <div className="aia-stack">
      {bagian !== 'selesai' && (
        <div className="aia-card">
          <span className="aia-kicker">
            Data Hijau · {judul} ·{' '}
            {bagian === 'catat'
              ? `Slip ${Math.min(selIndex + 1, slip.length)} dari ${slip.length}`
              : `Soal ${Math.min(qIndex + 1, soal.length)} dari ${soal.length}`}
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
          <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700 }}>
            Benar: {benarSel + benarSoal}/{totalItem}
          </p>
        </div>
      )}

      {bagian === 'catat' && (
        <>
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
                          style={{
                            border: '1px solid #cbd5ce',
                            padding: '8px 10px',
                            background:
                              j === KOLOM_KOSONG && terisi[`sel-${i}`] === undefined
                                ? '#fef9c3'
                                : undefined,
                            fontWeight: j === KOLOM_KOSONG ? 700 : undefined,
                          }}
                        >
                          {j === KOLOM_KOSONG ? (terisi[`sel-${i}`] ?? '?') : sel}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="aia-muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
              Sel kuning masih kosong — catat slip datanya ke sana.
            </p>
          </div>

          {tutorial && (
            <div style={{ textAlign: 'center' }}>
              <TanganPenunjuk label="Seret slip ke sel yang benar" />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <EfekBenar tampil={efekBenar} />
            {slipAktif && (
              <DragDrop
                key={`sel-${selIndex}`}
                benda={{
                  id: slipAktif.kunci,
                  label: 'Slip data',
                  konten: <span style={{ fontSize: 14, lineHeight: 1.5 }}>{slipAktif.teks}</span>,
                }}
                target={{ id: slipAktif.kunci, label: slipAktif.label }}
                targetLain={slip
                  .filter((s, i) => i !== selIndex)
                  .map((s) => ({ id: s.kunci, label: s.label }))}
                perbesarTarget={gagalSel >= 2}
                disabled={terkunci}
                onBenar={dropSlip}
                onSalah={dropSlipSalah}
              />
            )}
          </div>

          {umpanBenar && (
            <div role="status" style={{ padding: 12, borderRadius: 12, background: '#dcfce7' }}>
              <strong>Benar!</strong> {umpanBenar}
            </div>
          )}
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

      {bagian === 'soal' && pertanyaan && (
        <>
          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {pertanyaan.pertanyaan}
            </p>
            <p className="aia-muted" style={{ margin: '0 0 12px' }}>
              Ketuk jawabannya, lalu seret ke kotak soal.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {pertanyaan.pilihan.map((pilihan, i) => {
                const isSalah = salahJawaban.includes(i)
                const isDipilih = i === jawabanDipilih
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
                    onClick={() => {
                      setJawabanDipilih(i)
                      setUmpanSalah(null)
                    }}
                    aria-label={`Jawaban ${String.fromCharCode(65 + i)}: ${pilihan}`}
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
                    <span>{pilihan}</span>
                    {isDipilih && !isSalah && <Check aria-hidden="true" color="#236b4d" />}
                    {isSalah && <X aria-hidden="true" color="#b83232" />}
                  </button>
                )
              })}
            </div>
          </div>

          {tutorial && jawabanDipilih === null && (
            <div style={{ textAlign: 'center' }}>
              <TanganPenunjuk label="Seret jawaban ke kotak soal" />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <EfekBenar tampil={efekBenar} />
            {jawaban !== undefined && jawabanDipilih !== null && (
              <DragDrop
                key={`${qIndex}-${jawabanDipilih}`}
                benda={{
                  id: `jwb-${jawabanDipilih}`,
                  label: `Jawaban ${String.fromCharCode(65 + jawabanDipilih)}`,
                  konten: <span style={{ fontSize: 14, lineHeight: 1.5 }}>{jawaban}</span>,
                }}
                target={{
                  id: 'kotak-soal',
                  label: 'Kotak jawaban',
                  ikon: <Inbox aria-hidden="true" />,
                }}
                perbesarTarget={gagalSoal >= 2}
                disabled={terkunci}
                onBenar={dropJawaban}
                onSalah={() => undefined}
              />
            )}
          </div>

          {umpanBenar && (
            <div role="status" style={{ padding: 12, borderRadius: 12, background: '#dcfce7' }}>
              <strong>Benar!</strong> {umpanBenar}
            </div>
          )}
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

      {bagian === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Pencatatan selesai!
          </h3>
          <p>{hasilBenar}</p>
          <p>
            Kamu mencatat {benarSel} dari {slip.length} sel dan menjawab {benarSoal} dari{' '}
            {soal.length} soal dengan benar di percobaan pertama. Data yang rapi bikin kerja tim
            Adiwiyata tidak asal tebak!
          </p>
          <p>
            Skor tahap ini: <strong>{skorAkhir} Koin Hijau</strong>
          </p>
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            onClick={() => selesai(skorAkhir)}
          >
            Selesai · +{skorAkhir} Koin Hijau
          </button>
        </div>
      )}
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
            Selesai · +{skorAkhir} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}
