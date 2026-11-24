'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Backpack,
  Check,
  Coins,
  CupSoda,
  Cylinder,
  Flame,
  GlassWater,
  Hand,
  HelpCircle,
  Package,
  RotateCcw,
  Sandwich,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TEBAK_DULU } from '@/lib/apa-itu-adiwiyata/content/fakta'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { benar, getar, koin, lepas, salah } from '../suara'
import type { MiniGameSlotProps } from '../misi-shell'
import { DragDrop, EfekBenar, EfekSalah, TanganPenunjuk, ThrowAim } from '../interaksi'

type Zona = 'tas' | 'tinggalkan'
type Fase = 'tebak' | 'main' | 'selesai' | 'gagal'

interface BarangTas {
  id: string
  nama: string
  benar: boolean
  ikon: LucideIcon
  penjelasan: string
}

const BARANG: BarangTas[] = [
  {
    id: 'tumbler',
    nama: 'Tumbler',
    benar: true,
    ikon: CupSoda,
    penjelasan: 'Tumbler bisa dipakai ratusan kali. Isi ulang di sekolah, hemat dan tidak jadi sampah.',
  },
  {
    id: 'lunch-box',
    nama: 'Lunch box',
    benar: true,
    ikon: Sandwich,
    penjelasan: 'Bekal dari rumah dalam lunch box tidak butuh bungkus plastik sekali pakai.',
  },
  {
    id: 'tas-kain',
    nama: 'Tas kain',
    benar: true,
    ikon: ShoppingBag,
    penjelasan: 'Tas kain kuat dan bisa dipakai berkali-kali, gantinya kantong plastik.',
  },
  {
    id: 'botol-sekali-pakai',
    nama: 'Botol plastik sekali pakai',
    benar: false,
    ikon: GlassWater,
    penjelasan: 'Botol sekali pakai jadi sampah setelah sekali minum. Lebih baik bawa tumbler.',
  },
  {
    id: 'styrofoam',
    nama: 'Kotak styrofoam',
    benar: false,
    ikon: Package,
    penjelasan: 'Styrofoam sulit diurai dan tidak bisa didaur ulang. Tinggalkan di rumah saja.',
  },
  {
    id: 'sedotan',
    nama: 'Sedotan plastik',
    benar: false,
    ikon: Cylinder,
    penjelasan: 'Sedotan terlalu kecil untuk didaur ulang. Minum langsung dari gelas atau tumbler saja.',
  },
]

// Tahap 3 memakai lempar (bidik + tarik) sehingga waktunya lebih longgar.
const DURASI_MS = [12000, 9000, 10000]
const MAKS_SALAH = 5
const JUMLAH_BARANG = 10

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

/** Petunjuk Magi di data diawali "Magi: \"...\""; tampilkan kalimatnya saja. */
function bersihPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '').trim()
}

/**
 * Mini-game Misi 1 — Tas Pagi (Kader Budaya Lingkungan), versi gestur.
 * Tahap 1-2: seret barang ke Tas / Tinggalkan (DragDrop).
 * Tahap 3: bidik zona lalu lempar (ThrowAim).
 * Tahap 1 dibuka "Tebak dulu": seret kartu jawaban ke pilihan yang benar.
 * Bila modeSatuKetukan = true, tampilkan versi tombol lama (ketuk barang,
 * lalu ketuk zona) sebagai alternatif aksesibilitas.
 * Benar +10 (combo >= 3 jadi +15), salah menaikkan meter "sampah hari ini".
 * 5 salah = tahap gagal. Skor akhir dibatasi 0-100.
 */
