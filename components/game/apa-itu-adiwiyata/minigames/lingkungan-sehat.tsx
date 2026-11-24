'use client'

// Mini-game Misi Kader "Lingkungan Sehat" — versi gestur.
// Tahap 1: Cek Toilet. Tahap 2: Cek Drainase. Tahap 3: Cek Taman dan PHBS.
// Tiap tahap: cari 5 masalah dengan ketuk (HiddenObject), lalu seret
// tindakan yang benar ke masalah itu (SeretKartu).
// Gestur mengikuti INTERAKSI_MISI['lingkungan-sehat']; isi dari KONTEN_TUGAS.
// Skor tiap tahap 0–100 (20 per temuan, 10 bila butuh percobaan ulang).
// onStageComplete dipanggil tepat satu kali.
// Prop modeSatuKetukan menampilkan versi tombol lama (logika tombol yang
// sudah ada di file ini) sebagai alternatif aksesibilitas.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, CloudRain, Coins, Droplets, Heart, RotateCcw, Sprout, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { SpesifikasiInteraksi } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TahapTugas } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { EfekBenar, EfekSalah, HiddenObject, TanganPenunjuk, useKurangiAnimasi } from '../interaksi'
import { ambil, benar, getar, klik, koin, lepas, nyawa, playPop, plop, salah } from '../suara'

export interface TugasMiniGameSlotProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  /** Bila true, tampilkan versi tombol lama (mode alternatif satu-ketukan). */
  modeSatuKetukan?: boolean
}

const NYAWA_AWAL = 3
const NYAWA_MUDAH = 4

type Fase = 'main' | 'gagal' | 'selesai'

type TahapInspeksi = Extract<TahapTugas, { jenis: 'inspeksi' }>

const IKON_TAHAP: LucideIcon[] = [Droplets, CloudRain, Sprout]

/** Posisi masalah di area pencarian, beda tiap tahap supaya tidak monoton. */
const POSISI_TAHAP: { x: number; y: number }[][] = [
  [
    { x: 16, y: 20 },
    { x: 68, y: 16 },
    { x: 38, y: 48 },
    { x: 84, y: 58 },
    { x: 52, y: 84 },
  ],
  [
    { x: 22, y: 70 },
    { x: 76, y: 26 },
    { x: 44, y: 30 },
    { x: 14, y: 52 },
    { x: 64, y: 80 },
  ],
  [
    { x: 30, y: 18 },
    { x: 80, y: 44 },
    { x: 18, y: 66 },
    { x: 58, y: 40 },
    { x: 72, y: 76 },
  ],
]

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

/** Petunjuk Magi di data berbentuk 'Magi: "..."' — buang pembungkusnya karena
 *  komponen PetunjukMagi sudah memberi label Magi sendiri. */
function teksMagi(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '')
}

// ------------------------------------------------------------ SeretKartu ----
// Seret salah satu dari beberapa kartu ke satu kotak target. Dipakai untuk
// soal kuis (seret kartu jawaban ke kotak jawaban) dan tindakan inspeksi
// (seret tindakan ke masalah). Ketuk kartu lalu ketuk kotak = alternatif
// satu-ketukan. Pola Pointer Events mengikuti DragDrop.

interface KartuSeret {
  id: string
  label: string
  konten?: ReactNode
}

interface SeretKartuProps {
  kartu: KartuSeret[]
  targetLabel: string
  targetIkon?: ReactNode
  benarId: string
  perbesarTarget?: boolean
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, kartu yang benar diberi sorotan (petunjuk setelah 2 gagal). */
  sorotBenar?: boolean
  onBenar: (kartuId: string) => void
  onSalah: (kartuId: string) => void
}

interface Pos {
  x: number
  y: number
}

