'use client'

// Mini-game Misi Kader "Kantin Hijau" — Mbak Dewi (GESTUR).
// Tiga tahap cari-objek + drag-drop: cari masalah di kantin, ketuk,
// lalu seret tindakan yang benar ke masalah itu. Isi dari
// KONTEN_TUGAS['kantin-hijau'] (12 temuan). Gestur tiap tahap dari
// INTERAKSI_MISI['kantin-hijau'].
// Skor 0–100: 25 per temuan bila benar di seretan pertama, 10 bila
// setelah gagal. onStageComplete dipanggil TEPAT SATU KALI.
// Prop modeSatuKetukan menampilkan versi tombol lama (aksesibilitas).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ClipboardCheck, Search, Wrench, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, koin, salah } from '../suara'
import { DragDrop, EfekBenar, EfekSalah, HiddenObject, TanganPenunjuk } from '../interaksi'

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

function acak<T>(arr: T[]): T[] {
  const hasil = [...arr]
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[hasil[i], hasil[j]] = [hasil[j], hasil[i]]
  }
  return hasil
}

/** Posisi (x%, y%) tiap temuan di area pencarian; diputar per tahap. */
const POS_TEMUAN: Array<[number, number]> = [
  [22, 26],
  [72, 24],
  [26, 72],
  [74, 70],
]

/** Ikon tiap temuan, per tahap (hanya hiasan — isi tetap dari data). */
const IKON_TEMUAN: string[][] = [
  ['🍽️', '🧽', '⚠️', '🗑️'],
  ['🛍️', '🥤', '📦', '🗑️'],
  ['🥤', '🍔', '🧤', '🗑️'],
]

const SKOR_PERTAMA = 25
const SKOR_SESUDAH_GAGAL = 10

interface OpsiTindakan {
  teks: string
  benar: boolean
}

export function KantinHijau(props: TugasMiniGameSlotProps) {
  if (props.modeSatuKetukan) return <VersiTombol {...props} />
  return <VersiGestur {...props} />
}