export function TasPagi({
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
}: MiniGameSlotProps & { modeSatuKetukan?: boolean }) {
  const tahap = Math.min(stageIndex, 2)
  const spec = INTERAKSI_MISI['gerbang'][tahap]
  const petunjuk = bersihPetunjuk(spec.petunjukMagi)

  const [fase, setFase] = useState<Fase>(stageIndex === 0 ? 'tebak' : 'main')
  const [soalIdx] = useState(() => Math.floor(Math.random() * TEBAK_DULU.length))
  const [pilihan, setPilihan] = useState<number | null>(null)
  const [ronde, setRonde] = useState(0)
  const [idx, setIdx] = useState(0)
  const [skor, setSkor] = useState(0)
  const [combo, setCombo] = useState(0)
  const [comboTerbaik, setComboTerbaik] = useState(0)
  const [benarHitung, setBenarHitung] = useState(0)
  const [salahHitung, setSalahHitung] = useState(0)
  const [gagalHitung, setGagalHitung] = useState(0)
  const [modeMudah, setModeMudah] = useState(false)
  const [dipilih, setDipilih] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [umpan, setUmpan] = useState<{ jenis: 'benar' | 'salah'; teks: string; poin?: number } | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [aim, setAim] = useState<Zona | null>(null)

  const selesaiRef = useRef(false)
  const lanjutRef = useRef(false)
  const dijawabRef = useRef(-1)
  const advanceTimer = useRef<number | null>(null)
  const hasilRef = useRef<{ salahBaru: number; benarPilihan: boolean } | null>(null)

  const deck = useMemo(
    () =>
      acak([...BARANG, ...BARANG])
        .slice(0, JUMLAH_BARANG)
        .map((barang, i) => ({ barang, kunci: `${barang.id}-${i}` })),
    [ronde],
  )
  const saatIni = deck[idx] ?? null
  const durasi = DURASI_MS[tahap] + (modeMudah ? 6000 : 0)
  const soal = TEBAK_DULU[soalIdx]

  // Bersihkan timer saat komponen dilepas.
  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    },
    [],
  )

  // Lanjut ke barang berikutnya (dipakai timer umpan balik + tombol "Lanjut").
  const lanjutkan = () => {
    if (lanjutRef.current) return
    lanjutRef.current = true
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    const hasil = hasilRef.current
    setUmpan(null)
    setDipilih(false)
    setAim(null)
    if (hasil && !hasil.benarPilihan && hasil.salahBaru >= MAKS_SALAH) {
      setGagalHitung((g) => g + 1)
      setResolving(false)
      setFase('gagal')
      return
    }
    if (idx + 1 >= deck.length) {
      setResolving(false)
      setFase('selesai')
      koin()
      return
    }
    dijawabRef.current = -1
    setIdx((i) => i + 1)
    setTimerKey((k) => k + 1)
    setResolving(false)
  }

  /** Penilaian benar — tanpa SFX (komponen gestur sudah memutarnya sendiri). */
  const resolveBenar = () => {
    if (dijawabRef.current === idx) return
    dijawabRef.current = idx
    const barang = saatIni?.barang
    if (!barang) return
    const comboBaru = combo + 1
    const poin = comboBaru >= 3 ? 15 : 10
    setCombo(comboBaru)
    setComboTerbaik((t) => Math.max(t, comboBaru))
    setSkor((s) => s + poin)
    setBenarHitung((b) => b + 1)
    setResolving(true)
    lanjutRef.current = false
    hasilRef.current = { salahBaru: salahHitung, benarPilihan: true }
    setUmpan({ jenis: 'benar', teks: barang.penjelasan, poin })
    advanceTimer.current = window.setTimeout(lanjutkan, 1600)
  }

  /** Penilaian salah — tanpa SFX (pemanggil yang memutarnya). */
  const resolveSalah = (teks: string) => {
    if (dijawabRef.current === idx) return
    dijawabRef.current = idx
    const salahBaru = salahHitung + 1
    setSalahHitung(salahBaru)
    setCombo(0)
    setResolving(true)
    lanjutRef.current = false
    hasilRef.current = { salahBaru, benarPilihan: false }
    setUmpan({ jenis: 'salah', teks })
    advanceTimer.current = window.setTimeout(lanjutkan, 3200)
  }

  /** Versi tombol (mode satu-ketukan): ketuk zona setelah memilih barang. */
  const resolveDrop = (zona: Zona) => {
    const barang = saatIni?.barang
    if (!barang || resolving || fase !== 'main') return
    const benarPilihan = (zona === 'tas') === barang.benar
    if (benarPilihan) {
      benar(combo + 1)
      resolveBenar()
    } else {
      salah()
      getar([40, 40, 40])
      resolveSalah(barang.penjelasan)
    }
  }

  /** Hasil lemparan tahap 3: butuh bidikan benar + kekuatan cukup. */
  const lemparHasil = (kekuatan: number) => {
    const barang = saatIni?.barang
    if (!barang || resolving || fase !== 'main') return
    const zonaBenar: Zona = barang.benar ? 'tas' : 'tinggalkan'
    if (kekuatan < 0.5) {
      salah()
      getar([40, 40, 40])
      resolveSalah('Lemparan tidak sampai! Barang jatuh ke lantai. Tarik lebih panjang.')
      return
    }
    if (aim === zonaBenar) {
      benar(combo + 1)
      resolveBenar()
    } else {
      salah()
      getar([40, 40, 40])
      resolveSalah(barang.penjelasan)
    }
  }

  // Batas waktu tiap barang: habis = dianggap salah (meter naik).
  useEffect(() => {
    if (fase !== 'main' || resolving || !saatIni) return
    const id = window.setTimeout(() => {
      const barang = saatIni.barang
      salah()
      getar([40, 40, 40])
      resolveSalah(
        `Waktu habis! ${barang.nama} seharusnya masuk ${barang.benar ? 'Tas' : 'Tinggalkan'}. ${barang.penjelasan}`,
      )
    }, durasi)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, resolving, idx, timerKey, durasi])

  const cobaLagi = (mudah: boolean) => {
    if (mudah) setModeMudah(true)
    setRonde((r) => r + 1)
    setIdx(0)
    setSkor(0)
    setCombo(0)
    setComboTerbaik(0)
    setBenarHitung(0)
    setSalahHitung(0)
    setDipilih(false)
    setUmpan(null)
    setResolving(false)
    setAim(null)
    dijawabRef.current = -1
    lanjutRef.current = false
    hasilRef.current = null
    setTimerKey((k) => k + 1)
    setFase('main')
  }

  const selesaikan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(Math.min(100, skor))
  }

  const jawabTebak = (i: number, mainkanSuara = true) => {
    if (pilihan !== null) return
    setPilihan(i)
    if (!mainkanSuara) return
    if (i === soal.jawabanIndex) benar(0)
    else salah()
  }

  const IkonBarang = saatIni?.barang.ikon ?? Package
  const zonaBenar: Zona | null = saatIni ? (saatIni.barang.benar ? 'tas' : 'tinggalkan') : null

  return (
    <div className="aia-stack">
      <style>{`
        @keyframes aia-tp-goyang { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes aia-tp-muncul { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes aia-tp-timer { from { width: 100%; } to { width: 0%; } }
        .aia-tp-goyang { animation: aia-tp-goyang .4s ease; }
        .aia-tp-muncul { animation: aia-tp-muncul .25s ease; }
        .aia-tp-timer-fill { display: block; height: 100%; border-radius: inherit; background: var(--green); animation-name: aia-tp-timer; animation-timing-function: linear; animation-fill-mode: forwards; }
        @media (prefers-reduced-motion: reduce) {
          .aia-tp-goyang, .aia-tp-muncul { animation: none !important; }
          .aia-tp-timer-fill { animation: none !important; }
        }
      `}</style>

      {fase === 'tebak' && !modeSatuKetukan && (
        <section className="aia-card" aria-labelledby="aia-tp-tebak-title">
          <span className="aia-kicker">Tebak dulu</span>
          <h3 id="aia-tp-tebak-title" className="aia-section-title" style={{ marginTop: 4 }}>
            {soal.pertanyaan}
          </h3>
          <p className="aia-muted">Seret kartu jawaban ke pilihanmu.</p>
          {spec.tutorial && (
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <TanganPenunjuk label="Seret ke jawabanmu" />
            </div>
          )}
          <DragDrop
            key={`tebak-${soalIdx}`}
            benda={{
              id: 'kartu-jawaban',
              label: 'Kartu jawaban',
              konten: <HelpCircle aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />,
            }}
            target={{ id: `opsi-${soal.jawabanIndex}`, label: soal.pilihan[soal.jawabanIndex] }}
            targetLain={soal.pilihan
              .map((teks, i) => ({ id: `opsi-${i}`, label: teks }))
              .filter((_, i) => i !== soal.jawabanIndex)}
            disabled={pilihan !== null}
            onBenar={() => jawabTebak(soal.jawabanIndex, false)}
            onSalah={(_bendaId, targetId) => {
              const i = targetId ? Number(targetId.replace('opsi-', '')) : -1
              if (i >= 0) jawabTebak(i, false)
            }}
          />
          {pilihan !== null && (
            <div className="aia-dialog" style={{ marginTop: 12 }}>
              <strong>{pilihan === soal.jawabanIndex ? 'Tepat!' : 'Belum tepat, tidak apa-apa.'}</strong>
              <p>{soal.fakta}</p>
              <div className="aia-actions">
                <button
                  type="button"
                  className="aia-btn aia-btn-primary aia-btn-block"
                  onClick={() => setFase('main')}
                >
                  Mulai bermain
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {fase === 'tebak' && modeSatuKetukan && (
        <section className="aia-card" aria-labelledby="aia-tp-tebak-title">
          <span className="aia-kicker">Tebak dulu</span>
          <h3 id="aia-tp-tebak-title" className="aia-section-title" style={{ marginTop: 4 }}>
            {soal.pertanyaan}
          </h3>
          <div className="aia-stack">
            {soal.pilihan.map((teks, i) => {
              const terpilih = pilihan === i
              const benarSoal = i === soal.jawabanIndex
              return (
                <button
                  key={teks}
                  type="button"
                  className="aia-btn aia-btn-block"
                  disabled={pilihan !== null}
                  onClick={() => jawabTebak(i)}
                  style={
                    pilihan !== null
                      ? benarSoal
                        ? { borderColor: '#2f7d4f', background: '#2f7d4f', color: '#fff' }
                        : terpilih
                          ? { borderColor: '#b83232', background: '#b83232', color: '#fff' }
                          : undefined
                      : undefined
                  }
                >
                  {pilihan !== null && benarSoal ? <Check aria-hidden="true" /> : null}
                  {pilihan !== null && terpilih && !benarSoal ? <X aria-hidden="true" /> : null}
                  {teks}
                </button>
              )
            })}
          </div>
          {pilihan !== null && (
            <div className="aia-dialog" style={{ marginTop: 12 }}>
              <strong>{pilihan === soal.jawabanIndex ? 'Tepat!' : 'Belum tepat, tidak apa-apa.'}</strong>
              <p>{soal.fakta}</p>
              <div className="aia-actions">
                <button
                  type="button"
                  className="aia-btn aia-btn-primary aia-btn-block"
                  onClick={() => setFase('main')}
                >
                  Mulai bermain
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {fase === 'main' && saatIni && (
        <>
          <div className="aia-stats" aria-label="Skor tahap ini">
            <span className="aia-stat">
              <Coins aria-hidden="true" /> {skor} Koin Hijau
            </span>
            {combo >= 2 && (
              <span className="aia-stat">
                <Flame aria-hidden="true" /> Combo x{combo}
                {combo >= 3 ? ' · +5 bonus' : ''}
              </span>
            )}
            <span className="aia-stat">
              Barang {Math.min(idx + 1, JUMLAH_BARANG)}/{JUMLAH_BARANG}
            </span>
          </div>

          <div aria-label={`Meter sampah hari ini: ${salahHitung} dari ${MAKS_SALAH}`}>
            <div className="aia-progress-row">
              <span>Sampah hari ini</span>
              <span aria-hidden="true">
                {Array.from({ length: MAKS_SALAH }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      marginLeft: 4,
                      borderRadius: '50%',
                      background: i < salahHitung ? '#b83232' : 'var(--muted)',
                    }}
                  />
                ))}
              </span>
            </div>
            <div className="aia-progress" style={{ marginTop: 6 }}>
              <span style={{ width: `${(salahHitung / MAKS_SALAH) * 100}%`, background: '#b83232' }} />
            </div>
          </div>

          <div
            className="aia-progress"
            role="progressbar"
            aria-label={`Batas waktu barang ini: ${durasi / 1000} detik`}
          >
            <span
              key={timerKey}
              className="aia-tp-timer-fill"
              style={{
                animationDuration: `${durasi}ms`,
                animationPlayState: resolving ? 'paused' : 'running',
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <EfekBenar
              tampil={umpan?.jenis === 'benar'}
              label={umpan?.poin ? `+${umpan.poin} Koin Hijau` : 'Benar!'}
            />
            {spec.tutorial && (
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <TanganPenunjuk label={tahap === 2 ? 'Bidik dulu, lalu lempar!' : 'Seret barang ke Tas atau Tinggalkan'} />
              </div>
            )}

            {!modeSatuKetukan && tahap < 2 && zonaBenar && (
              <DragDrop
                key={saatIni.kunci}
                benda={{
                  id: saatIni.barang.id,
                  label: saatIni.barang.nama,
                  konten: <IkonBarang aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />,
                }}
                target={
                  zonaBenar === 'tas'
                    ? { id: 'tas', label: 'Tas', ikon: <Backpack aria-hidden="true" style={{ width: 24, height: 24 }} /> }
                    : { id: 'tinggalkan', label: 'Tinggalkan', ikon: <Trash2 aria-hidden="true" style={{ width: 24, height: 24 }} /> }
                }
                targetLain={
                  zonaBenar === 'tas'
                    ? [{ id: 'tinggalkan', label: 'Tinggalkan', ikon: <Trash2 aria-hidden="true" style={{ width: 24, height: 24 }} /> }]
                    : [{ id: 'tas', label: 'Tas', ikon: <Backpack aria-hidden="true" style={{ width: 24, height: 24 }} /> }]
                }
                perbesarTarget={salahHitung >= 2}
                disabled={resolving}
                onBenar={() => resolveBenar()}
                onSalah={() => resolveSalah(saatIni.barang.penjelasan)}
              />
            )}

            {!modeSatuKetukan && tahap === 2 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['tas', 'tinggalkan'] as Zona[]).map((zona) => (
                    <button
                      key={zona}
                      type="button"
                      className="aia-btn aia-btn-block"
                      disabled={resolving}
                      aria-pressed={aim === zona}
                      onClick={() => setAim(zona)}
                      style={{
                        flexDirection: 'column',
                        gap: 4,
                        minHeight: 64,
                        borderColor: aim === zona ? 'var(--green)' : undefined,
                        boxShadow: aim === zona ? '0 0 0 3px var(--green)' : undefined,
                        background: zona === 'tas' ? '#2f7d4f' : 'var(--muted)',
                        color: zona === 'tas' ? '#fff' : 'var(--foreground)',
                      }}
                    >
                      {zona === 'tas' ? (
                        <Backpack aria-hidden="true" style={{ width: 24, height: 24 }} />
                      ) : (
                        <Trash2 aria-hidden="true" style={{ width: 24, height: 24 }} />
                      )}
                      <strong>{zona === 'tas' ? 'Tas' : 'Tinggalkan'}</strong>
                      <small style={{ fontWeight: 400 }}>
                        {aim === zona ? 'Sudah dibidik — lempar sekarang!' : 'Ketuk untuk membidik'}
                      </small>
                    </button>
                  ))}
                </div>
                <ThrowAim
                  key={saatIni.kunci}
                  label={saatIni.barang.nama}
                  ikon={<IkonBarang aria-hidden="true" style={{ width: 28, height: 28 }} />}
                  targetLabel={aim === 'tinggalkan' ? 'Tinggalkan' : 'Tas'}
                  disabled={aim === null || resolving}
                  onLempar={(kekuatan) => lemparHasil(kekuatan)}
                />
              </>
            )}

            {modeSatuKetukan && (
              <>
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className={`aia-card aia-tp-muncul${umpan?.jenis === 'salah' ? ' aia-tp-goyang' : ''}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: 20,
                      cursor: resolving ? 'default' : 'pointer',
                      outline: dipilih ? '3px solid var(--green)' : undefined,
                      outlineOffset: 2,
                      pointerEvents: resolving ? 'none' : undefined,
                    }}
                    aria-pressed={dipilih}
                    aria-label={`${saatIni.barang.nama}. Ketuk untuk memilih, lalu ketuk Tas atau Tinggalkan.`}
                    onClick={() => {
                      if (resolving) return
                      setDipilih((v) => !v)
                    }}
                  >
                    <IkonBarang aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />
                    <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{saatIni.barang.nama}</strong>
                    <small className="aia-muted">
                      {dipilih ? 'Sudah dipilih — ketuk Tas atau Tinggalkan' : 'Ketuk untuk memilih'}
                    </small>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    className="aia-btn aia-btn-block"
                    disabled={resolving}
                    onClick={() => {
                      if (dipilih) {
                        lepas()
                        resolveDrop('tas')
                      }
                    }}
                    style={{
                      flexDirection: 'column',
                      gap: 4,
                      minHeight: 88,
                      borderColor: dipilih ? 'var(--green)' : undefined,
                      boxShadow: dipilih ? '0 0 0 2px var(--green)' : undefined,
                      background: '#2f7d4f',
                      color: '#fff',
                    }}
                  >
                    <Backpack aria-hidden="true" style={{ width: 24, height: 24 }} />
                    <strong>Tas</strong>
                    <small style={{ fontWeight: 400 }}>Bawa ke sekolah</small>
                  </button>
                  <button
                    type="button"
                    className="aia-btn aia-btn-block"
                    disabled={resolving}
                    onClick={() => {
                      if (dipilih) {
                        lepas()
                        resolveDrop('tinggalkan')
                      }
                    }}
                    style={{
                      flexDirection: 'column',
                      gap: 4,
                      minHeight: 88,
                      borderColor: dipilih ? 'var(--green)' : undefined,
                      boxShadow: dipilih ? '0 0 0 2px var(--green)' : undefined,
                      background: 'var(--muted)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <Trash2 aria-hidden="true" style={{ width: 24, height: 24 }} />
                    <strong>Tinggalkan</strong>
                    <small style={{ fontWeight: 400 }}>Sekali pakai</small>
                  </button>
                </div>
              </>
            )}

            {modeMudah && (
              <p className="aia-muted" style={{ marginTop: 8, textAlign: 'center' }}>
                Petunjuk: {saatIni.barang.benar ? 'Bawa ini, masukkan ke Tas.' : 'Sekali pakai, masukkan ke Tinggalkan.'}
              </p>
            )}

            <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
              <Hand aria-hidden="true" style={{ width: 14, height: 14, verticalAlign: -2 }} />{' '}
              {modeSatuKetukan
                ? 'Ketuk barang untuk memilih, lalu ketuk zona.'
                : tahap === 2
                  ? 'Ketuk Tas atau Tinggalkan untuk membidik, lalu tarik dan lepas untuk melempar.'
                  : 'Seret barang ke zona, atau ketuk barang lalu ketuk zona.'}
            </p>
          </div>

          {umpan?.jenis === 'salah' && <EfekSalah tampil petunjuk={petunjuk} />}
          {umpan && (
            <div
              className="aia-dialog"
              aria-live="polite"
              style={umpan.jenis === 'salah' ? { borderLeftColor: '#b83232' } : undefined}
            >
              <p>{umpan.teks}</p>
              <div className="aia-actions">
                <button type="button" className="aia-btn aia-btn-ghost" onClick={lanjutkan}>
                  Lanjut
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {fase === 'selesai' && (
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-tp-selesai-title">
          <Sparkles aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
          <h3 id="aia-tp-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu berhasil membawa {benarHitung} dari {JUMLAH_BARANG} barang dengan benar dan mengumpulkan {skor} Koin
            Hijau.
            {comboTerbaik >= 3 ? ` Combo terbaikmu x${comboTerbaik}. Hebat!` : ''}
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={selesaikan}>
              <Check aria-hidden="true" /> Lanjutkan
            </button>
          </div>
        </section>
      )}

      {fase === 'gagal' && (
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-tp-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: '#b83232' }} />
          <h3 id="aia-tp-gagal-title" className="aia-section-title">
            Meter sampah penuh
          </h3>
          <p className="aia-muted">
            Sampah hari ini sudah terlalu banyak. Tidak apa-apa, coba lagi dari awal tahap ini — barangnya diacak
            ulang.
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => cobaLagi(false)}>
              <RotateCcw aria-hidden="true" /> Coba lagi
            </button>
            {gagalHitung >= 2 && !modeMudah && (
              <button type="button" className="aia-btn aia-btn-ghost" onClick={() => cobaLagi(true)}>
                Mode mudah: lebih lambat + petunjuk
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
