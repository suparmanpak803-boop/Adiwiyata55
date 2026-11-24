'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Biohazard,
  Check,
  Coins,
  Heart,
  Leaf,
  Package,
  Recycle,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SAMPAH } from '@/lib/apa-itu-adiwiyata/content/sampah'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { hitungDampak } from '@/lib/apa-itu-adiwiyata/siklus'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import type { Carryover, TongSampah } from '@/lib/apa-itu-adiwiyata/types'
import { benar, getar, koin, lepas, lempar, nyawa, plop, salah } from '../suara'
import type { MiniGameSlotProps } from '../misi-shell'
import { DragDrop, EfekBenar, EfekSalah, TanganPenunjuk, ThrowAim } from '../interaksi'

type Fase = 'main' | 'selesai' | 'gagal'

interface TongInfo {
  id: TongSampah
  nama: string
  warna: string
  teks: string
  ikon: LucideIcon
}

const TONG: TongInfo[] = [
  { id: 'organik', nama: 'Organik', warna: '#2f7d4f', teks: '#ffffff', ikon: Leaf },
  { id: 'anorganik', nama: 'Anorganik', warna: '#eab308', teks: '#1f2937', ikon: Recycle },
  { id: 'residu', nama: 'Residu', warna: '#6b7280', teks: '#ffffff', ikon: Trash2 },
  { id: 'b3', nama: 'B3', warna: '#b83232', teks: '#ffffff', ikon: Biohazard },
]

const TONG_PER_TAHAP: TongSampah[][] = [
  ['organik', 'anorganik'],
  ['organik', 'anorganik', 'residu'],
  ['organik', 'anorganik', 'residu', 'b3'],
]

const JUMLAH_ITEM = [8, 8, 10]
const NYAWA_AWAL = 3

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

function infoTong(id: TongSampah): TongInfo {
  return TONG.find((t) => t.id === id) ?? TONG[0]
}

function namaTong(id: TongSampah): string {
  return infoTong(id).nama
}

/** Petunjuk Magi di data diawali "Magi: \"...\""; tampilkan kalimatnya saja. */
function bersihPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '').trim()
}

/**
 * Mini-game Misi 2 — Pilah Sampah (Kader Pilah), versi gestur.
 * Tahap 1-2: seret sampah ke tong yang benar (DragDrop).
 * Tahap 3: bidik tong lalu lempar (ThrowAim); tong bergerak pelan.
 * Bila modeSatuKetukan = true, tampilkan versi tombol lama (ketuk sampah,
 * lalu ketuk tong) sebagai alternatif aksesibilitas.
 * Benar +10, salah pilah -1 nyawa dan dicatat untuk dampak berantai
 * (siklus.ts). 3 nyawa per tahap. Skor akhir dibatasi 0-100.
 */
