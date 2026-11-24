'use client'

// Mini-game Misi Kader "Jejaring Hijau" (Pak Jaka) — VERSI GESTUR.
// Tiap tahap: seret pendekatan yang paling tepat ke meja/papan mitra
// sesuai INTERAKSI_MISI. Bukan tombol pilihan.
// Mode satu-ketukan (prop modeSatuKetukan) menampilkan versi tombol lama
// sebagai alternatif aksesibilitas. Skor 0–100 per tahap; onStageComplete
// dipanggil TEPAT SATU KALI.
//
// Catatan: DragDrop di pustaka hanya menerima satu benda, sedangkan tahap
// ini butuh 3 kartu opsi yang bisa diseret — jadi drag multi-kartu
// diimplementasikan di sini mengikuti pola Pointer Events pilah-sampah
// (hit-test geometris via getBoundingClientRect target).

import { useRef, useState } from 'react'
import { Check, Handshake, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { ambil, benar, getar, klik, koin, lepas, salah } from '../suara'
import { EfekBenar, EfekSalah, TanganPenunjuk } from '../interaksi'

export interface MiniGameTugasSlotProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  /** Bila true, tampilkan versi tombol lama (alternatif aksesibilitas). */
  modeSatuKetukan?: boolean
}

const MAKS_PERCOBAAN = 2

/** Bersihkan awalan 'Magi: "..."' agar tidak dobel dengan label Magi. */
function bersihkanPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '').trim()
}

export function JejaringHijau({
  tugasId,
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
}: MiniGameTugasSlotProps) {
  if (modeSatuKetukan) {
    return <JejaringHijauTombol tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} />
  }
  return <JejaringHijauGestur tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} />
}

// ---------------------------------------------------------------------------
// Mode gestur: seret kartu pendekatan ke meja/papan mitra
// ---------------------------------------------------------------------------

