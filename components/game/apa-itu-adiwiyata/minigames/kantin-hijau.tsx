'use client'

// Mini-game Misi Kader "Kantin Hijau" — Mbak Dewi (GESTUR).
// Tiga tahap simulasi kantin: 4 pesanan (temuan) datang bergantian
// dengan timer; pemain mengetuk tindakan yang benar di antara 3 kartu
// tindakan. Isi dari KONTEN_TUGAS['kantin-hijau'] (12 temuan).
// Gestur tiap tahap dari INTERAKSI_MISI['kantin-hijau'].
// Skor 0–100 (persen): SimulasiKantin mengembalikan persen
// (benar / total pesanan × 100), jadi skor tahap dipakai apa adanya.
// onStageComplete dipanggil TEPAT SATU KALI.
// Prop modeSatuKetukan menampilkan versi tombol lama (aksesibilitas).

import { useMemo, useRef, useState } from 'react'
import { Check, ClipboardCheck, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, koin, salah } from '../suara'
import {
  EfekBenar,
  PetunjukMagi,
  SimulasiKantin,
  TanganPenunjuk,
  type PesananKantin,
} from '../interaksi'
import { TahapTidakTersedia } from '../tahap-tidak-tersedia'

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

function acak<T>(arr: T[]): T[] {
  const hasil = [...arr]
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[hasil[i], hasil[j]] = [hasil[j], hasil[i]]
  }
  return hasil
}

interface OpsiTindakan {
  teks: string
  benar: boolean
}

export function KantinHijau(props: TugasMiniGameSlotProps) {
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
  const temuan = tahap && tahap.jenis === 'inspeksi' ? tahap.temuan : []
  const judul = tahap?.judul ?? ''
  const instruksi = tahap?.instruksi ?? ''
  const petunjuk = spek ? bersihkanPetunjuk(spek.petunjukMagi) : 'Coba pikirkan lagi.'
  const hasilBenar = spek?.hasilBenar ?? ''
  const hasilSalah = spek?.hasilSalah ?? ''
  const tutorial = spek?.tutorial ?? false
  const langkah = spek?.langkah ?? []

  // Tiap temuan jadi satu pesanan kantin (sekali per tahap).
  const pesanan = useMemo<PesananKantin[]>(
    () =>
      temuan.map((t, i) => ({
        id: `pesanan-${i}`,
        pelanggan: `Temuan ${i + 1}`,
        permintaan: t.masalah,
        tindakanBenar: t.tindakan,
        tindakanSalah: [t.pilihanSalah[0], t.pilihanSalah[1]],
      })),
    [temuan],
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

  if (!tahap || tahap.jenis !== 'inspeksi' || temuan.length === 0) {
    return (
      <TahapTidakTersedia onLewati={() => selesai(0)} />
    )
  }

  /**
   * Simulasi selesai — SimulasiKantin sudah mengembalikan persen 0–100,
   * jadi skor tahap dipakai apa adanya (B-17). Pemetaan lama yang membagi
   * skor dengan 25 membuat 0 pesanan benar tetap bernilai 40.
   */
  const simulasiSelesai = (skorKomponen: number) => {
    setSkor(Math.min(100, Math.max(0, Math.round(skorKomponen))))
    setFase('selesai')
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">
              Kantin Hijau · {judul} · {temuan.length} pesanan
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
          </div>

          {tutorial && (
            <div style={{ textAlign: 'center' }}>
              <TanganPenunjuk label="Ketuk tindakan yang benar sebelum waktu habis" />
            </div>
          )}

          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              Layani tiap pesanan: ketuk tindakan yang benar.
            </p>
            <SimulasiKantin
              pesanan={pesanan}
              modeSatuKetukan={modeSatuKetukan}
              terjeda={terjeda}
              onSelesai={simulasiSelesai}
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
            <Check aria-hidden="true" /> Inspeksi kantin selesai!
          </h3>
          <p>{hasilBenar}</p>
          {skor < 100 && <p>{hasilSalah}</p>}
          <p>
            Kamu menyelesaikan {temuan.length} temuan. Kantin jadi lebih bersih dan sehat
            berkatmu!
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

  const selesaiRef = useRef(false)

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  if (!tahap || tahap.jenis !== 'inspeksi') {
    return (
      <TahapTidakTersedia onLewati={() => selesai(0)} />
    )
  }

  const temuan = tahap.temuan[tIndex]
  const opsi = opsiPerTemuan[tIndex] ?? []
  const tindakanBenar = temuan.tindakan
  // C-34: skor persen (benar/total × 100), sama seperti mode gestur —
  // sebelumnya +25 per benar (SKOR_PERTAMA), yang hanya setara bila
  // jumlah temuan tepat 4 dan rapuh bila jumlahnya berubah.
  const skor = Math.round((benarCount / tahap.temuan.length) * 100)

  const jawab = (index: number) => {
    if (dijawab || fase !== 'main') return
    const isBenar = opsi[index]?.benar === true
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
                let kelasUmpan: string | undefined
                let border: string | undefined
                if (dijawab && isJawaban) {
                  kelasUmpan = 'aia-umpan-benar'
                  border = '2px solid var(--aia-leaf)'
                } else if (dijawab && isDipilih) {
                  kelasUmpan = 'aia-umpan-salah'
                  border = '2px solid var(--aia-merah)'
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className={`aia-btn aia-btn-block${kelasUmpan ? ` ${kelasUmpan}` : ''}`}
                    disabled={dijawab}
                    onClick={() => jawab(i)}
                    aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${pilihan.teks}`}
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
                    <span>{pilihan.teks}</span>
                    {dijawab && isJawaban && <Check aria-hidden="true" />}
                    {dijawab && isDipilih && !isJawaban && <X aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            {dijawab && (
              <div
                role="status"
                className={dipilih !== null && opsi[dipilih]?.benar ? 'aia-umpan-benar' : 'aia-umpan-salah'}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
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
