'use client'

// Mini-game Misi Kader "Bank Sampah dan Daur Ulang" — versi gestur.
// Tahap 1 (pilah): seret item anorganik ke kelompok PET / Kertas / Kaleng / Kaca.
// Tahap 2 (catat): seret angka berat ke jenisnya di buku tabungan.
// Tahap 3 (kuis): seret kartu jawaban hitungan tabungan ke kotak jawaban.
// Gestur mengikuti INTERAKSI_MISI['bank-sampah']; isi dari KONTEN_TUGAS.
// Skor tiap tahap 0–100; onStageComplete dipanggil tepat satu kali.
// Prop modeSatuKetukan menampilkan versi tombol lama (logika tombol yang
// sudah ada di file ini) sebagai alternatif aksesibilitas.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Coins, Heart, Package, Recycle, RotateCcw, X } from 'lucide-react'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { SpesifikasiInteraksi } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TahapTugas } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { DragDrop, EfekBenar, EfekSalah, TanganPenunjuk, useKurangiAnimasi } from '../interaksi'
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

type TahapPilah = Extract<TahapTugas, { jenis: 'pilah' }>
type TahapCatat = Extract<TahapTugas, { jenis: 'catat' }>
type TahapKuis = Extract<TahapTugas, { jenis: 'kuis' }>

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