function VersiGestur({ tugasId, stageIndex, onStageComplete }: TugasMiniGameSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId].tahapan[stageIndex]
  const spek = INTERAKSI_MISI[tugasId]?.[stageIndex]
  const temuan = tahap && tahap.jenis === 'inspeksi' ? tahap.temuan : []
  const judul = tahap?.judul ?? ''
  const instruksi = tahap?.instruksi ?? ''
  const petunjuk = spek ? bersihkanPetunjuk(spek.petunjukMagi) : 'Coba pikirkan lagi.'
  const hasilBenar = spek?.hasilBenar ?? ''
  const hasilSalah = spek?.hasilSalah ?? ''
  const tutorial = spek?.tutorial ?? false
  const langkah = spek?.langkah ?? []

  // Acak urutan 3 pilihan tindakan tiap temuan (sekali per tahap).
  const opsiPerTemuan = useMemo(
    () =>
      temuan.map((t) =>
        acak<OpsiTindakan>([
          { teks: t.tindakan, benar: true },
          { teks: t.pilihanSalah[0], benar: false },
          { teks: t.pilihanSalah[1], benar: false },
        ]),
      ),
    [temuan],
  )

  // Objek pencarian (identitas stabil per tahap — HiddenObject mereset
  // bila array ini berubah).
  const objek = useMemo(
    () =>
      temuan.map((t, i) => ({
        id: `temuan-${i}`,
        label: t.masalah,
        x: POS_TEMUAN[(i + stageIndex) % POS_TEMUAN.length][0],
        y: POS_TEMUAN[(i + stageIndex) % POS_TEMUAN.length][1],
        ikon: <span aria-hidden="true">{IKON_TEMUAN[stageIndex % IKON_TEMUAN.length]?.[i] ?? '🔍'}</span>,
      })),
    [temuan, stageIndex],
  )

  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [ditemukan, setDitemukan] = useState<number[]>([])
  const [terpilih, setTerpilih] = useState<number | null>(null)
  const [diselesaikan, setDiselesaikan] = useState<number[]>([])
  const [upaya, setUpaya] = useState<Record<number, number>>({})
  const [aksiSalah, setAksiSalah] = useState<Record<number, number[]>>({})
  const [aksiDipilih, setAksiDipilih] = useState<number | null>(null)
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

  if (!tahap || tahap.jenis !== 'inspeksi' || temuan.length === 0) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  const temuanAktif = terpilih !== null ? temuan[terpilih] : undefined
  const opsiAktif = terpilih !== null ? (opsiPerTemuan[terpilih] ?? []) : []
  const aksi = aksiDipilih !== null ? opsiAktif[aksiDipilih] : undefined
  const gagalAktif = terpilih !== null ? (upaya[terpilih] ?? 0) : 0

  const temukan = (id: string) => {
    const i = Number(id.replace('temuan-', ''))
    if (Number.isNaN(i) || diselesaikan.includes(i)) return
    setDitemukan((d) => (d.includes(i) ? d : [...d, i]))
    setTerpilih(i)
    setAksiDipilih(null)
    setUmpanSalah(null)
  }

  const pilihTemuan = (i: number) => {
    if (terkunci || diselesaikan.includes(i)) return
    setTerpilih(i)
    setAksiDipilih(null)
    setUmpanSalah(null)
  }

  /** DragDrop memanggil ini saat tindakan dilepas di masalahnya. */
  const dropTindakan = () => {
    if (terkunci || terpilih === null || aksiDipilih === null || !aksi) return
    if (aksi.benar) {
      const baru = [...diselesaikan, terpilih]
      setDiselesaikan(baru)
      setSkor((s) => s + (gagalAktif === 0 ? SKOR_PERTAMA : SKOR_SESUDAH_GAGAL))
      setEfekBenar(true)
      setUmpanSalah(null)
      setTerkunci(true)
      timerRef.current = window.setTimeout(() => {
        setEfekBenar(false)
        setTerkunci(false)
        setTerpilih(null)
        setAksiDipilih(null)
        if (baru.length >= temuan.length) setFase('selesai')
      }, 1200)
    } else {
      setUpaya((u) => ({ ...u, [terpilih]: (u[terpilih] ?? 0) + 1 }))
      setAksiSalah((a) => ({
        ...a,
        [terpilih]: [...(a[terpilih] ?? []), aksiDipilih],
      }))
      setUmpanSalah(petunjuk)
      setRonde((r) => r + 1)
      setAksiDipilih(null)
    }
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">
              Kantin Hijau · {judul} · Selesai {diselesaikan.length} dari {temuan.length}
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
            <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700 }}>Skor: {skor}</p>
          </div>

          {tutorial && ditemukan.length === 0 && (
            <div style={{ textAlign: 'center' }}>
              <TanganPenunjuk label="Cari masalahnya, ketuk!" />
            </div>
          )}

          <HiddenObject objek={objek} onTemukan={temukan} onSelesai={() => undefined} />

          {ditemukan.length > 0 && (
            <div className="aia-card" aria-label="Temuan yang sudah ditemukan">
              <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
                <Search aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Temuan:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ditemukan.map((i) => {
                  const sudah = diselesaikan.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      className="aia-btn aia-btn-ghost"
                      disabled={terkunci || sudah}
                      onClick={() => pilihTemuan(i)}
                      aria-label={`Temuan ${i + 1}: ${temuan[i]?.masalah ?? ''}`}
                      style={{
                        minHeight: 44,
                        background: sudah ? '#dcfce7' : terpilih === i ? '#dcfce7' : undefined,
                        border: terpilih === i ? '2px solid #236b4d' : undefined,
                      }}
                    >
                      {sudah ? '✓ ' : ''}Temuan {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {temuanAktif && terpilih !== null && !diselesaikan.includes(terpilih) && (
            <div style={{ position: 'relative' }}>
              <EfekBenar tampil={efekBenar} />
              <div className="aia-card">
                <p style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
                  <ClipboardCheck aria-hidden="true" style={{ verticalAlign: '-3px' }} />{' '}
                  {temuanAktif.masalah}
                </p>
                <p className="aia-muted" style={{ margin: '0 0 12px' }}>
                  Ketuk tindakan yang benar, lalu seret ke masalahnya.
                </p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {opsiAktif.map((pilihan, i) => {
                    const isSalah = (aksiSalah[terpilih] ?? []).includes(i)
                    const isDipilih = i === aksiDipilih
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
                          setAksiDipilih(i)
                          setUmpanSalah(null)
                        }}
                        aria-label={`Tindakan ${String.fromCharCode(65 + i)}: ${pilihan.teks}`}
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
                        <span>{pilihan.teks}</span>
                        {isDipilih && !isSalah && <Check aria-hidden="true" color="#236b4d" />}
                        {isSalah && <X aria-hidden="true" color="#b83232" />}
                      </button>
                    )
                  })}
                </div>

                {tutorial && aksiDipilih === null && (
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <TanganPenunjuk label="Ketuk tindakan yang benar" />
                  </div>
                )}
                {tutorial && aksiDipilih !== null && (
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <TanganPenunjuk label="Seret ke masalahnya" />
                  </div>
                )}

                {aksi && (
                  <div style={{ marginTop: 12 }}>
                    <DragDrop
                      key={`${terpilih}-${aksiDipilih}-${ronde}`}
                      benda={{
                        id: `aksi-${aksiDipilih}`,
                        label: `Tindakan ${String.fromCharCode(65 + (aksiDipilih ?? 0))}`,
                        konten: <span style={{ fontSize: 14, lineHeight: 1.5 }}>{aksi.teks}</span>,
                      }}
                      target={{
                        id: 'masalah',
                        label: `Atasi: ${temuanAktif.masalah}`,
                        ikon: <Wrench aria-hidden="true" />,
                      }}
                      perbesarTarget={gagalAktif >= 2}
                      disabled={terkunci}
                      onBenar={dropTindakan}
                      onSalah={() => undefined}
                    />
                  </div>
                )}
              </div>
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

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Inspeksi kantin selesai!
          </h3>
          <p>{hasilBenar}</p>
          <p>
            Kamu menyelesaikan {diselesaikan.length} dari {temuan.length} temuan. Kantin jadi
            lebih bersih dan sehat berkatmu!
          </p>
          <p>
            Skor tahap ini: <strong>{skor} Koin Hijau</strong>
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
function VersiTombol({ stageIndex, onStageComplete }: TugasMiniGameSlotProps) {
  const tahap = KONTEN_TUGAS['kantin-hijau'].tahapan[stageIndex]

  // Acak urutan 3 pilihan tindakan tiap temuan (sekali per tahap).
  const opsiPerTemuan = useMemo(() => {
    if (!tahap || tahap.jenis !== 'inspeksi') return []
    return tahap.temuan.map((t) =>
      acak<OpsiTindakan>([
        { teks: t.tindakan, benar: true },
        { teks: t.pilihanSalah[0], benar: false },
        { teks: t.pilihanSalah[1], benar: false },
      ]),
    )
  }, [tahap])

  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [tIndex, setTIndex] = useState(0)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [dijawab, setDijawab] = useState(false)
  const [benarCount, setBenarCount] = useState(0)
  const [skor, setSkor] = useState(0)

  const selesaiRef = useRef(false)

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  if (!tahap || tahap.jenis !== 'inspeksi') {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  const temuan = tahap.temuan[tIndex]
  const opsi = opsiPerTemuan[tIndex] ?? []
  const tindakanBenar = temuan.tindakan

  const jawab = (index: number) => {
    if (dijawab || fase !== 'main') return
    const isBenar = opsi[index]?.benar === true
    setDipilih(index)
    setDijawab(true)
    if (isBenar) {
      setBenarCount((c) => c + 1)
      setSkor((s) => s + SKOR_PERTAMA)
      benar()
      koin()
    } else {
      salah()
    }
  }

  const lanjut = () => {
    if (tIndex + 1 >= tahap.temuan.length) {
      setFase('selesai')
      return
    }
    setTIndex((t) => t + 1)
    setDipilih(null)
    setDijawab(false)
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">
              Kantin Hijau · {tahap.judul} · Temuan {tIndex + 1} dari {tahap.temuan.length}
            </span>
            <p className="aia-muted" style={{ margin: '8px 0 0' }}>
              {tahap.instruksi}
            </p>
            <div className="aia-progress-row" style={{ marginTop: 10 }}>
              <div
                className="aia-progress"
                role="progressbar"
                aria-valuenow={tIndex}
                aria-valuemin={0}
                aria-valuemax={tahap.temuan.length}
                aria-label="Progres temuan tahap ini"
              >
                <span style={{ width: `${(tIndex / tahap.temuan.length) * 100}%` }} />
              </div>
              <span>
                Skor: {skor} · Benar {benarCount}/{tahap.temuan.length}
              </span>
            </div>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              <ClipboardCheck aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {temuan.masalah}
            </p>
            <p className="aia-muted" style={{ margin: '0 0 12px' }}>
              Apa tindakan yang benar?
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {opsi.map((pilihan, i) => {
                const isJawaban = pilihan.benar
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
                    aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${pilihan.teks}`}
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
                    <span>{pilihan.teks}</span>
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
                  background: dipilih !== null && opsi[dipilih]?.benar ? '#dcfce7' : '#fee2e2',
                }}
              >
                <strong>
                  {dipilih !== null && opsi[dipilih]?.benar ? 'Benar!' : 'Belum tepat.'}
                </strong>{' '}
                Tindakan yang benar: {tindakanBenar}
              </div>
            )}

            {dijawab && (
              <button
                type="button"
                className="aia-btn aia-btn-primary aia-btn-block"
                style={{ marginTop: 12 }}
                onClick={lanjut}
              >
                {tIndex + 1 >= tahap.temuan.length ? 'Lihat hasil' : 'Temuan berikutnya'}
              </button>
            )}
          </div>
        </>
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Inspeksi kantin selesai!
          </h3>
          <p>
            Kamu memilih tindakan yang benar untuk {benarCount} dari {tahap.temuan.length} temuan.
            Kantin jadi lebih bersih dan sehat berkatmu!
          </p>
          <p>
            Skor tahap ini: <strong>{skor} Koin Hijau</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}
