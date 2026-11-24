'use client'

// Mini-game Misi Kader "Edu-Lingkungan" — Kak Lala. Versi gestur.
// Kuis mengajar: 4 soal per tahap dari KONTEN_TUGAS[tugasId].
// Tiap soal: seret kartu jawaban ke kotak jawaban (bukan tombol pilihan).
// Gestur mengikuti INTERAKSI_MISI['edu-lingkungan'].
// Skor tiap tahap 0–100 (25 per soal bila benar di percobaan pertama,
// 10 bila butuh percobaan ulang). onStageComplete dipanggil tepat satu kali.
// Prop modeSatuKetukan menampilkan versi tombol lama (logika tombol yang
// sudah ada di file ini) sebagai alternatif aksesibilitas.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, GraduationCap, Sparkles, X } from 'lucide-react'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { SpesifikasiInteraksi } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TahapTugas } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { EfekBenar, EfekSalah, TanganPenunjuk, useKurangiAnimasi } from '../interaksi'
import { ambil, benar, getar, klik, koin, lepas, playPop, plop, salah } from '../suara'

/** Props mini-game Misi Kader (bentuk sama seperti MiniGameSlotProps, dengan tugasId). */
export interface TugasMiniGameProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  /** Bila true, tampilkan versi tombol lama (mode alternatif satu-ketukan). */
  modeSatuKetukan?: boolean
}

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

// ------------------------------------------------------ Kuis (gestur) ----

function EduLingkunganGestur({
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
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Sparkles aria-hidden="true" /> Tahap selesai!
          </h3>
          <p>
            Kamu menjawab {benarCount} dari {soal.length} soal dengan benar — seperti mengajar teman di kelas.
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesaikan(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
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
          Kader Edu-Lingkungan · Soal {qIndex + 1} dari {soal.length}
        </span>
        <h3 className="aia-section-title" style={{ marginTop: 4 }}>
          <GraduationCap aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tahap.judul}
        </h3>
        <p className="aia-muted" style={{ marginBottom: 0 }}>
          {tahap.instruksi}
        </p>
        <div className="aia-stats" style={{ marginTop: 12 }}>
          <span className="aia-stat">Skor: {skor}</span>
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
        targetLabel="Kotak jawaban temanmu"
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

// ------------------------------------------------------ Kuis (tombol) ----
// Versi tombol lama — dipakai sebagai mode alternatif satu-ketukan.

function EduLingkunganTombol({ tugasId, stageIndex, onStageComplete }: TugasMiniGameProps) {
  const tahap = KONTEN_TUGAS[tugasId].tahapan[stageIndex]
  const soal = useMemo(() => (tahap.jenis === 'kuis' ? tahap.soal : []), [tahap])
  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [qIndex, setQIndex] = useState(0)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [dijawab, setDijawab] = useState(false)
  const [benarCount, setBenarCount] = useState(0)

  const selesaiRef = useRef(false)
  const pertanyaan = soal[qIndex]
  const skor = benarCount * 25

  const selesai = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(skor)
  }

  if (!tahap || tahap.jenis !== 'kuis' || !pertanyaan) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Soal tahap ini belum tersedia.</p>
      </div>
    )
  }

  const jawab = (index: number) => {
    if (dijawab || fase !== 'main') return
    const isBenar = index === pertanyaan.jawaban
    setDipilih(index)
    setDijawab(true)
    if (isBenar) {
      setBenarCount((c) => c + 1)
      benar()
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
              Kader Edu-Lingkungan · Soal {qIndex + 1} dari {soal.length}
            </span>
            <h3 className="aia-section-title" style={{ marginTop: 4 }}>
              <GraduationCap aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tahap.judul}
            </h3>
            <p className="aia-muted" style={{ marginBottom: 0 }}>
              {tahap.instruksi}
            </p>
          </div>

          <div className="aia-card">
            <p style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              {pertanyaan.pertanyaan}
            </p>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
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
            <Sparkles aria-hidden="true" /> Tahap selesai!
          </h3>
          <p>
            Kamu menjawab {benarCount} dari {soal.length} soal dengan benar — seperti mengajar teman di kelas.
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

// ------------------------------------------------------------- Ekspor utama ----

/**
 * Mini-game Misi Kader "Edu-Lingkungan" — Kak Lala.
 * Menerima props bentuk TugasMiniGameProps; tahap dipilih dari
 * KONTEN_TUGAS[tugasId].tahapan[stageIndex] (ketiga tahap berjenis kuis).
 * modeSatuKetukan = true menampilkan versi tombol lama.
 * TIDAK disambungkan ke mana pun di sini — agen integrasi yang menyambung.
 */
export function EduLingkungan({ tugasId, stageIndex, onStageComplete, modeSatuKetukan = false }: TugasMiniGameProps) {
  const konten = KONTEN_TUGAS[tugasId]
  const tahap = konten?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  if (!tahap || tahap.jenis !== 'kuis' || !spec) {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }
  const kunci = `${tugasId}-${stageIndex}`
  if (modeSatuKetukan) {
    return <EduLingkunganTombol key={kunci} tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} />
  }
  return <EduLingkunganGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} />
}