function BarisNyawa({ nyawaSisa, total }: { nyawaSisa: number; total: number }) {
  return (
    <span role="status" aria-label={`Nyawa tersisa ${Math.max(0, nyawaSisa)} dari ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <Heart
          key={i}
          aria-hidden="true"
          size={18}
          color={i < nyawaSisa ? '#e11d48' : '#cbd5ce'}
          fill={i < nyawaSisa ? '#e11d48' : 'transparent'}
          style={{ verticalAlign: '-3px' }}
        />
      ))}
    </span>
  )
}

const WARNA_KELOMPOK: Record<string, string> = {
  PET: '#2563eb',
  Kertas: '#b45309',
  Kaleng: '#6b7280',
  Kaca: '#0d9488',
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

// ------------------------------------------------- Tahap 1: pilah (gestur) ----

function PilahGestur({
  tahap,
  spec,
  onStageComplete,
}: {
  tahap: TahapPilah
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
}) {
  const [idx, setIdx] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [gagal, setGagal] = useState(0)
  const [percobaan, setPercobaan] = useState(0)
  const [selesai, setSelesai] = useState(false)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)
  const [efekBenar, setEfekBenar] = useState(false)
  const [pesanSalah, setPesanSalah] = useState<string | null>(null)

  const selesaiRef = useRef(false)
  const timerEfekRef = useRef<number | null>(null)
  const deck = useMemo(() => acak(tahap.items), [tahap])
  const item = deck[idx] ?? null

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

  const onBenar = () => {
    if (!item) return
    setSkor((s) => s + (percobaan === 0 ? 10 : 5))
    setBenarCount((c) => c + 1)
    setPesanSalah(null)
    setTunjuk(false)
    kilauBenar()
    window.setTimeout(() => {
      if (idx + 1 >= deck.length) setSelesai(true)
      else {
        setIdx((i) => i + 1)
        setPercobaan(0)
      }
    }, 550)
  }

  const onSalah = () => {
    setGagal((g) => g + 1)
    setPercobaan((p) => p + 1)
    setPesanSalah(teksMagi(spec.petunjukMagi))
  }

  if (selesai) {
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu memilah {benarCount} dari {deck.length} item dengan benar.
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

  if (!item) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Item tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} />
      <div className="aia-card">
        <span className="aia-kicker">Bank Sampah · {tahap.judul}</span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          {tahap.instruksi}
        </p>
        <div className="aia-stats" style={{ marginTop: 12 }}>
          <span className="aia-stat">
            <Coins aria-hidden="true" /> {skor} Koin Hijau
          </span>
          <span className="aia-stat">
            Item {Math.min(idx + 1, deck.length)}/{deck.length}
          </span>
        </div>
      </div>
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Seret ke kelompok yang benar" />
        </div>
      )}
      <DragDrop
        key={item.nama}
        benda={{
          id: item.nama,
          label: item.nama,
          konten: <Package aria-hidden="true" style={{ width: 40, height: 40, color: 'var(--green)' }} />,
        }}
        target={{
          id: item.kelompok,
          label: item.kelompok,
          ikon: <Recycle aria-hidden="true" color={WARNA_KELOMPOK[item.kelompok] ?? '#236b4d'} />,
        }}
        targetLain={tahap.kelompok
          .filter((k) => k !== item.kelompok)
          .map((k) => ({
            id: k,
            label: k,
            ikon: <Recycle aria-hidden="true" color={WARNA_KELOMPOK[k] ?? '#236b4d'} />,
          }))}
        perbesarTarget={gagal >= 2}
        onBenar={onBenar}
        onSalah={onSalah}
      />
      {pesanSalah && <EfekSalah tampil petunjuk={pesanSalah} />}
    </div>
  )
}

// ------------------------------------------------- Tahap 2: catat (gestur) ----

function CatatGestur({
  tahap,
  spec,
  onStageComplete,
}: {
  tahap: TahapCatat
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
}) {
  const [pos, setPos] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [gagal, setGagal] = useState(0)
  const [percobaan, setPercobaan] = useState(0)
  const [selesai, setSelesai] = useState(false)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)
  const [efekBenar, setEfekBenar] = useState(false)
  const [pesanSalah, setPesanSalah] = useState<string | null>(null)
  const [tercatat, setTercatat] = useState<Record<string, string>>({})

  const selesaiRef = useRef(false)
  const timerEfekRef = useRef<number | null>(null)
  const baris = tahap.tabel.baris
  const urutan = useMemo(() => acak(baris.map((_, i) => i)), [baris])
  const barisIdx = urutan[pos] ?? 0
  const barisSaatIni = baris[barisIdx] ?? null
  const jenis = barisSaatIni?.[0] ?? ''
  const beratBenar = barisSaatIni?.[1] ?? ''

  // Total timbangan hari ini, dihitung dari tabel (bukan angka karangan).
  const totalBerat = useMemo(() => {
    const jumlah = baris.reduce((acc, b) => {
      const angka = parseFloat((b[1] ?? '').replace(',', '.').replace(/[^0-9.]/g, ''))
      return acc + (Number.isFinite(angka) ? angka : 0)
    }, 0)
    return `${jumlah.toFixed(1).replace('.', ',')} kg`
  }, [baris])

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

  const onBenar = () => {
    if (!barisSaatIni) return
    setSkor((s) => s + (percobaan === 0 ? 25 : 10))
    setBenarCount((c) => c + 1)
    setTercatat((t) => ({ ...t, [jenis]: beratBenar }))
    setPesanSalah(null)
    setTunjuk(false)
    kilauBenar()
    window.setTimeout(() => {
      if (pos + 1 >= baris.length) setSelesai(true)
      else {
        setPos((p) => p + 1)
        setPercobaan(0)
      }
    }, 550)
  }

  const onSalah = () => {
    setGagal((g) => g + 1)
    setPercobaan((p) => p + 1)
    setPesanSalah(teksMagi(spec.petunjukMagi))
  }

  if (selesai) {
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu mencatat {benarCount} dari {baris.length} jenis sampah dengan benar. Total timbangan hari ini:{' '}
            <strong>{totalBerat}</strong>.
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

  if (!barisSaatIni) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tabel tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} />
      <div className="aia-card">
        <span className="aia-kicker">Bank Sampah · {tahap.judul}</span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          {tahap.instruksi}
        </p>
        <div className="aia-stats" style={{ marginTop: 12 }}>
          <span className="aia-stat">
            <Coins aria-hidden="true" /> {skor} Koin Hijau
          </span>
          <span className="aia-stat">
            Jenis {Math.min(pos + 1, baris.length)}/{baris.length}
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 14 }}>
          <caption style={{ textAlign: 'left', fontWeight: 700, marginBottom: 8 }}>
            {tahap.tabel.judul}
          </caption>
          <thead>
            <tr>
              {tahap.tabel.kolom.map((k) => (
                <th
                  key={k}
                  scope="col"
                  style={{ textAlign: 'left', padding: '8px 4px', borderBottom: '2px solid var(--line)' }}
                >
                  {k}
                </th>
              ))}
              <th
                scope="col"
                style={{ textAlign: 'left', padding: '8px 4px', borderBottom: '2px solid var(--line)' }}
              >
                Tercatat
              </th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => (
              <tr key={b[0] ?? i}>
                {b.map((sel, j) => (
                  <td
                    key={j}
                    style={{
                      padding: '8px 4px',
                      borderBottom: '1px solid var(--line)',
                      fontWeight: j === 0 && b[0] === jenis ? 800 : j === 0 ? 700 : undefined,
                    }}
                  >
                    {sel}
                  </td>
                ))}
                <td style={{ padding: '8px 4px', borderBottom: '1px solid var(--line)' }}>
                  {tercatat[b[0] ?? ''] ? '✓' : b[0] === jenis ? '…' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Seret beratnya ke jenis yang benar" />
        </div>
      )}
      <DragDrop
        key={`${jenis}-${beratBenar}`}
        benda={{
          id: beratBenar,
          label: `Berat: ${beratBenar}`,
          konten: <strong style={{ fontSize: 28 }}>{beratBenar}</strong>,
        }}
        target={{
          id: jenis,
          label: jenis,
          ikon: <Recycle aria-hidden="true" color={WARNA_KELOMPOK[jenis] ?? '#236b4d'} />,
        }}
        targetLain={baris
          .filter((b) => b[0] !== jenis)
          .map((b) => ({
            id: b[0] ?? '',
            label: b[0] ?? '',
            ikon: <Recycle aria-hidden="true" color={WARNA_KELOMPOK[b[0] ?? ''] ?? '#236b4d'} />,
          }))}
        perbesarTarget={gagal >= 2}
        onBenar={onBenar}
        onSalah={onSalah}
      />
      {pesanSalah && <EfekSalah tampil petunjuk={pesanSalah} />}
    </div>
  )
}

// -------------------------------------------------- Tahap 3: kuis (gestur) ----

function KuisGestur({
  tahap,
  spec,
  onStageComplete,
}: {
  tahap: TahapKuis
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
}) {
  const soal = tahap.soal
  const [qIndex, setQIndex] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [gagal, setGagal] = useState(0)
  const [percobaan, setPercobaan] = useState(0)
  const [selesai, setSelesai] = useState(false)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)
  const [efekBenar, setEfekBenar] = useState(false)
  const [pesanSalah, setPesanSalah] = useState<string | null>(null)
  const [umpan, setUmpan] = useState<{ benar: boolean; teks: string } | null>(null)

  const selesaiRef = useRef(false)
  const timerEfekRef = useRef<number | null>(null)
  const pertanyaan = soal[qIndex] ?? null

  const kartu = useMemo(() => {
    if (!pertanyaan) return []
    return acak(pertanyaan.pilihan.map((teks, i) => ({ id: `opsi-${i}`, label: teks })))
  }, [pertanyaan, qIndex])
  const benarId = pertanyaan ? `opsi-${pertanyaan.jawaban}` : ''

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

  const onBenar = () => {
    if (!pertanyaan) return
    setSkor((s) => s + (percobaan === 0 ? 25 : 10))
    setBenarCount((c) => c + 1)
    setPesanSalah(null)
    setTunjuk(false)
    kilauBenar()
    setUmpan({ benar: true, teks: pertanyaan.penjelasan })
  }

  const onSalah = () => {
    if (!pertanyaan) return
    setGagal((g) => g + 1)
    setPercobaan((p) => p + 1)
    setPesanSalah(teksMagi(spec.petunjukMagi))
    setUmpan({ benar: false, teks: pertanyaan.penjelasan })
  }

  const lanjut = () => {
    playPop()
    if (qIndex + 1 >= soal.length) setSelesai(true)
    else {
      setQIndex((q) => q + 1)
      setPercobaan(0)
      setUmpan(null)
      setPesanSalah(null)
    }
  }

  if (selesai) {
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu menjawab {benarCount} dari {soal.length} soal hitung tabungan dengan benar.
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

  if (!pertanyaan) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Soal tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} />
      <div className="aia-card">
        <span className="aia-kicker">
          Bank Sampah · {tahap.judul} · Soal {qIndex + 1} dari {soal.length}
        </span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          {tahap.instruksi}
        </p>
        <div className="aia-stats" style={{ marginTop: 12 }}>
          <span className="aia-stat">
            <Coins aria-hidden="true" /> {skor} Koin Hijau
          </span>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
          {pertanyaan.pertanyaan}
        </p>
      </div>
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Seret kartu jawaban ke kotak" />
        </div>
      )}
      <SeretKartu
        key={qIndex}
        kartu={kartu}
        targetLabel="Kotak jawaban"
        benarId={benarId}
        perbesarTarget={gagal >= 2}
        sorotBenar={percobaan >= 2}
        onBenar={onBenar}
        onSalah={onSalah}
      />
      {pesanSalah && <EfekSalah tampil petunjuk={pesanSalah} />}
      {umpan && !umpan.benar && (
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          Penjelasan: {umpan.teks}
        </p>
      )}
      {umpan?.benar && (
        <>
          <div
            role="status"
            style={{ padding: 12, borderRadius: 12, background: '#dcfce7' }}
          >
            <strong>Benar!</strong> {umpan.teks}
          </div>
          <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={lanjut}>
            {qIndex + 1 >= soal.length ? 'Lihat hasil' : 'Soal berikutnya'}
          </button>
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------- Tahap 1: pilah (tombol) ----
// Versi tombol lama — dipakai sebagai mode alternatif satu-ketukan.

function PilahAnorganik({
  tahap,
  onStageComplete,
}: {
  tahap: TahapPilah
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
  const [dipilih, setDipilih] = useState<string | null>(null)
  const [umpan, setUmpan] = useState<{ benar: boolean; teks: string } | null>(null)

  const selesaiRef = useRef(false)
  const totalNyawa = mudah ? NYAWA_MUDAH : NYAWA_AWAL
  const deck = useMemo(() => acak(tahap.items), [tahap, ronde])
  const item = deck[idx] ?? null

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  const jawab = (kelompok: string) => {
    if (!item || umpan) return
    const isBenar = kelompok === item.kelompok
    setDipilih(kelompok)
    if (isBenar) {
      setSkor((s) => s + 10)
      setBenarCount((c) => c + 1)
      benar()
      setUmpan({ benar: true, teks: `Benar! ${item.nama} termasuk ${item.kelompok}.` })
    } else {
      const sisa = nyawaSisa - 1
      setNyawaSisa(sisa)
      if (sisa <= 0) setHabis(true)
      salah()
      nyawa()
      setUmpan({
        benar: false,
        teks: `Bukan ${kelompok}. ${item.nama} termasuk ${item.kelompok} — ingat-ingat, ya.`,
      })
    }
  }

  const lanjut = () => {
    playPop()
    if (habis) {
      setFase('gagal')
      setGagalCount((g) => g + 1)
      return
    }
    if (idx + 1 >= deck.length) {
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

  if (!item) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Item tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">Bank Sampah · {tahap.judul}</span>
            <p className="aia-muted" style={{ margin: '8px 0 0' }}>
              {tahap.instruksi}
            </p>
            <div className="aia-stats" style={{ marginTop: 12 }}>
              <span className="aia-stat">
                <Coins aria-hidden="true" /> {skor} Koin Hijau
              </span>
              <span className="aia-stat">
                <BarisNyawa nyawaSisa={nyawaSisa} total={totalNyawa} /> {nyawaSisa} nyawa
              </span>
              <span className="aia-stat">
                Item {Math.min(idx + 1, deck.length)}/{deck.length}
              </span>
            </div>
          </div>

          <div className="aia-card" style={{ textAlign: 'center' }}>
            <Package aria-hidden="true" style={{ width: 44, height: 44, color: 'var(--green)' }} />
            <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{item.nama}</strong>
            <p className="aia-muted" style={{ margin: '4px 0 0' }}>
              Masuk kelompok apa?
            </p>
            {mudah && (
              <p className="aia-muted" style={{ margin: '8px 0 0', color: '#236b4d' }}>
                Petunjuk: masuk kelompok {item.kelompok}.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {tahap.kelompok.map((kelompok) => {
              const warna = WARNA_KELOMPOK[kelompok] ?? '#236b4d'
              const isDipilih = dipilih === kelompok
              const isJawaban = item.kelompok === kelompok
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
                  key={kelompok}
                  type="button"
                  className="aia-btn aia-btn-block"
                  disabled={!!umpan}
                  onClick={() => jawab(kelompok)}
                  aria-label={`Kelompok ${kelompok}`}
                  style={{
                    minHeight: 56,
                    background: latar ?? warna,
                    border,
                    color: latar ? 'inherit' : '#ffffff',
                    whiteSpace: 'normal',
                    height: 'auto',
                    padding: '12px 16px',
                  }}
                >
                  <Recycle aria-hidden="true" /> {kelompok}
                  {umpan && isJawaban && <Check aria-hidden="true" />}
                  {umpan && isDipilih && !isJawaban && <X aria-hidden="true" />}
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
              <strong>{umpan.benar ? 'Benar!' : 'Yah, salah kelompok.'}</strong>
              <p>{umpan.teks}</p>
              <div className="aia-actions">
                <button type="button" className="aia-btn aia-btn-primary" onClick={lanjut}>
                  {habis ? 'Lihat hasil' : idx + 1 >= deck.length ? 'Lihat hasil' : 'Item berikutnya'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {fase === 'selesai' && (
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }} aria-labelledby="aia-bs-selesai-title">
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 id="aia-bs-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu memilah {benarCount} dari {deck.length} item dengan benar.
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
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-bs-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: '#b83232' }} />
          <h3 id="aia-bs-gagal-title" className="aia-section-title">
            Nyawa habis
          </h3>
          <p className="aia-muted">
            Nyawamu sudah habis. Coba lagi dari awal tahap ini — itemnya diacak ulang.
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => cobaLagi(false)}>
              <RotateCcw aria-hidden="true" /> Coba lagi
            </button>
            {gagalCount >= 2 && !mudah && (
              <button type="button" className="aia-btn aia-btn-ghost" onClick={() => cobaLagi(true)}>
                Mode mudah: 4 nyawa + petunjuk kelompok
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

// ------------------------------------------------------- Tahap 2: catat (tombol) ----
// Versi tombol lama — dipakai sebagai mode alternatif satu-ketukan.

function CatatTimbangan({
  tahap,
  onStageComplete,
}: {
  tahap: TahapCatat
  onStageComplete: (score: number) => void
}) {
  const [fase, setFase] = useState<Fase>('main')
  const [ronde, setRonde] = useState(0)
  const [mudah, setMudah] = useState(false)
  const [gagalCount, setGagalCount] = useState(0)
  const [rowIdx, setRowIdx] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [nyawaSisa, setNyawaSisa] = useState(NYAWA_AWAL)
  const [habis, setHabis] = useState(false)
  const [hasil, setHasil] = useState<boolean[]>([])
  const [dipilih, setDipilih] = useState<string | null>(null)
  const [umpan, setUmpan] = useState<{ benar: boolean; teks: string } | null>(null)

  const selesaiRef = useRef(false)
  const totalNyawa = mudah ? NYAWA_MUDAH : NYAWA_AWAL
  const baris = tahap.tabel.baris
  const bobot = useMemo(() => baris.map((b) => b[1] ?? ''), [baris])
  const opsiPerBaris = useMemo(() => baris.map(() => acak(bobot)), [baris, bobot, ronde])
  const barisSaatIni = baris[rowIdx] ?? null
  const jenis = barisSaatIni?.[0] ?? ''
  const beratBenar = barisSaatIni?.[1] ?? ''
  const opsi = opsiPerBaris[rowIdx] ?? []

  // Total timbangan hari ini, dihitung dari tabel (bukan angka karangan).
  const totalBerat = useMemo(() => {
    const jumlah = baris.reduce((acc, b) => {
      const angka = parseFloat((b[1] ?? '').replace(',', '.').replace(/[^0-9.]/g, ''))
      return acc + (Number.isFinite(angka) ? angka : 0)
    }, 0)
    return `${jumlah.toFixed(1).replace('.', ',')} kg`
  }, [baris])

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  const jawab = (berat: string) => {
    if (!barisSaatIni || umpan) return
    const isBenar = berat === beratBenar
    setDipilih(berat)
    setHasil((h) => {
      const salin = [...h]
      salin[rowIdx] = isBenar
      return salin
    })
    if (isBenar) {
      setSkor((s) => s + 25)
      setBenarCount((c) => c + 1)
      benar()
      setUmpan({ benar: true, teks: `Benar! ${jenis} hari ini ${beratBenar} — sudah tercatat di buku tabungan.` })
    } else {
      const sisa = nyawaSisa - 1
      setNyawaSisa(sisa)
      if (sisa <= 0) setHabis(true)
      salah()
      nyawa()
      setUmpan({ benar: false, teks: `Bukan ${berat}. Cek lagi tabelnya: ${jenis} beratnya ${beratBenar}.` })
    }
  }

  const lanjut = () => {
    playPop()
    if (habis) {
      setFase('gagal')
      setGagalCount((g) => g + 1)
      return
    }
    if (rowIdx + 1 >= baris.length) {
      setFase('selesai')
      koin()
      return
    }
    setRowIdx((i) => i + 1)
    setDipilih(null)
    setUmpan(null)
  }

  const cobaLagi = (pakaiMudah: boolean) => {
    playPop()
    setMudah(pakaiMudah)
    setRonde((r) => r + 1)
    setRowIdx(0)
    setSkor(0)
    setBenarCount(0)
    setNyawaSisa(pakaiMudah ? NYAWA_MUDAH : NYAWA_AWAL)
    setHabis(false)
    setHasil([])
    setDipilih(null)
    setUmpan(null)
    setFase('main')
  }

  if (!barisSaatIni) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tabel tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">Bank Sampah · {tahap.judul}</span>
            <p className="aia-muted" style={{ margin: '8px 0 0' }}>
              {tahap.instruksi}
            </p>
            <div className="aia-stats" style={{ marginTop: 12 }}>
              <span className="aia-stat">
                <Coins aria-hidden="true" /> {skor} Koin Hijau
              </span>
              <span className="aia-stat">
                <BarisNyawa nyawaSisa={nyawaSisa} total={totalNyawa} /> {nyawaSisa} nyawa
              </span>
              <span className="aia-stat">
                Jenis {Math.min(rowIdx + 1, baris.length)}/{baris.length}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 14 }}>
              <caption style={{ textAlign: 'left', fontWeight: 700, marginBottom: 8 }}>
                {tahap.tabel.judul}
              </caption>
              <thead>
                <tr>
                  {tahap.tabel.kolom.map((k) => (
                    <th
                      key={k}
                      scope="col"
                      style={{ textAlign: 'left', padding: '8px 4px', borderBottom: '2px solid var(--line)' }}
                    >
                      {k}
                    </th>
                  ))}
                  <th
                    scope="col"
                    style={{ textAlign: 'left', padding: '8px 4px', borderBottom: '2px solid var(--line)' }}
                  >
                    Tercatat
                  </th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b, i) => (
                  <tr key={b[0] ?? i}>
                    {b.map((sel, j) => (
                      <td
                        key={j}
                        style={{
                          padding: '8px 4px',
                          borderBottom: '1px solid var(--line)',
                          fontWeight: j === 0 && i === rowIdx ? 800 : j === 0 ? 700 : undefined,
                        }}
                      >
                        {sel}
                      </td>
                    ))}
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid var(--line)' }}>
                      {hasil[i] === true ? '✓' : hasil[i] === false ? '✗' : i === rowIdx ? '…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              Berapa berat {jenis} hari ini?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {opsi.map((berat) => {
                const isDipilih = dipilih === berat
                const isJawaban = berat === beratBenar
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
                    key={berat}
                    type="button"
                    className="aia-btn aia-btn-block"
                    disabled={!!umpan}
                    onClick={() => jawab(berat)}
                    aria-label={`Berat ${berat}`}
                    style={{
                      minHeight: 48,
                      background: latar,
                      border,
                      whiteSpace: 'normal',
                      height: 'auto',
                      padding: '12px 16px',
                    }}
                  >
                    {berat}
                    {umpan && isJawaban && <Check aria-hidden="true" />}
                    {umpan && isDipilih && !isJawaban && <X aria-hidden="true" />}
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
                  background: umpan.benar ? '#dcfce7' : '#fee2e2',
                }}
              >
                <strong>{umpan.benar ? 'Benar!' : 'Belum tepat.'}</strong> {umpan.teks}
              </div>
            )}

            {umpan && (
              <button
                type="button"
                className="aia-btn aia-btn-primary aia-btn-block"
                style={{ marginTop: 12 }}
                onClick={lanjut}
              >
                {habis ? 'Lihat hasil' : rowIdx + 1 >= baris.length ? 'Lihat hasil' : 'Jenis berikutnya'}
              </button>
            )}
          </div>
        </>
      )}

      {fase === 'selesai' && (
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }} aria-labelledby="aia-bs2-selesai-title">
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 id="aia-bs2-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu mencatat {benarCount} dari {baris.length} jenis sampah dengan benar. Total timbangan hari ini:{' '}
            <strong>{totalBerat}</strong>.
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
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-bs2-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: '#b83232' }} />
          <h3 id="aia-bs2-gagal-title" className="aia-section-title">
            Nyawa habis
          </h3>
          <p className="aia-muted">
            Nyawamu sudah habis. Coba lagi dari awal tahap ini — urutan beratnya diacak ulang.
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

// -------------------------------------------------------- Tahap 3: kuis (tombol) ----
// Versi tombol lama — dipakai sebagai mode alternatif satu-ketukan.

function KuisTabungan({
  tahap,
  onStageComplete,
}: {
  tahap: TahapKuis
  onStageComplete: (score: number) => void
}) {
  const soal = tahap.soal
  const [fase, setFase] = useState<Fase>('main')
  const [ronde, setRonde] = useState(0)
  const [mudah, setMudah] = useState(false)
  const [gagalCount, setGagalCount] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [nyawaSisa, setNyawaSisa] = useState(NYAWA_AWAL)
  const [habis, setHabis] = useState(false)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [umpan, setUmpan] = useState<{ benar: boolean; teks: string } | null>(null)

  const selesaiRef = useRef(false)
  const totalNyawa = mudah ? NYAWA_MUDAH : NYAWA_AWAL

  // Acak urutan pilihan tiap soal supaya jawaban benar tidak selalu di
  // posisi yang sama (di data, keempat soal sama-sama benar di pilihan B).
  const opsiPerSoal = useMemo(
    () =>
      soal.map((s) => {
        const urutan = acak([0, 1, 2])
        return { urutan, jawabanBaru: urutan.indexOf(s.jawaban) }
      }),
    [soal, ronde],
  )
  const pertanyaan = soal[qIndex] ?? null
  const opsi = pertanyaan ? opsiPerSoal[qIndex] : null

  const selesai = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(nilai)
  }

  const jawab = (indexTampil: number) => {
    if (!pertanyaan || !opsi || umpan) return
    const isBenar = indexTampil === opsi.jawabanBaru
    setDipilih(indexTampil)
    if (isBenar) {
      setSkor((s) => s + 25)
      setBenarCount((c) => c + 1)
      benar()
      setUmpan({ benar: true, teks: pertanyaan.penjelasan })
    } else {
      const sisa = nyawaSisa - 1
      setNyawaSisa(sisa)
      if (sisa <= 0) setHabis(true)
      salah()
      nyawa()
      setUmpan({ benar: false, teks: pertanyaan.penjelasan })
    }
  }

  const lanjut = () => {
    playPop()
    if (habis) {
      setFase('gagal')
      setGagalCount((g) => g + 1)
      return
    }
    if (qIndex + 1 >= soal.length) {
      setFase('selesai')
      koin()
      return
    }
    setQIndex((q) => q + 1)
    setDipilih(null)
    setUmpan(null)
  }

  const cobaLagi = (pakaiMudah: boolean) => {
    playPop()
    setMudah(pakaiMudah)
    setRonde((r) => r + 1)
    setQIndex(0)
    setSkor(0)
    setBenarCount(0)
    setNyawaSisa(pakaiMudah ? NYAWA_MUDAH : NYAWA_AWAL)
    setHabis(false)
    setDipilih(null)
    setUmpan(null)
    setFase('main')
  }

  if (!pertanyaan || !opsi) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Soal tahap ini belum tersedia.</p>
      </div>
    )
  }

  return (
    <div className="aia-stack">
      {fase === 'main' && (
        <>
          <div className="aia-card">
            <span className="aia-kicker">
              Bank Sampah · {tahap.judul} · Soal {qIndex + 1} dari {soal.length}
            </span>
            <p className="aia-muted" style={{ margin: '8px 0 0' }}>
              {tahap.instruksi}
            </p>
            <div className="aia-stats" style={{ marginTop: 12 }}>
              <span className="aia-stat">
                <Coins aria-hidden="true" /> {skor} Koin Hijau
              </span>
              <span className="aia-stat">
                <BarisNyawa nyawaSisa={nyawaSisa} total={totalNyawa} /> {nyawaSisa} nyawa
              </span>
            </div>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {pertanyaan.pertanyaan}
            </p>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {opsi.urutan.map((asli, i) => {
                const pilihan = pertanyaan.pilihan[asli] ?? ''
                const isJawaban = i === opsi.jawabanBaru
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
                    {umpan && isJawaban && <Check aria-hidden="true" color="#236b4d" />}
                    {umpan && isDipilih && !isJawaban && <X aria-hidden="true" color="#b83232" />}
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
                  background: umpan.benar ? '#dcfce7' : '#fee2e2',
                }}
              >
                <strong>{umpan.benar ? 'Benar!' : 'Belum tepat.'}</strong> {umpan.teks}
              </div>
            )}

            {umpan && (
              <button
                type="button"
                className="aia-btn aia-btn-primary aia-btn-block"
                style={{ marginTop: 12 }}
                onClick={lanjut}
              >
                {habis ? 'Lihat hasil' : qIndex + 1 >= soal.length ? 'Lihat hasil' : 'Soal berikutnya'}
              </button>
            )}
          </div>
        </>
      )}

      {fase === 'selesai' && (
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }} aria-labelledby="aia-bs3-selesai-title">
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 id="aia-bs3-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu menjawab {benarCount} dari {soal.length} soal hitung tabungan dengan benar.
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
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-bs3-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: '#b83232' }} />
          <h3 id="aia-bs3-gagal-title" className="aia-section-title">
            Nyawa habis
          </h3>
          <p className="aia-muted">
            Nyawamu sudah habis. Coba lagi dari awal tahap ini — urutan pilihannya diacak ulang.
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
 * Mini-game Misi Kader "Bank Sampah dan Daur Ulang".
 * Menerima props bentuk TugasMiniGameSlotProps; tahap dipilih dari
 * KONTEN_TUGAS[tugasId].tahapan[stageIndex] sesuai jenisnya.
 * modeSatuKetukan = true menampilkan versi tombol lama.
 * TIDAK disambungkan ke mana pun di sini — agen integrasi yang menyambung.
 */
export function BankSampah({ tugasId, stageIndex, onStageComplete, modeSatuKetukan = false }: TugasMiniGameSlotProps) {
  const konten = KONTEN_TUGAS[tugasId]
  const tahap = konten?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  if (!tahap || !spec) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }
  const kunci = `${tugasId}-${stageIndex}`
  if (modeSatuKetukan) {
    if (tahap.jenis === 'pilah') return <PilahAnorganik key={kunci} tahap={tahap} onStageComplete={onStageComplete} />
    if (tahap.jenis === 'catat') return <CatatTimbangan key={kunci} tahap={tahap} onStageComplete={onStageComplete} />
    if (tahap.jenis === 'kuis') return <KuisTabungan key={kunci} tahap={tahap} onStageComplete={onStageComplete} />
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }
  if (tahap.jenis === 'pilah') return <PilahGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} />
  if (tahap.jenis === 'catat') return <CatatGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} />
  if (tahap.jenis === 'kuis') return <KuisGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} />
  return (
    <div className="aia-card">
      <p className="aia-muted">Tahap ini belum tersedia.</p>
    </div>
  )
}
