'use client'

// Mini-game Misi Kader "Jejaring Hijau" (Pak Jaka) — VERSI GESTUR.
// Tiap tahap: pesan mitra masuk seperti chat, pemain mengetuk balasan
// terbaik sebelum waktu habis (komponen BalasCepat), bukan seret kartu.
// Pesan diambil dari brief tahap itu; 3 balasan = 3 pilihan pendekatan
// dari KONTEN_TUGAS (teks + benar + alasan).
// Mode satu-ketukan (prop modeSatuKetukan) menampilkan versi tombol lama
// sebagai alternatif aksesibilitas. Skor 0–100 per tahap; onStageComplete
// dipanggil TEPAT SATU KALI.
//
// Satu jalan BalasCepat (1 pesan) = satu percobaan: balasan benar
// (skor internal 100) = berhasil (100 di percobaan pertama, 50 di kedua);
// balasan salah atau waktu habis = percobaan gagal, bisa diulang sekali.
// Dua kali gagal = skor 0 dan balasan benar diungkap.

import { useMemo, useRef, useState } from 'react'
import { Check, Handshake, RotateCcw, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, getar, klik, koin, salah } from '../suara'
import { BalasCepat, EfekBenar, PetunjukMagi, TanganPenunjuk, type PesanChat } from '../interaksi'
import { TahapTidakTersedia } from '../tahap-tidak-tersedia'

export interface MiniGameTugasSlotProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  /** Bila true, tampilkan versi tombol lama (alternatif aksesibilitas). */
  modeSatuKetukan?: boolean
  /** Bila true, permainan dijeda (timer dibekukan oleh komponen pustaka). */
  terjeda?: boolean
}

const MAKS_PERCOBAAN = 2
const WAKTU_PER_PESAN_MS = 15000

/** Pengirim pesan mitra tiap tahap, mengikuti brief (DLH → pelaku usaha → komunitas). */
const PENGIRIM_MITRA = ['DLH', 'Pelaku Usaha', 'Komunitas Daur Ulang']

/** Bersihkan awalan 'Magi: "..."' agar tidak dobel dengan label Magi. */
function bersihkanPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '').trim()
}

export function JejaringHijau({
  tugasId,
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
  terjeda = false,
}: MiniGameTugasSlotProps) {
  if (modeSatuKetukan) {
    return <JejaringHijauTombol tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} />
  }
  return <JejaringHijauGestur tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} terjeda={terjeda} />
}

// ---------------------------------------------------------------------------
// Mode gestur: balas pesan mitra sebelum waktu habis (BalasCepat)
// ---------------------------------------------------------------------------