export function PilahSampah({
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
}: MiniGameSlotProps & { modeSatuKetukan?: boolean }) {
  const { dispatch } = useCampaign()
  const tahap = Math.min(stageIndex, 2)
  const spec = INTERAKSI_MISI['kantin'][tahap]
  const petunjuk = bersihPetunjuk(spec.petunjukMagi)

  const [fase, setFase] = useState<Fase>('main')
  const [ronde, setRonde] = useState(0)
  const [idx, setIdx] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarHitung, setBenarHitung] = useState(0)
  const [nyawaSisa, setNyawaSisa] = useState(NYAWA_AWAL)
  const [gagalHitung, setGagalHitung] = useState(0)
  const [modeMudah, setModeMudah] = useState(false)
  const [dipilih, setDipilih] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [umpan, setUmpan] = useState<{ jenis: 'benar' | 'salah'; teks: string; poin?: number } | null>(null)
  const [catatanDampak, setCatatanDampak] = useState<string | null>(null)
  const [aim, setAim] = useState<TongSampah | null>(null)
  const [terbang, setTerbang] = useState<{
    x: number
    y: number
    dx: number
    dy: number
    tong: TongSampah
    nama: string
    kunci: string
  } | null>(null)

  const selesaiRef = useRef(false)
  const lanjutRef = useRef(false)
  const dijawabRef = useRef(-1)
  const lemparAktifRef = useRef(false)
  const advanceTimer = useRef<number | null>(null)
  const terbangTimer = useRef<number | null>(null)
  const hasilRef = useRef<{ benarPilihan: boolean; nyawaBaru: number } | null>(null)
  const idsSalahRef = useRef<string[]>([])
  const itemRef = useRef<HTMLButtonElement | null>(null)
  const binRefs = useRef<Partial<Record<TongSampah, HTMLButtonElement | null>>>({})

  const tongTersedia = TONG_PER_TAHAP[tahap]
  const deck = useMemo(
    () =>
      acak(SAMPAH.filter((item) => tongTersedia.includes(item.tong))).slice(
        0,
        JUMLAH_ITEM[tahap],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stageIndex, ronde],
  )
  const saatIni = deck[idx] ?? null
  const tongBergerak = tahap === 2 && !modeMudah

  // Bersihkan timer saat komponen dilepas.
  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
      if (terbangTimer.current) window.clearTimeout(terbangTimer.current)
    },
    [],
  )

  const lanjutkan = () => {
    if (lanjutRef.current) return
    lanjutRef.current = true
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    const hasil = hasilRef.current
    setUmpan(null)
    setDipilih(false)
    setAim(null)
    if (idx + 1 >= deck.length) {
      setResolving(false)
      akhiriTahap()
      return
    }
    if (hasil && !hasil.benarPilihan && hasil.nyawaBaru <= 0) {
      setGagalHitung((g) => g + 1)
      setResolving(false)
      setFase('gagal')
      return
    }
    dijawabRef.current = -1
    setIdx((i) => i + 1)
    setResolving(false)
  }

  /** Hitung dampak berantai lalu tampilkan layar selesai. */
  const akhiriTahap = () => {
    const dampak = hitungDampak(idsSalahRef.current)
    const patch: Partial<Carryover> = {}
    const catatan: string[] = []
    if (dampak.maggotKenaMinyak) {
      patch.maggotKenaMinyak = true
      catatan.push(
        'Ada sampah berminyak atau plastik yang salah masuk tong organik, jadi maggot di Pos Maggot akan rewel. Kamu bisa memperbaikinya di sana dengan pakan bersih.',
      )
    }
    if (dampak.komposBau) {
      patch.komposBau = true
      catatan.push(
        'Ada pencemar yang salah masuk tong organik, jadi kompos di Misi 4 nanti bisa bau. Tambah bahan cokelat dan aduk sampai baunya hilang.',
      )
    }
    if (Object.keys(patch).length > 0) {
      dispatch({ type: 'SET_CARRYOVER', patch })
      setCatatanDampak(catatan.join(' '))
    }
    setFase('selesai')
    koin()
  }

  /** Penilaian benar — tanpa SFX (komponen gestur sudah memutarnya sendiri). */
  const resolveBenar = () => {
    if (dijawabRef.current === idx) return
    dijawabRef.current = idx
    const item = saatIni
    if (!item) return
    setSkor((s) => s + 10)
    setBenarHitung((b) => b + 1)
    setResolving(true)
    lanjutRef.current = false
    hasilRef.current = { benarPilihan: true, nyawaBaru: nyawaSisa }
    setUmpan({
      jenis: 'benar',
      teks: `Benar! ${item.nama} memang masuk tong ${namaTong(item.tong)}.`,
      poin: 10,
    })
    advanceTimer.current = window.setTimeout(lanjutkan, 1400)
  }

  /** Penilaian salah — tanpa SFX (pemanggil yang memutarnya). */
  const resolveSalah = (teks: string) => {
    if (dijawabRef.current === idx) return
    dijawabRef.current = idx
    const item = saatIni
    if (item) idsSalahRef.current = [...idsSalahRef.current, item.id]
    const nyawaBaru = nyawaSisa - 1
    setNyawaSisa(nyawaBaru)
    setResolving(true)
    lanjutRef.current = false
    hasilRef.current = { benarPilihan: false, nyawaBaru }
    setUmpan({ jenis: 'salah', teks })
    advanceTimer.current = window.setTimeout(lanjutkan, 3200)
  }

  /** Hasil lemparan tahap 3 (gestur): butuh bidikan benar + kekuatan cukup. */
  const lemparHasil = (kekuatan: number) => {
    const item = saatIni
    if (!item || resolving || fase !== 'main') return
    if (kekuatan < 0.5) {
      salah()
      getar([40, 40, 40])
      resolveSalah('Lemparan tidak sampai! Sampah jatuh ke lantai. Tarik lebih panjang.')
      return
    }
    if (aim === item.tong) {
      benar(0)
      resolveBenar()
    } else {
      salah()
      getar([40, 40, 40])
      resolveSalah(item.penjelasan)
    }
  }

  /** Versi tombol (mode satu-ketukan): lempar sampah ke tong dengan animasi terbang. */
  const selesaikanLempar = (tong: TongSampah) => {
    const item = saatIni
    if (!item || !lemparAktifRef.current) return
    lemparAktifRef.current = false
    if (terbangTimer.current) window.clearTimeout(terbangTimer.current)
    setTerbang(null)
    const benarPilihan = tong === item.tong
    plop()
    if (benarPilihan) {
      benar(0)
      resolveBenar()
    } else {
      nyawa()
      salah()
      getar([40, 40, 40])
      resolveSalah(item.penjelasan)
    }
  }

  const resolveLempar = (tong: TongSampah) => {
    const item = saatIni
    if (!item || resolving || fase !== 'main') return
    const elItem = itemRef.current
    const elTong = binRefs.current[tong]
    if (!elItem || !elTong) {
      // Tanpa posisi layar, langsung selesaikan tanpa animasi terbang.
      setResolving(true)
      lanjutRef.current = false
      lemparAktifRef.current = true
      selesaikanLempar(tong)
      return
    }
    const a = elItem.getBoundingClientRect()
    const b = elTong.getBoundingClientRect()
    const dx = b.left + b.width / 2 - (a.left + a.width / 2)
    const dy = b.top + b.height / 2 - (a.top + a.height / 2)
    lempar()
    setResolving(true)
    lanjutRef.current = false
    lemparAktifRef.current = true
    setTerbang({ x: a.left, y: a.top, dx, dy, tong, nama: item.nama, kunci: `${item.id}-${idx}` })
    // Pengaman: kalau animationend tidak jalan, tetap selesaikan.
    terbangTimer.current = window.setTimeout(() => selesaikanLempar(tong), 800)
  }

  const cobaLagi = (mudah: boolean) => {
    if (mudah) setModeMudah(true)
    setRonde((r) => r + 1)
    setIdx(0)
    setSkor(0)
    setBenarHitung(0)
    setNyawaSisa(NYAWA_AWAL)
    setDipilih(false)
    setUmpan(null)
    setResolving(false)
    setTerbang(null)
    setCatatanDampak(null)
    setAim(null)
    dijawabRef.current = -1
    lanjutRef.current = false
    hasilRef.current = null
    idsSalahRef.current = []
    setFase('main')
  }

  const selesaikan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(Math.min(100, skor))
  }

  return (
    <div className="aia-stack">
      <style>{`
        @keyframes aia-ps-lempar { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 50% { transform: translate(calc(var(--dx) / 2), calc(var(--dy) / 2 - 90px)) scale(1.05); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(.85); opacity: .95; } }
        @keyframes aia-ps-goyang { from { transform: translateX(-12px); } to { transform: translateX(12px); } }
        @keyframes aia-ps-muncul { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .aia-ps-goyang { animation: aia-ps-goyang 3.2s ease-in-out infinite alternate; }
        .aia-ps-muncul { animation: aia-ps-muncul .25s ease; }
        .aia-ps-terbang { position: fixed; z-index: 60; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); color: var(--foreground); font-size: 14px; font-weight: 700; box-shadow: 0 8px 20px rgba(0,0,0,.18); pointer-events: none; animation: aia-ps-lempar .45s ease-in forwards; }
        @media (prefers-reduced-motion: reduce) {
          .aia-ps-goyang, .aia-ps-muncul { animation: none !important; }
          .aia-ps-terbang { animation-duration: 0.01s !important; }
        }
      `}</style>

      {terbang && (
        <div
          key={terbang.kunci}
          aria-hidden="true"
          className="aia-ps-terbang"
          style={
            {
              left: terbang.x,
              top: terbang.y,
              '--dx': `${terbang.dx}px`,
              '--dy': `${terbang.dy}px`,
            } as React.CSSProperties
          }
          onAnimationEnd={() => selesaikanLempar(terbang.tong)}
        >
          <Package aria-hidden="true" style={{ width: 18, height: 18 }} />
          {terbang.nama}
        </div>
      )}

      {fase === 'main' && saatIni && (
        <>
          <div className="aia-stats" aria-label="Skor dan nyawa tahap ini">
            <span className="aia-stat">
              <Coins aria-hidden="true" /> {skor} Koin Hijau
            </span>
            <span className="aia-stat" aria-label={`Nyawa tersisa: ${nyawaSisa} dari ${NYAWA_AWAL}`}>
              {Array.from({ length: NYAWA_AWAL }, (_, i) => (
                <Heart
                  key={i}
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    color: i < nyawaSisa ? '#b83232' : 'var(--ink-soft)',
                    fill: i < nyawaSisa ? '#b83232' : 'transparent',
                  }}
                />
              ))}
              {nyawaSisa} nyawa
            </span>
            <span className="aia-stat">
              Sampah {Math.min(idx + 1, deck.length)}/{deck.length}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <EfekBenar
              tampil={umpan?.jenis === 'benar'}
              label={umpan?.poin ? `+${umpan.poin} Koin Hijau` : 'Benar!'}
            />
            {spec.tutorial && (
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <TanganPenunjuk label={tahap === 2 ? 'Bidik tongnya, lalu lempar!' : 'Seret sampah ke tong yang benar'} />
              </div>
            )}

            {!modeSatuKetukan && tahap < 2 && (
              <DragDrop
                key={`${saatIni.id}-${idx}`}
                benda={{
                  id: saatIni.id,
                  label: saatIni.nama,
                  konten: <Package aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />,
                }}
                target={{
                  id: saatIni.tong,
                  label: namaTong(saatIni.tong),
                  ikon: (() => {
                    const IkonTong = infoTong(saatIni.tong).ikon
                    return <IkonTong aria-hidden="true" style={{ width: 24, height: 24 }} />
                  })(),
                }}
                targetLain={tongTersedia
                  .filter((t) => t !== saatIni.tong)
                  .map((t) => {
                    const IkonTong = infoTong(t).ikon
                    return {
                      id: t,
                      label: namaTong(t),
                      ikon: <IkonTong aria-hidden="true" style={{ width: 24, height: 24 }} />,
                    }
                  })}
                perbesarTarget={NYAWA_AWAL - nyawaSisa >= 2}
                disabled={resolving}
                onBenar={() => resolveBenar()}
                onSalah={() => resolveSalah(saatIni.penjelasan)}
              />
            )}

            {!modeSatuKetukan && tahap === 2 && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${tongTersedia.length}, 1fr)`,
                    gap: 10,
                  }}
                >
                  {tongTersedia.map((tongId, i) => {
                    const tong = infoTong(tongId)
                    const IkonTong = tong.ikon
                    return (
                      <button
                        key={tong.id}
                        type="button"
                        className={tongBergerak ? 'aia-ps-goyang' : undefined}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          minHeight: 88,
                          padding: '12px 6px',
                          border: '1px solid var(--line)',
                          borderRadius: 14,
                          background: tong.warna,
                          color: tong.teks,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: resolving ? 'default' : 'pointer',
                          animationDelay: tongBergerak ? `${i * 0.5}s` : undefined,
                          boxShadow: aim === tong.id ? '0 0 0 3px var(--green)' : undefined,
                        }}
                        disabled={resolving}
                        aria-pressed={aim === tong.id}
                        aria-label={`Bidik tong ${tong.nama}`}
                        onClick={() => setAim(tong.id)}
                      >
                        <IkonTong aria-hidden="true" style={{ width: 24, height: 24 }} />
                        {tong.nama}
                        <small style={{ fontWeight: 400 }}>
                          {aim === tong.id ? 'Sudah dibidik' : 'Ketuk untuk membidik'}
                        </small>
                      </button>
                    )
                  })}
                </div>
                <ThrowAim
                  key={`${saatIni.id}-${idx}`}
                  label={saatIni.nama}
                  ikon={<Package aria-hidden="true" style={{ width: 28, height: 28 }} />}
                  targetLabel={aim ? namaTong(aim) : namaTong(tongTersedia[0])}
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
                    ref={itemRef}
                    className="aia-card aia-ps-muncul"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: 20,
                      cursor: resolving ? 'default' : 'pointer',
                      outline: dipilih ? '3px solid var(--green)' : undefined,
                      outlineOffset: 2,
                      opacity: terbang ? 0 : 1,
                      pointerEvents: resolving ? 'none' : undefined,
                    }}
                    aria-pressed={dipilih}
                    aria-label={`${saatIni.nama}. Ketuk untuk memilih, lalu ketuk tong.`}
                    onClick={() => {
                      if (resolving) return
                      setDipilih((v) => !v)
                    }}
                  >
                    <Package aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />
                    <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{saatIni.nama}</strong>
                    <small className="aia-muted">
                      {dipilih ? 'Sudah dipilih — ketuk tong yang benar' : 'Ketuk untuk memilih'}
                    </small>
                  </button>
                  {modeMudah && (
                    <p className="aia-muted" style={{ marginTop: 8 }}>
                      Petunjuk: masuk tong {namaTong(saatIni.tong)}.
                    </p>
                  )}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${tongTersedia.length}, 1fr)`,
                    gap: 10,
                  }}
                >
                  {tongTersedia.map((tongId, i) => {
                    const tong = infoTong(tongId)
                    const IkonTong = tong.ikon
                    return (
                      <button
                        key={tong.id}
                        type="button"
                        ref={(el) => {
                          binRefs.current[tong.id] = el
                        }}
                        data-aia-bin={tong.id}
                        className={tongBergerak ? 'aia-ps-goyang' : undefined}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          minHeight: 88,
                          padding: '12px 6px',
                          border: '1px solid var(--line)',
                          borderRadius: 14,
                          background: tong.warna,
                          color: tong.teks,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: resolving ? 'default' : 'pointer',
                          animationDelay: tongBergerak ? `${i * 0.5}s` : undefined,
                          boxShadow: dipilih ? '0 0 0 3px var(--green)' : undefined,
                        }}
                        disabled={resolving}
                        aria-label={`Tong ${tong.nama}`}
                        onClick={() => {
                          if (dipilih) {
                            lepas()
                            resolveLempar(tong.id)
                          }
                        }}
                      >
                        <IkonTong aria-hidden="true" style={{ width: 24, height: 24 }} />
                        {tong.nama}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {modeMudah && !modeSatuKetukan && (
              <p className="aia-muted" style={{ marginTop: 8, textAlign: 'center' }}>
                Petunjuk: masuk tong {namaTong(saatIni.tong)}.
              </p>
            )}

            <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
              {modeSatuKetukan
                ? 'Ketuk sampah untuk memilih, lalu ketuk tong.'
                : tahap === 2
                  ? 'Ketuk tong untuk membidik, lalu tarik dan lepas untuk melempar. Awas, tongnya bergerak pelan!'
                  : 'Seret sampah ke tong yang benar, atau ketuk sampah lalu ketuk tong.'}
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
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-ps-selesai-title">
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 id="aia-ps-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu memilah {benarHitung} dari {deck.length} sampah dengan benar dan mengumpulkan {skor} Koin Hijau.
          </p>
          {catatanDampak && (
            <div className="aia-dialog" style={{ textAlign: 'left', marginTop: 12 }}>
              <strong>Efeknya terasa di misi berikutnya</strong>
              <p>{catatanDampak}</p>
            </div>
          )}
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={selesaikan}>
              <Check aria-hidden="true" /> Lanjutkan
            </button>
          </div>
        </section>
      )}

      {fase === 'gagal' && (
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-ps-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: '#b83232' }} />
          <h3 id="aia-ps-gagal-title" className="aia-section-title">
            Nyawa habis
          </h3>
          <p className="aia-muted">
            Tiga nyawa sudah habis. Baca penjelasannya baik-baik, lalu coba lagi dari awal tahap ini — sampahnya
            diacak ulang.
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => cobaLagi(false)}>
              <RotateCcw aria-hidden="true" /> Coba lagi
            </button>
            {gagalHitung >= 2 && !modeMudah && (
              <button type="button" className="aia-btn aia-btn-ghost" onClick={() => cobaLagi(true)}>
                Mode mudah: tong diam + petunjuk
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