function JejaringHijauGestur({ tugasId, stageIndex, onStageComplete }: MiniGameTugasSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId]?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [diAtasTarget, setDiAtasTarget] = useState(false)
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [percobaan, setPercobaan] = useState(0)
  const [salahIndeks, setSalahIndeks] = useState<number[]>([])
  const [salahTerakhir, setSalahTerakhir] = useState<{ index: number; alasan: string } | null>(null)
  const [selesai, setSelesai] = useState(false)
  const [berhasil, setBerhasil] = useState(false)
  const [skor, setSkor] = useState(0)

  const selesaiRef = useRef(false)
  const dragRef = useRef<{ x0: number; y0: number; bergerak: boolean; id: number } | null>(null)
  const tekanRef = useRef(false)
  const targetRef = useRef<HTMLButtonElement | null>(null)

  if (!tahap || tahap.jenis !== 'pilih') {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  const jawabanBenar = tahap.pilihan.findIndex((p) => p.benar)
  const opsiBenar = jawabanBenar >= 0 ? tahap.pilihan[jawabanBenar] : undefined
  const targetLabel = spec?.target ?? 'Target'
  const tutorial = spec?.tutorial ?? stageIndex === 0
  const petunjuk = spec ? bersihkanPetunjuk(spec.petunjukMagi) : undefined
  // Kesulitan adaptif: setelah 1 kali gagal, zona target membesar.
  const perbesar = percobaan >= 1

  /** Apakah titik layar berada di dalam zona target (dengan toleransi). */
  const cekDiTarget = (clientX: number, clientY: number): boolean => {
    const el = targetRef.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    const pad = perbesar ? 28 : 12
    return clientX >= r.left - pad && clientX <= r.right + pad && clientY >= r.top - pad && clientY <= r.bottom + pad
  }

  const resolve = (i: number) => {
    if (selesai || salahIndeks.includes(i)) return
    const opsi = tahap.pilihan[i]
    if (!opsi) return
    setDipilih(null)
    if (opsi.benar) {
      benar()
      koin()
      setSkor(percobaan === 0 ? 100 : 50)
      setBerhasil(true)
      setSelesai(true)
    } else {
      salah()
      getar([40, 40, 40])
      const p = percobaan + 1
      setPercobaan(p)
      setSalahIndeks((daftar) => [...daftar, i])
      setSalahTerakhir({ index: i, alasan: opsi.alasan })
      if (p >= MAKS_PERCOBAAN) {
        setSkor(0)
        setBerhasil(false)
        setSelesai(true)
      }
    }
  }

  const onPointerDownKartu = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    if (selesai || salahIndeks.includes(i)) return
    ambil()
    dragRef.current = { x0: e.clientX, y0: e.clientY, bergerak: false, id: i }
    setDragId(i)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerMoveKartu = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    const d = dragRef.current
    if (!d || d.id !== i) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (Math.abs(dx) + Math.abs(dy) > 10) d.bergerak = true
    setDragPos({ x: dx, y: dy })
    setDiAtasTarget(cekDiTarget(e.clientX, e.clientY))
  }

  const onPointerUpKartu = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    const d = dragRef.current
    dragRef.current = null
    setDragId(null)
    setDragPos(null)
    setDiAtasTarget(false)
    if (!d || d.id !== i) return
    if (d.bergerak) {
      tekanRef.current = true
      if (cekDiTarget(e.clientX, e.clientY)) {
        lepas()
        resolve(i)
      } else {
        lepas()
      }
    }
  }

  const onPointerCancelKartu = () => {
    dragRef.current = null
    setDragId(null)
    setDragPos(null)
    setDiAtasTarget(false)
  }

  const onClickKartu = (i: number) => {
    if (tekanRef.current) {
      tekanRef.current = false
      return
    }
    if (selesai || salahIndeks.includes(i)) return
    klik()
    setDipilih((v) => (v === i ? null : i))
  }

  const lanjutkan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(skor)
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Misi Kader · Jejaring Hijau · Tahap {stageIndex + 1} dari 3</span>
        <h3 className="aia-section-title" style={{ marginTop: 4 }}>
          {tahap.judul}
        </h3>
        <p className="aia-muted" style={{ marginBottom: 0 }}>
          {tahap.instruksi}
        </p>
        {!selesai && (
          <p className="aia-muted" style={{ margin: '8px 0 0' }}>
            Kesempatan tersisa: {MAKS_PERCOBAAN - percobaan}
          </p>
        )}
      </div>

      <div className="aia-dialog" aria-label="Skenario mitra">
        <strong>
          <Handshake aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: -3 }} /> Skenario mitra
        </strong>
        <p>{tahap.brief}</p>
        {tutorial && spec?.langkah && (
          <p className="aia-muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            Langkah: {spec.langkah.map((l, i) => `${i + 1}. ${l}`).join(' → ')}
          </p>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <EfekBenar tampil={selesai && berhasil} />

        <div style={{ display: 'grid', gap: 10 }}>
          {tahap.pilihan.map((opsi, i) => {
            const isJawaban = i === jawabanBenar
            const isSalah = salahIndeks.includes(i)
            const sedangDisere = dragId === i
            let latar: string | undefined
            let border: string | undefined
            if (selesai && isJawaban) {
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
                disabled={selesai || isSalah}
                onPointerDown={(e) => onPointerDownKartu(e, i)}
                onPointerMove={(e) => onPointerMoveKartu(e, i)}
                onPointerUp={(e) => onPointerUpKartu(e, i)}
                onPointerCancel={onPointerCancelKartu}
                onClick={() => onClickKartu(i)}
                aria-pressed={dipilih === i}
                aria-label={`Pendekatan ${String.fromCharCode(65 + i)}: ${opsi.teks}. Seret ke target, atau ketuk untuk memilih.`}
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  minHeight: 64,
                  background: latar,
                  border,
                  whiteSpace: 'normal',
                  height: 'auto',
                  padding: '12px 16px',
                  cursor: selesai || isSalah ? 'default' : 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  transform:
                    sedangDisere && dragPos
                      ? `translate(${dragPos.x}px, ${dragPos.y}px) rotate(${dragPos.x * 0.04}deg)`
                      : undefined,
                  outline: dipilih === i ? '3px solid var(--green, #2f7d4f)' : undefined,
                  outlineOffset: 2,
                  opacity: isSalah ? 0.55 : 1,
                  position: 'relative',
                  zIndex: sedangDisere ? 10 : undefined,
                }}
              >
                <span aria-hidden="true" style={{ fontWeight: 800 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                <span>{opsi.teks}</span>
                {selesai && isJawaban && <Check aria-hidden="true" color="#236b4d" />}
                {isSalah && <X aria-hidden="true" color="#b83232" />}
                <small
                  className="aia-muted"
                  style={{ display: 'block', width: '100%', fontSize: 12, marginTop: 4 }}
                >
                  {sedangDisere
                    ? 'Sedang diseret…'
                    : dipilih === i
                      ? 'Sudah dipilih — ketuk targetnya'
                      : isSalah
                        ? 'Sudah dicoba'
                        : 'Seret ke target, atau ketuk untuk memilih'}
                </small>
              </button>
            )
          })}
        </div>

        {tutorial && !selesai && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <TanganPenunjuk label="Seret pendekatan terbaik ke sini" />
          </div>
        )}

        <button
          type="button"
          ref={targetRef}
          data-aia-target
          disabled={selesai}
          onClick={() => {
            if (dipilih !== null) resolve(dipilih)
          }}
          aria-label={`Target: ${targetLabel}${dipilih !== null ? '. Ketuk untuk menaruh kartu yang dipilih.' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: '100%',
            minHeight: perbesar ? 170 : 120,
            marginTop: 12,
            padding: perbesar ? '20px 12px' : '14px 12px',
            border: `2px dashed ${diAtasTarget ? '#236b4d' : '#9ca3af'}`,
            borderRadius: 14,
            background: diAtasTarget ? '#dcfce7' : dipilih !== null ? '#f0fdf4' : '#fafafa',
            color: 'var(--foreground, #111)',
            fontSize: 15,
            fontWeight: 700,
            cursor: selesai ? 'default' : 'pointer',
            transform: diAtasTarget ? 'scale(1.02)' : undefined,
          }}
        >
          <Handshake aria-hidden="true" style={{ width: 28, height: 28, color: '#2f7d4f' }} />
          {targetLabel}
          <small style={{ fontWeight: 400, color: 'var(--ink-soft, #6b7280)' }}>
            {selesai && berhasil && opsiBenar
              ? `✓ ${opsiBenar.teks}`
              : dipilih !== null
                ? 'Ketuk untuk menaruh kartu yang dipilih'
                : 'Seret kartu ke sini'}
          </small>
        </button>
      </div>

      {salahTerakhir && !selesai && (
        <div>
          <EfekSalah tampil petunjuk={petunjuk} />
          <p className="aia-muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            Kenapa salah: {salahTerakhir.alasan}
          </p>
        </div>
      )}

      {selesai && berhasil && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 12,
            background: '#dcfce7',
          }}
        >
          <strong>Benar!</strong> {spec?.hasilBenar ?? ''} {opsiBenar?.alasan ?? ''}
        </div>
      )}

      {selesai && !berhasil && opsiBenar && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 12,
            background: '#fee2e2',
          }}
        >
          <strong>Belum berhasil.</strong> Pendekatan yang tepat:{' '}
          <strong>{opsiBenar.teks}</strong> — {opsiBenar.alasan}
        </div>
      )}

      {selesai && (
        <div className="aia-card" style={{ textAlign: 'center' }}>
          <p className="aia-muted" style={{ marginTop: 0 }}>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={lanjutkan}>
              <Check aria-hidden="true" /> Lanjutkan · +{skor} poin
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mode satu-ketukan: versi tombol lama (alternatif aksesibilitas)
// ---------------------------------------------------------------------------

function JejaringHijauTombol({ tugasId, stageIndex, onStageComplete }: MiniGameTugasSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId]?.tahapan[stageIndex]
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [percobaan, setPercobaan] = useState(0)
  const [salahPilihan, setSalahPilihan] = useState<number[]>([])
  const [selesai, setSelesai] = useState(false)
  const [skor, setSkor] = useState(0)

  const selesaiRef = useRef(false)

  if (!tahap || tahap.jenis !== 'pilih') {
    return (
      <div className="aia-card">
        <p className="aia-muted">Tahap ini belum tersedia.</p>
      </div>
    )
  }

  const jawabanBenar = tahap.pilihan.findIndex((p) => p.benar)
  const opsiBenar = jawabanBenar >= 0 ? tahap.pilihan[jawabanBenar] : undefined
  const opsiDipilih = dipilih !== null ? tahap.pilihan[dipilih] : undefined
  const berhasil = selesai && skor > 0

  const pilih = (index: number) => {
    if (selesai || salahPilihan.includes(index)) return
    const opsi = tahap.pilihan[index]
    if (!opsi) return
    setDipilih(index)
    if (opsi.benar) {
      benar()
      koin()
      setSkor(percobaan === 0 ? 100 : 50)
      setSelesai(true)
    } else {
      salah()
      getar([40, 40, 40])
      const percobaanBaru = percobaan + 1
      setPercobaan(percobaanBaru)
      setSalahPilihan((daftar) => [...daftar, index])
      if (percobaanBaru >= MAKS_PERCOBAAN) {
        setSkor(0)
        setSelesai(true)
      }
    }
  }

  const lanjutkan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(skor)
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Misi Kader · Jejaring Hijau · Tahap {stageIndex + 1} dari 3</span>
        <h3 className="aia-section-title" style={{ marginTop: 4 }}>
          {tahap.judul}
        </h3>
        <p className="aia-muted" style={{ marginBottom: 0 }}>
          {tahap.instruksi}
        </p>
        {!selesai && (
          <p className="aia-muted" style={{ margin: '8px 0 0' }}>
            Kesempatan tersisa: {MAKS_PERCOBAAN - percobaan}
          </p>
        )}
      </div>

      <div className="aia-dialog" aria-label="Skenario mitra">
        <strong>
          <Handshake aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: -3 }} /> Skenario mitra
        </strong>
        <p>{tahap.brief}</p>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {tahap.pilihan.map((opsi, i) => {
          const isJawaban = i === jawabanBenar
          const isSalah = salahPilihan.includes(i)
          let latar: string | undefined
          let border: string | undefined
          if (selesai && isJawaban) {
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
              disabled={selesai || isSalah}
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
              {selesai && isJawaban && <Check aria-hidden="true" color="#236b4d" />}
              {isSalah && <X aria-hidden="true" color="#b83232" />}
            </button>
          )
        })}
      </div>

      {dipilih !== null && opsiDipilih && !berhasil && !selesai && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 12,
            background: '#fee2e2',
          }}
        >
          <strong>Belum tepat.</strong> {opsiDipilih.alasan} Coba sekali lagi — masih ada{' '}
          {MAKS_PERCOBAAN - percobaan} kesempatan.
        </div>
      )}

      {selesai && berhasil && opsiBenar && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 12,
            background: '#dcfce7',
          }}
        >
          <strong>Benar!</strong> {opsiBenar.alasan}
        </div>
      )}

      {selesai && !berhasil && opsiBenar && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 12,
            background: '#fee2e2',
          }}
        >
          <strong>Belum berhasil.</strong> {opsiDipilih?.alasan ?? ''} Pendekatan yang tepat:{' '}
          <strong>{opsiBenar.teks}</strong> — {opsiBenar.alasan}
        </div>
      )}

      {selesai && (
        <div className="aia-card" style={{ textAlign: 'center' }}>
          <p className="aia-muted" style={{ marginTop: 0 }}>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={lanjutkan}>
              <Check aria-hidden="true" /> Lanjutkan · +{skor} poin
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