function JejaringHijauGestur({ tugasId, stageIndex, onStageComplete, terjeda = false }: MiniGameTugasSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId]?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  const pesan = useMemo((): PesanChat[] => {
    if (!tahap || tahap.jenis !== 'pilih') return []
    return [
      {
        id: `pesan-${stageIndex}`,
        pengirim: PENGIRIM_MITRA[stageIndex] ?? 'Mitra',
        teks: tahap.brief,
        balasan: tahap.pilihan.map((p) => ({ teks: p.teks, benar: p.benar, alasan: p.alasan })),
      },
    ]
  }, [tahap, stageIndex])
  const [percobaan, setPercobaan] = useState(0)
  const [kunciUlang, setKunciUlang] = useState(0)
  const [gagal, setGagal] = useState(false)
  const [selesai, setSelesai] = useState(false)
  const [berhasil, setBerhasil] = useState(false)
  const [skor, setSkor] = useState(0)

  const selesaiRef = useRef(false)

  if (!tahap || tahap.jenis !== 'pilih' || pesan.length === 0) {
    return (
      <TahapTidakTersedia onLewati={() => onStageComplete(0)} />
    )
  }

  const jawabanBenar = tahap.pilihan.findIndex((p) => p.benar)
  const opsiBenar = jawabanBenar >= 0 ? tahap.pilihan[jawabanBenar] : undefined
  const tutorial = spec?.tutorial ?? stageIndex === 0
  const petunjuk = spec ? bersihkanPetunjuk(spec.petunjukMagi) : undefined

  /** Satu jalan BalasCepat selesai: 100 = balasan benar, 0 = salah / waktu habis. */
  const balasSelesai = (skorInternal: number) => {
    if (selesai || gagal) return
    if (skorInternal >= 100) {
      setSkor(percobaan === 0 ? 100 : 50)
      setBerhasil(true)
      setSelesai(true)
    } else {
      const p = percobaan + 1
      setPercobaan(p)
      if (p >= MAKS_PERCOBAAN) {
        setSkor(0)
        setBerhasil(false)
        setSelesai(true)
      } else {
        setGagal(true)
      }
    }
  }

  const cobaLagi = () => {
    klik()
    setGagal(false)
    setKunciUlang((k) => k + 1)
  }

  const lanjutkan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    onStageComplete(skor)
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Misi Tambahan · Jejaring Hijau · Tahap {stageIndex + 1} dari 3</span>
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

      {tutorial && !selesai && !gagal && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Ketuk balasan terbaik sebelum waktu habis" />
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <EfekBenar tampil={selesai && berhasil} />
        <BalasCepat
          key={kunciUlang}
          pesan={pesan}
          waktuPerPesanMs={WAKTU_PER_PESAN_MS}
          onSelesai={balasSelesai}
          terjeda={terjeda}
        />
      </div>

      {gagal && !selesai && (
        <div>
          {petunjuk && <PetunjukMagi teks={petunjuk} />}
          <p className="aia-muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
            Balasan yang kamu pilih kurang tepat — alasannya sudah tampil di atas. Coba sekali lagi.
          </p>
          <div className="aia-actions" style={{ marginTop: 12 }}>
            <button type="button" className="aia-btn aia-btn-primary" style={{ minHeight: 44 }} onClick={cobaLagi}>
              <RotateCcw aria-hidden="true" /> Coba lagi · 1 kesempatan tersisa
            </button>
          </div>
        </div>
      )}

      {selesai && berhasil && (
        <div role="status" className="aia-umpan-benar" style={{ padding: 12, borderRadius: 12 }}>
          <strong>Benar!</strong> {spec?.hasilBenar ?? ''} {opsiBenar?.alasan ?? ''}
        </div>
      )}

      {selesai && !berhasil && opsiBenar && (
        <div role="status" className="aia-umpan-salah" style={{ padding: 12, borderRadius: 12 }}>
          <strong>Belum berhasil.</strong> Balasan yang tepat:{' '}
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
              <Check aria-hidden="true" /> {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skor} Koin Hijau
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
      <TahapTidakTersedia onLewati={() => onStageComplete(0)} />
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
        <span className="aia-kicker">Misi Tambahan · Jejaring Hijau · Tahap {stageIndex + 1} dari 3</span>
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
          let kelasUmpan: string | undefined
          let border: string | undefined
          if (selesai && isJawaban) {
            kelasUmpan = 'aia-umpan-benar'
            border = '2px solid var(--aia-leaf)'
          } else if (isSalah) {
            kelasUmpan = 'aia-umpan-salah'
            border = '2px solid var(--aia-merah)'
          }
          return (
            <button
              key={i}
              type="button"
              className={`aia-btn aia-btn-block${kelasUmpan ? ` ${kelasUmpan}` : ''}`}
              disabled={selesai || isSalah}
              onClick={() => pilih(i)}
              aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${opsi.teks}`}
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
              <span>{opsi.teks}</span>
              {selesai && isJawaban && <Check aria-hidden="true" />}
              {isSalah && <X aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      {dipilih !== null && opsiDipilih && !berhasil && !selesai && (
        <div role="status" className="aia-umpan-salah" style={{ padding: 12, borderRadius: 12 }}>
          <strong>Belum tepat.</strong> {opsiDipilih.alasan} Coba sekali lagi — masih ada{' '}
          {MAKS_PERCOBAAN - percobaan} kesempatan.
        </div>
      )}

      {selesai && berhasil && opsiBenar && (
        <div role="status" className="aia-umpan-benar" style={{ padding: 12, borderRadius: 12 }}>
          <strong>Benar!</strong> {opsiBenar.alasan}
        </div>
      )}

      {selesai && !berhasil && opsiBenar && (
        <div role="status" className="aia-umpan-salah" style={{ padding: 12, borderRadius: 12 }}>
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
              <Check aria-hidden="true" /> {stageIndex === 2 ? 'Ke Pos Hijau' : 'Level Selanjutnya'} · +{skor} Koin Hijau
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
