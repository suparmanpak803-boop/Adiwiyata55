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
import { ambil, benar, getar, koin, lepas, salah } from '../suara'
import type { MiniGameSlotProps } from '../bab-shell'

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

const DURASI_MS = [12000, 9000, 6000]
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

/**
 * Mini-game Bab 1 — Tas Pagi.
 * Tahap 0 dibuka layar "Tebak dulu", lalu permainan: seret barang yang benar
 * ke Tas, barang sekali pakai ke Tinggalkan. Benar +10 (combo >= 3 jadi +15),
 * salah menaikkan meter "sampah hari ini". 5 salah = tahap gagal.
 */
export function TasPagi({ stageIndex, onStageComplete }: MiniGameSlotProps) {
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
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [resolving, setResolving] = useState(false)
  const [umpan, setUmpan] = useState<{ jenis: 'benar' | 'salah'; teks: string } | null>(null)
  const [popup, setPopup] = useState<{ id: number; teks: string } | null>(null)
  const [timerKey, setTimerKey] = useState(0)

  const selesaiRef = useRef(false)
  const lanjutRef = useRef(false)
  const advanceTimer = useRef<number | null>(null)
  const popupTimer = useRef<number | null>(null)
  const dragRef = useRef<{ x0: number; y0: number; bergerak: boolean } | null>(null)
  const tekanRef = useRef(false)
  const hasilRef = useRef<{ salahBaru: number; benarPilihan: boolean } | null>(null)

  const deck = useMemo(
    () =>
      acak([...BARANG, ...BARANG])
        .slice(0, JUMLAH_BARANG)
        .map((barang, i) => ({ barang, kunci: `${barang.id}-${i}` })),
    [ronde],
  )
  const saatIni = deck[idx] ?? null
  const durasi = DURASI_MS[Math.min(stageIndex, 2)] + (modeMudah ? 6000 : 0)
  const soal = TEBAK_DULU[soalIdx]

  // Bersihkan timer saat komponen dilepas.
  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
      if (popupTimer.current) window.clearTimeout(popupTimer.current)
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
    setDragPos(null)
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
    setIdx((i) => i + 1)
    setTimerKey((k) => k + 1)
    setResolving(false)
  }

  // Batas waktu tiap barang: habis = dianggap salah (meter naik).
  useEffect(() => {
    if (fase !== 'main' || resolving || !saatIni) return
    const id = window.setTimeout(() => {
      setResolving(true)
      const salahBaru = salahHitung + 1
      setSalahHitung(salahBaru)
      setCombo(0)
      salah()
      getar([40, 40, 40])
      hasilRef.current = { salahBaru, benarPilihan: false }
      setUmpan({
        jenis: 'salah',
        teks: `Waktu habis! ${saatIni.barang.nama} seharusnya masuk ${
          saatIni.barang.benar ? 'Tas' : 'Tinggalkan'
        }. ${saatIni.barang.penjelasan}`,
      })
      lanjutRef.current = false
      advanceTimer.current = window.setTimeout(lanjutkan, 3000)
    }, durasi)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, resolving, idx, timerKey, durasi])

  const resolveDrop = (zona: Zona) => {
    const barang = saatIni?.barang
    if (!barang || resolving || fase !== 'main') return
    const benarPilihan = (zona === 'tas') === barang.benar
    setResolving(true)
    lanjutRef.current = false
    if (benarPilihan) {
      const comboBaru = combo + 1
      const poin = comboBaru >= 3 ? 15 : 10
      setCombo(comboBaru)
      setComboTerbaik((t) => Math.max(t, comboBaru))
      setSkor((s) => s + poin)
      setBenarHitung((b) => b + 1)
      benar(comboBaru)
      setPopup({ id: Date.now(), teks: `+${poin}` })
      if (popupTimer.current) window.clearTimeout(popupTimer.current)
      popupTimer.current = window.setTimeout(() => setPopup(null), 1000)
      hasilRef.current = { salahBaru: salahHitung, benarPilihan: true }
      setUmpan({ jenis: 'benar', teks: barang.penjelasan })
      advanceTimer.current = window.setTimeout(lanjutkan, 1400)
    } else {
      const salahBaru = salahHitung + 1
      setSalahHitung(salahBaru)
      setCombo(0)
      salah()
      getar([40, 40, 40])
      hasilRef.current = { salahBaru, benarPilihan: false }
      setUmpan({ jenis: 'salah', teks: barang.penjelasan })
      advanceTimer.current = window.setTimeout(lanjutkan, 3000)
    }
  }

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
    setDragPos(null)
    setUmpan(null)
    setResolving(false)
    lanjutRef.current = false
    hasilRef.current = null
    setTimerKey((k) => k + 1)
    setFase('main')
  }

  const selesaikan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(skor)
  }

  const jawabTebak = (i: number) => {
    if (pilihan !== null) return
    setPilihan(i)
    if (i === soal.jawabanIndex) benar(0)
    else salah()
  }

  // --- Drag dengan Pointer Events (touch + mouse) ---
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (resolving || !saatIni) return
    ambil()
    dragRef.current = { x0: e.clientX, y0: e.clientY, bergerak: false }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (Math.abs(dx) + Math.abs(dy) > 10) d.bergerak = true
    setDragPos({ x: dx, y: dy })
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    dragRef.current = null
    setDragPos(null)
    if (!d) return
    if (d.bergerak) {
      // Klik yang mengikuti drag harus diabaikan (supaya tidak ikut memilih).
      tekanRef.current = true
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const zona = el?.closest?.('[data-aia-zona]') as HTMLElement | null
      if (zona) {
        lepas()
        resolveDrop(zona.dataset.aiaZona as Zona)
      }
    }
  }

  const onClickBarang = () => {
    if (tekanRef.current) {
      tekanRef.current = false
      return
    }
    if (resolving || !saatIni) return
    setDipilih((v) => !v)
  }

  const IkonBarang = saatIni?.barang.ikon ?? Package

  return (
    <div className="aia-stack">
      <style>{`
        @keyframes aia-tp-goyang { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes aia-tp-muncul { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes aia-tp-timer { from { width: 100%; } to { width: 0%; } }
        @keyframes aia-tp-pop { 0% { opacity: 0; transform: translateY(4px); } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(-18px); } }
        .aia-tp-goyang { animation: aia-tp-goyang .4s ease; }
        .aia-tp-muncul { animation: aia-tp-muncul .25s ease; }
        .aia-tp-timer-fill { display: block; height: 100%; border-radius: inherit; background: var(--green); animation-name: aia-tp-timer; animation-timing-function: linear; animation-fill-mode: forwards; }
        .aia-tp-pop { position: absolute; top: -8px; right: 8px; z-index: 2; font-size: 18px; font-weight: 800; color: #2f7d4f; animation: aia-tp-pop 1s ease forwards; pointer-events: none; }
        @media (prefers-reduced-motion: reduce) {
          .aia-tp-goyang, .aia-tp-muncul, .aia-tp-pop { animation: none !important; }
          .aia-tp-timer-fill { animation: none !important; }
        }
      `}</style>

      {fase === 'tebak' && (
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
                  onClick={() => {
                    lepas()
                    setFase('main')
                  }}
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

          <div style={{ position: 'relative', textAlign: 'center' }}>
            {popup && (
              <span key={popup.id} className="aia-tp-pop" aria-hidden="true">
                {popup.teks}
              </span>
            )}
            <button
              type="button"
              className={`aia-card aia-tp-muncul${umpan?.jenis === 'salah' ? ' aia-tp-goyang' : ''}`}
              style={{
                display: 'block',
                width: '100%',
                padding: 20,
                cursor: resolving ? 'default' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                transform: dragPos ? `translate(${dragPos.x}px, ${dragPos.y}px) rotate(${dragPos.x * 0.05}deg)` : undefined,
                outline: dipilih ? '3px solid var(--green)' : undefined,
                outlineOffset: 2,
                pointerEvents: resolving ? 'none' : undefined,
              }}
              aria-pressed={dipilih}
              aria-label={`${saatIni.barang.nama}. Seret ke Tas atau Tinggalkan, atau ketuk untuk memilih lalu ketuk zona tujuan.`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={onClickBarang}
            >
              <IkonBarang aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />
              <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{saatIni.barang.nama}</strong>
              <small className="aia-muted">
                {dipilih ? 'Sudah dipilih — ketuk Tas atau Tinggalkan' : 'Seret aku, atau ketuk untuk memilih'}
              </small>
            </button>
            {modeMudah && (
              <p className="aia-muted" style={{ marginTop: 8 }}>
                Petunjuk: {saatIni.barang.benar ? 'Bawa ini, masukkan ke Tas.' : 'Sekali pakai, masukkan ke Tinggalkan.'}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              data-aia-zona="tas"
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
              data-aia-zona="tinggalkan"
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

          <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
            <Hand aria-hidden="true" style={{ width: 14, height: 14, verticalAlign: -2 }} /> Seret barang ke zona,
            atau ketuk barang lalu ketuk zona.
          </p>

          {umpan && (
            <div
              className="aia-dialog"
              aria-live="polite"
              style={
                umpan.jenis === 'salah'
                  ? { borderLeftColor: '#b83232' }
                  : undefined
              }
            >
              <strong>{umpan.jenis === 'benar' ? 'Benar!' : 'Yah, belum tepat.'}</strong>
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