function SeretKartu({
  kartu,
  targetLabel,
  targetIkon,
  benarId,
  perbesarTarget = false,
  modeSatuKetukan = false,
  disabled = false,
  sorotBenar = false,
  onBenar,
  onSalah,
}: SeretKartuProps) {
  const kurangi = useKurangiAnimasi()
  const [pos, setPos] = useState<Record<string, Pos>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [dipilih, setDipilih] = useState<string | null>(null)
  const [menempel, setMenempel] = useState<string | null>(null)
  const [targetAktif, setTargetAktif] = useState(false)

  const posRef = useRef<Record<string, Pos>>({})
  const seretRef = useRef<{ id: string; x0: number; y0: number; bergerak: boolean } | null>(null)
  const abaikanKlikRef = useRef(false)
  const selesaiRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const targetRef = useRef<HTMLButtonElement | null>(null)
  const kartuRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const pad = perbesarTarget ? 28 : 12

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const aturPos = (id: string, p: Pos | null) => {
    const salin = { ...posRef.current }
    if (p) salin[id] = p
    else delete salin[id]
    posRef.current = salin
    setPos(salin)
  }

  const cekTarget = (clientX: number, clientY: number): boolean => {
    const el = targetRef.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return clientX >= r.left - pad && clientX <= r.right + pad && clientY >= r.top - pad && clientY <= r.bottom + pad
  }

  const evaluasi = (kartuId: string) => {
    if (disabled || menempel) return
    if (kartuId === benarId) {
      const elKartu = kartuRefs.current.get(kartuId)
      const elTarget = targetRef.current
      if (elKartu && elTarget) {
        const a = elKartu.getBoundingClientRect()
        const b = elTarget.getBoundingClientRect()
        const p = posRef.current[kartuId] ?? { x: 0, y: 0 }
        aturPos(kartuId, {
          x: p.x + (b.left + b.width / 2 - (a.left + a.width / 2)),
          y: p.y + (b.top + b.height / 2 - (a.top + a.height / 2)),
        })
      }
      setMenempel(kartuId)
      plop()
      benar()
      getar(20)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(
        () => {
          if (selesaiRef.current) return
          selesaiRef.current = true
          onBenar(kartuId)
        },
        kurangi ? 60 : 450,
      )
    } else {
      salah()
      getar([40, 40, 40])
      aturPos(kartuId, null)
      onSalah(kartuId)
    }
    setTargetAktif(false)
    setDipilih(null)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    if (disabled || menempel) return
    if (modeSatuKetukan) {
      klik()
      setDipilih((v) => (v === id ? null : id))
      return
    }
    ambil()
    seretRef.current = { id, x0: e.clientX, y0: e.clientY, bergerak: false }
    setDragId(id)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    const d = seretRef.current
    if (!d || d.id !== id || modeSatuKetukan) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (Math.abs(dx) + Math.abs(dy) > 10) d.bergerak = true
    aturPos(id, { x: dx, y: dy })
    setTargetAktif(cekTarget(e.clientX, e.clientY))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    const d = seretRef.current
    seretRef.current = null
    setDragId(null)
    if (!d || d.id !== id) return
    if (!d.bergerak) return // Ketuk biasa — ditangani onClick.
    abaikanKlikRef.current = true
    if (cekTarget(e.clientX, e.clientY)) {
      lepas()
      evaluasi(id)
    } else {
      lepas()
      aturPos(id, null)
      setTargetAktif(false)
    }
  }

  const onPointerCancel = (id: string) => {
    if (seretRef.current?.id === id) seretRef.current = null
    setDragId(null)
    aturPos(id, null)
    setTargetAktif(false)
  }

  const onClickKartu = (id: string) => {
    if (abaikanKlikRef.current) {
      abaikanKlikRef.current = false
      return
    }
    if (disabled || menempel) return
    klik()
    setDipilih((v) => (v === id ? null : id))
  }

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-kartu { display: block; width: 100%; padding: 14px 16px; border-radius: 14px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; text-align: left; font-size: 15px; line-height: 1.45; }
        .aia-gi-kartu.dipilih { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-kartu.sorot { outline: 2px dashed #b45309; outline-offset: 2px; }
        .aia-gi-kartu.menempel { outline: 3px solid var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 12%, var(--card, #fff)); }
        .aia-gi-kotak { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; min-height: 88px; border: 2px dashed var(--green, #2f7d4f); border-radius: 14px; background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
        .aia-gi-kotak.aktif { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; transform: scale(1.02); box-shadow: 0 6px 18px rgba(0,0,0,.18); }
        .aia-gi-kotak.siap { background: color-mix(in srgb, #2f7d4f 8%, var(--card, #fff)); }
        .aia-gi-kotak.menempel { outline: 3px solid var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 12%, var(--card, #fff)); }
        @media (prefers-reduced-motion: reduce) { .aia-gi-kotak { transition: none; } }
      `}</style>

      <div style={{ display: 'grid', gap: 8 }}>
        {kartu.map((k) => {
          const p = pos[k.id]
          const isDipilih = dipilih === k.id
          const isMenempel = menempel === k.id
          const isSorot = sorotBenar && k.id === benarId
          return (
            <button
              key={k.id}
              type="button"
              ref={(el) => {
                if (el) kartuRefs.current.set(k.id, el)
                else kartuRefs.current.delete(k.id)
              }}
              className={`aia-gi-kartu${isDipilih ? ' dipilih' : ''}${isMenempel ? ' menempel' : ''}${isSorot ? ' sorot' : ''}`}
              style={{
                transform: p ? `translate(${p.x}px, ${p.y}px) rotate(${p.x * 0.04}deg)` : undefined,
                transition: dragId === k.id || kurangi ? 'none' : 'transform 0.3s ease',
                opacity: isMenempel ? 0.85 : 1,
                pointerEvents: disabled || menempel ? 'none' : undefined,
                minHeight: 56,
              }}
              aria-pressed={isDipilih}
              aria-label={`${k.label}. ${modeSatuKetukan ? 'Ketuk untuk memilih, lalu ketuk kotak.' : 'Seret ke kotak, atau ketuk untuk memilih.'}`}
              onPointerDown={(e) => onPointerDown(e, k.id)}
              onPointerMove={(e) => onPointerMove(e, k.id)}
              onPointerUp={(e) => onPointerUp(e, k.id)}
              onPointerCancel={() => onPointerCancel(k.id)}
              onClick={() => onClickKartu(k.id)}
            >
              {k.konten}
              <strong style={{ display: 'block', marginTop: k.konten ? 6 : 0 }}>{k.label}</strong>
              <small className="aia-muted">
                {modeSatuKetukan
                  ? isDipilih
                    ? 'Sudah dipilih — ketuk kotaknya'
                    : 'Ketuk untuk memilih'
                  : isDipilih
                    ? 'Sudah dipilih — ketuk kotaknya'
                    : 'Seret ke kotak, atau ketuk untuk memilih'}
              </small>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        ref={targetRef}
        className={`aia-gi-kotak${targetAktif ? ' aktif' : ''}${dipilih ? ' siap' : ''}${menempel ? ' menempel' : ''}`}
        style={{ minHeight: perbesarTarget ? 120 : 88, fontSize: perbesarTarget ? 16 : 14 }}
        disabled={disabled || menempel !== null}
        aria-label={`Kotak: ${targetLabel}`}
        onClick={() => {
          if (dipilih) evaluasi(dipilih)
        }}
      >
        {targetIkon}
        {targetLabel}
        {menempel ? ' ✓' : ''}
      </button>
    </div>
  )
}

// ------------------------------------------------- Inspeksi (gestur) ----

function InspeksiGestur({
  tahap,
  stageIndex,
  spec,
  onStageComplete,
}: {
  tahap: TahapInspeksi
  stageIndex: number
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
}) {
  const [temuanSelesai, setTemuanSelesai] = useState<Set<string>>(new Set())
  const [temuanAktif, setTemuanAktif] = useState<number | null>(null)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [gagal, setGagal] = useState(0)
  const [percobaanAktif, setPercobaanAktif] = useState(0)
  const [selesai, setSelesai] = useState(false)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)
  const [efekBenar, setEfekBenar] = useState(false)
  const [pesanSalah, setPesanSalah] = useState<string | null>(null)

  const selesaiRef = useRef(false)
  const timerEfekRef = useRef<number | null>(null)
  const temuan = tahap.temuan
  const posisi = POSISI_TAHAP[stageIndex] ?? POSISI_TAHAP[0]
  const IkonTahap = IKON_TAHAP[stageIndex] ?? Droplets
  const temuanSaatIni = temuanAktif !== null ? temuan[temuanAktif] ?? null : null

  const objek = useMemo(
    () =>
      temuan.map((t, i) => ({
        id: `temuan-${i}`,
        label: t.masalah,
        x: posisi[i % posisi.length].x,
        y: posisi[i % posisi.length].y,
        ikon: (
          <span aria-hidden="true" style={{ fontWeight: 800, fontSize: 18 }}>
            {i + 1}
          </span>
        ),
      })),
    [temuan, posisi],
  )

  // Tiga kartu tindakan untuk temuan yang sedang ditangani (diacak tiap temuan).
  const kartuTindakan = useMemo(() => {
    if (!temuanSaatIni) return []
    return acak([
      { id: 'aksi-benar', label: temuanSaatIni.tindakan },
      ...temuanSaatIni.pilihanSalah.map((s, i) => ({ id: `aksi-salah-${i}`, label: s })),
    ])
  }, [temuanSaatIni])

  useEffect(
    () => () => {
      if (timerEfekRef.current) window.clearTimeout(timerEfekRef.current)
    },
    [],
  )

  const selesaikan = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(nilai)
  }

  const kilauBenar = () => {
    setEfekBenar(true)
    if (timerEfekRef.current) window.clearTimeout(timerEfekRef.current)
    timerEfekRef.current = window.setTimeout(() => setEfekBenar(false), 1500)
  }

  const onTemukan = (id: string) => {
    const idx = Number(id.replace('temuan-', ''))
    if (!Number.isFinite(idx) || temuanSelesai.has(id)) return
    setTemuanAktif(idx)
    setPercobaanAktif(0)
    setPesanSalah(null)
  }

  const onTindakanBenar = () => {
    if (temuanAktif === null) return
    const id = `temuan-${temuanAktif}`
    setSkor((s) => s + (percobaanAktif === 0 ? 20 : 10))
    setBenarCount((c) => c + 1)
    setPesanSalah(null)
    setTunjuk(false)
    kilauBenar()
    setTemuanSelesai((sebelum) => {
      const baru = new Set(sebelum)
      baru.add(id)
      if (baru.size >= temuan.length) {
        window.setTimeout(() => setSelesai(true), 550)
      }
      return baru
    })
    setTemuanAktif(null)
    setPercobaanAktif(0)
  }

  const onTindakanSalah = () => {
    setGagal((g) => g + 1)
    setPercobaanAktif((p) => p + 1)
    setPesanSalah(teksMagi(spec.petunjukMagi))
  }

  if (selesai) {
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu memilih {benarCount} dari {temuan.length} tindakan yang benar. Sekolah jadi lebih sehat!
          </p>
          <p>
            Skor tahap ini: <strong>{skor} Koin Hijau</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesaikan(skor)}>
              <Check aria-hidden="true" /> Lanjutkan
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} />
      <div className="aia-card">
        <span className="aia-kicker">
          Lingkungan Sehat · {tahap.judul} · {temuanSelesai.size}/{temuan.length} masalah selesai
        </span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          {tahap.instruksi}
        </p>
        <div className="aia-stats" style={{ marginTop: 12 }}>
          <span className="aia-stat">
            <Coins aria-hidden="true" /> {skor} Koin Hijau
          </span>
        </div>
      </div>
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Ketuk masalahnya, lalu seret tindakan yang benar" />
        </div>
      )}
      <HiddenObject
        objek={objek}
        batasWaktuMs={0}
        disabled={temuanAktif !== null}
        onTemukan={onTemukan}
        onSelesai={() => {
          // Semua masalah ketemu — tahap tetap lanjut ke tindakan tiap masalah.
        }}
      />
      {temuanSaatIni && temuanAktif !== null && (
        <div className="aia-card">
          <span className="aia-kicker">Masalah ditemukan</span>
          <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{temuanSaatIni.masalah}</strong>
          <p className="aia-muted" style={{ margin: '4px 0 0' }}>
            Seret tindakan yang benar ke masalah ini.
          </p>
          <div style={{ marginTop: 12 }}>
            <SeretKartu
              key={`temuan-${temuanAktif}`}
              kartu={kartuTindakan}
              targetLabel={temuanSaatIni.masalah}
              targetIkon={<IkonTahap aria-hidden="true" style={{ width: 28, height: 28, color: 'var(--green)' }} />}
              benarId="aksi-benar"
              perbesarTarget={gagal >= 2}
              sorotBenar={percobaanAktif >= 2}
              onBenar={onTindakanBenar}
              onSalah={onTindakanSalah}
            />
          </div>
          {pesanSalah && <EfekSalah tampil petunjuk={pesanSalah} />}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------- Inspeksi (tombol) ----
// Versi tombol lama — dipakai sebagai mode alternatif satu-ketukan.

function InspeksiSehat({
  tahap,
  stageIndex,
  onStageComplete,
}: {
  tahap: TahapInspeksi
  stageIndex: number
  onStageComplete: (score: number) => void
}) {
  const [fase, setFase] = useState<Fase>('main')
  const [ronde, setRonde] = useState(0)
  const [mudah, setMudah] = useState(false)
  const [gagalCount, setGagalCount] = useState(0)
  const [idx, setIdx] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [nyawaSisa, setNyawaSisa] = useState(NYAWA_AWAL)
  const [habis, setHabis] = useState(false)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [umpan, setUmpan] = useState<{ benar: boolean; teks: string } | null>(null)

  const selesaiRef = useRef(false)
  const totalNyawa = mudah ? NYAWA_MUDAH : NYAWA_AWAL
  const temuan = tahap.temuan

  // Acak urutan tiga tindakan tiap temuan supaya tindakan benar tidak
  // selalu di posisi yang sama.
  const opsiPerTemuan = useMemo(
    () =>
      temuan.map((t) =>
        acak([
          { teks: t.tindakan, benar: true },
          ...t.pilihanSalah.map((s) => ({ teks: s, benar: false })),
        ]),
      ),
    [temuan, ronde],
  )
  const temuanSaatIni = temuan[idx] ?? null
  const opsi = temuanSaatIni ? opsiPerTemuan[idx] : null
  const IkonTahap = IKON_TAHAP[stageIndex] ?? Droplets

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  const jawab = (indexTampil: number) => {
    if (!temuanSaatIni || !opsi || umpan) return
    const pilihan = opsi[indexTampil]
    if (!pilihan) return
    setDipilih(indexTampil)
    if (pilihan.benar) {
      setSkor((s) => s + 20)
      setBenarCount((c) => c + 1)
      benar()
      setUmpan({ benar: true, teks: temuanSaatIni.tindakan })
    } else {
      const sisa = nyawaSisa - 1
      setNyawaSisa(sisa)
      if (sisa <= 0) setHabis(true)
      salah()
      nyawa()
      setUmpan({ benar: false, teks: `Tindakan yang benar: ${temuanSaatIni.tindakan}` })
    }
  }

  const lanjut = () => {
    playPop()
    if (habis) {
      setFase('gagal')
      setGagalCount((g) => g + 1)
      return
    }
    if (idx + 1 >= temuan.length) {
      setFase('selesai')
      koin()
      return
    }
    setIdx((i) => i + 1)
    setDipilih(null)
    setUmpan(null)
  }

  const cobaLagi = (pakaiMudah: boolean) => {
    playPop()
    setMudah(pakaiMudah)
    setRonde((r) => r + 1)
    setIdx(0)
    setSkor(0)
    setBenarCount(0)
    setNyawaSisa(pakaiMudah ? NYAWA_MUDAH : NYAWA_AWAL)
    setHabis(false)
    setDipilih(null)
    setUmpan(null)
    setFase('main')
  }

  if (!temuanSaatIni || !opsi) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Temuan tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">
              Lingkungan Sehat · {tahap.judul} · Temuan {idx + 1} dari {temuan.length}
            </span>
            <p className="aia-muted" style={{ margin: '8px 0 0' }}>
              {tahap.instruksi}
            </p>
            <div className="aia-stats" style={{ marginTop: 12 }}>
              <span className="aia-stat">
                <Coins aria-hidden="true" /> {skor} Koin Hijau
              </span>
              <span
                className="aia-stat"
                role="status"
                aria-label={`Nyawa tersisa ${Math.max(0, nyawaSisa)} dari ${totalNyawa}`}
              >
                {Array.from({ length: totalNyawa }).map((_, i) => (
                  <Heart
                    key={i}
                    aria-hidden="true"
                    size={18}
                    color={i < nyawaSisa ? '#e11d48' : '#cbd5ce'}
                    fill={i < nyawaSisa ? '#e11d48' : 'transparent'}
                    style={{ verticalAlign: '-3px' }}
                  />
                ))}{' '}
                {nyawaSisa} nyawa
              </span>
            </div>
          </div>

          <div className="aia-card" style={{ textAlign: 'center' }}>
            <IkonTahap aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />
            <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{temuanSaatIni.masalah}</strong>
            <p className="aia-muted" style={{ margin: '4px 0 0' }}>
              Apa tindakan yang benar?
            </p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {opsi.map((pilihan, i) => {
              const isJawaban = pilihan.benar
              const isDipilih = i === dipilih
              let latar: string | undefined
              let border: string | undefined
              if (umpan && isJawaban) {
                latar = '#dcfce7'
                border = '2px solid #236b4d'
              } else if (umpan && isDipilih) {
                latar = '#fee2e2'
                border = '2px solid #b83232'
              }
              return (
                <button
                  key={i}
                  type="button"
                  className="aia-btn aia-btn-block"
                  disabled={!!umpan}
                  onClick={() => jawab(i)}
                  aria-label={`Tindakan ${String.fromCharCode(65 + i)}: ${pilihan.teks}`}
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
                  {umpan && isJawaban && <Check aria-hidden="true" color="#236b4d" />}
                  {umpan && isDipilih && !isJawaban && <X aria-hidden="true" color="#b83232" />}
                </button>
              )
            })}
          </div>

          {umpan && (
            <div
              className="aia-dialog"
              aria-live="polite"
              style={umpan.benar ? undefined : { borderLeftColor: '#b83232' }}
            >
              <strong>{umpan.benar ? 'Benar!' : 'Belum tepat.'}</strong>
              <p>{umpan.teks}</p>
              <div className="aia-actions">
                <button type="button" className="aia-btn aia-btn-primary" onClick={lanjut}>
                  {habis ? 'Lihat hasil' : idx + 1 >= temuan.length ? 'Lihat hasil' : 'Temuan berikutnya'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {fase === 'selesai' && (
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }} aria-labelledby="aia-ls-selesai-title">
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 id="aia-ls-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu memilih {benarCount} dari {temuan.length} tindakan yang benar. Sekolah jadi lebih sehat!
          </p>
          <p>
            Skor tahap ini: <strong>{skor} Koin Hijau</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
              <Check aria-hidden="true" /> Lanjutkan
            </button>
          </div>
        </section>
      )}

      {fase === 'gagal' && (
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-ls-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: '#b83232' }} />
          <h3 id="aia-ls-gagal-title" className="aia-section-title">
            Nyawa habis
          </h3>
          <p className="aia-muted">
            Nyawamu sudah habis. Coba lagi dari awal tahap ini — urutan tindakannya diacak ulang.
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => cobaLagi(false)}>
              <RotateCcw aria-hidden="true" /> Coba lagi
            </button>
            {gagalCount >= 2 && !mudah && (
              <button type="button" className="aia-btn aia-btn-ghost" onClick={() => cobaLagi(true)}>
                Mode mudah: 4 nyawa
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

// ------------------------------------------------------------- Ekspor utama ----

/**
 * Mini-game Misi Kader "Lingkungan Sehat".
 * Menerima props bentuk TugasMiniGameSlotProps; tahap dipilih dari
 * KONTEN_TUGAS[tugasId].tahapan[stageIndex] (ketiga tahap berjenis inspeksi).
 * modeSatuKetukan = true menampilkan versi tombol lama.
 * TIDAK disambungkan ke mana pun di sini — agen integrasi yang menyambung.
 */
export function LingkunganSehat({ tugasId, stageIndex, onStageComplete, modeSatuKetukan = false }: TugasMiniGameSlotProps) {
  const konten = KONTEN_TUGAS[tugasId]
  const tahap = konten?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  if (!tahap || tahap.jenis !== 'inspeksi' || !spec) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }
  const kunci = `${tugasId}-${stageIndex}`
  if (modeSatuKetukan) {
    return <InspeksiSehat key={kunci} tahap={tahap} stageIndex={stageIndex} onStageComplete={onStageComplete} />
  }
  return <InspeksiGestur key={kunci} tahap={tahap} stageIndex={stageIndex} spec={spec} onStageComplete={onStageComplete} />
}
