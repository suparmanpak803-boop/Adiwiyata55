'use client'

// Mini-game Misi Kader "Eco-Communication" (Kak Naya) — VERSI GESTUR.
// Tiap tahap: susun storyboard 3 frame ke urutan yang benar dengan mengetuk
// kartu sesuai urutan ceritanya (komponen SusunCerita), bukan seret kartu.
// Frame dibuat dari brief + teks konsep yang benar di KONTEN_TUGAS
// (hook → contoh → ajakan); tidak ada isi baru yang dikarang.
// B-16: dua konsep salah dari data yang sama ikut tampil sebagai kartu
// pengecoh (prop `pengecoh` SusunCerita) — pemain harus menyingkirkannya,
// jadi keputusan "pilih" tetap diuji di mode gestur.
// Mode satu-ketukan (prop modeSatuKetukan) menampilkan versi tombol lama
// sebagai alternatif aksesibilitas. Skor 0–100 per tahap; onStageComplete
// dipanggil TEPAT SATU KALI.
//
// Satu jalan SusunCerita = satu percobaan: selesai tanpa ketukan salah
// (skor internal 100) = berhasil (100 di percobaan pertama, 50 di kedua);
// bila ada ketukan salah, percobaan itu gagal dan bisa diulang sekali.
// Dua kali gagal = skor 0 dan urutan benar diungkap.

import { useMemo, useRef, useState } from 'react'
import { Check, Megaphone, RotateCcw, X } from 'lucide-react'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TahapTugas } from '@/lib/apa-itu-adiwiyata/content/tugas'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, getar, klik, koin, salah } from '../suara'
import { EfekSalah, SusunCerita, TanganPenunjuk, type FrameCerita } from '../interaksi'
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

/** Bersihkan awalan 'Magi: "..."' agar tidak dobel dengan label Magi. */
function bersihkanPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '').trim()
}

function kapital(teks: string): string {
  return teks.length > 0 ? teks.charAt(0).toUpperCase() + teks.slice(1) : teks
}

/** Brief tanpa awalan "Buat " dan titik akhir, untuk dipakai sebagai frame hook. */
function bersihBrief(brief: string): string {
  return kapital(brief.replace(/^Buat /, '').replace(/\.$/, '').trim())
}

/**
 * Susun 3 frame storyboard dari brief + teks konsep yang benar.
 * Tiap tahap memecah teks konsep benar menjadi ketukan cerita
 * (hook dari brief, lalu 2 ketukan dari teks konsep itu sendiri).
 * Bila pola teks data berubah, cadangan: storyboard 2 frame.
 */
function buatFrame(tahap: Extract<TahapTugas, { jenis: 'pilih' }>, stageIndex: number): FrameCerita[] {
  const benar = tahap.pilihan.find((p) => p.benar)
  if (!benar) return []
  const hook = bersihBrief(tahap.brief)
  const teks = benar.teks
  if (stageIndex === 0) {
    // 'Video: siswa bawa tumbler dan tas kain, diakhiri ajakan "Coba ...".'
    const m = teks.match(/^Video: (.+), diakhiri ajakan (.+?)\.?$/)
    if (m) {
      return [
        { id: 'f1', teks: `Hook: ${hook}` },
        { id: 'f2', teks: `Contoh: ${kapital(m[1])}` },
        { id: 'f3', teks: `Ajakan: ${m[2]}` },
      ]
    }
  }
  if (stageIndex === 1) {
    // 'Infografis: "3 Hal yang Sering Lupa Dimatikan" dengan ikon lampu, ... .'
    const m = teks.match(/^Infografis: ("[^"]+") dengan ikon (.+?)\.?$/)
    if (m) {
      return [
        { id: 'f1', teks: `Hook: ${hook}` },
        { id: 'f2', teks: `Judul: ${m[1]}` },
        { id: 'f3', teks: `Isi: Ikon ${m[2]}` },
      ]
    }
  }
  if (stageIndex === 2) {
    // 'Seri postingan "Pilah 10 Detik": tiap hari satu jenis sampah dan tongnya.'
    const m = teks.match(/^(.+?): (.+?)\.?$/)
    if (m) {
      return [
        { id: 'f1', teks: `Hook: ${hook}` },
        { id: 'f2', teks: `Konsep: ${m[1]}` },
        { id: 'f3', teks: `Rutinitas: ${kapital(m[2])}` },
      ]
    }
  }
  return [
    { id: 'f1', teks: `Hook: ${hook}` },
    { id: 'f2', teks: `Konsep: ${teks}` },
  ]
}

export function EcoCommunication({
  tugasId,
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
  terjeda = false,
}: MiniGameTugasSlotProps) {
  if (modeSatuKetukan) {
    return <EcoCommunicationTombol tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} />
  }
  return <EcoCommunicationGestur tugasId={tugasId} stageIndex={stageIndex} onStageComplete={onStageComplete} terjeda={terjeda} />
}

// ---------------------------------------------------------------------------
// Mode gestur: susun storyboard (SusunCerita)
// ---------------------------------------------------------------------------

function EcoCommunicationGestur({ tugasId, stageIndex, onStageComplete, terjeda = false }: MiniGameTugasSlotProps) {
  const tahap = KONTEN_TUGAS[tugasId]?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  const frame = useMemo(() => {
    if (!tahap || tahap.jenis !== 'pilih') return []
    return buatFrame(tahap, stageIndex)
  }, [tahap, stageIndex])
  // B-16: kartu pengecoh dari konsep salah yang sudah ada di data tahap —
  // mengetuknya di SusunCerita dihitung salah (id pengecoh tidak pernah
  // sama dengan frame benar berikutnya).
  const pengecoh = useMemo<FrameCerita[]>(() => {
    if (!tahap || tahap.jenis !== 'pilih') return []
    return tahap.pilihan
      .filter((p) => !p.benar)
      .map((p, i) => ({ id: `pengecoh-${i}`, teks: p.teks }))
  }, [tahap])
  const [percobaan, setPercobaan] = useState(0)
  const [kunciUlang, setKunciUlang] = useState(0)
  const [gagal, setGagal] = useState(false)
  const [selesai, setSelesai] = useState(false)
  const [berhasil, setBerhasil] = useState(false)
  const [skor, setSkor] = useState(0)

  const selesaiRef = useRef(false)

  if (!tahap || tahap.jenis !== 'pilih' || frame.length === 0) {
    return (
      <TahapTidakTersedia onLewati={() => onStageComplete(0)} />
    )
  }

  const jawabanBenar = tahap.pilihan.findIndex((p) => p.benar)
  const opsiBenar = jawabanBenar >= 0 ? tahap.pilihan[jawabanBenar] : undefined
  const opsiSalah = tahap.pilihan.filter((p) => !p.benar)
  const tutorial = spec?.tutorial ?? stageIndex === 0
  const petunjuk = spec ? bersihkanPetunjuk(spec.petunjukMagi) : undefined

  /** Satu jalan SusunCerita selesai: 100 = tanpa ketukan salah. */
  const susunSelesai = (skorInternal: number) => {
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
        <span className="aia-kicker">Misi Tambahan · Eco-Communication · Tahap {stageIndex + 1} dari 3</span>
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

      <div className="aia-dialog" aria-label="Brief konten">
        <strong>
          <Megaphone aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: -3 }} /> Brief konten
        </strong>
        <p>{tahap.brief}</p>
      </div>

      {tutorial && !selesai && !gagal && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Ketuk frame sesuai urutan ceritanya" />
        </div>
      )}

      {!gagal && (
        <SusunCerita key={kunciUlang} frame={frame} pengecoh={pengecoh} onSelesai={susunSelesai} terjeda={terjeda} />
      )}

      {gagal && !selesai && (
        <div>
          <EfekSalah tampil petunjuk={petunjuk} />
          <div style={{ marginTop: 8 }}>
            <p className="aia-muted" style={{ fontSize: 13, margin: '0 0 4px' }}>
              Kenapa konsep lain kurang tepat:
            </p>
            <ul className="aia-muted" style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
              {opsiSalah.map((o) => (
                <li key={o.teks}>
                  {o.teks} — {o.alasan}
                </li>
              ))}
            </ul>
          </div>
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
          <strong>Belum berhasil.</strong> Urutan storyboard yang benar:
          <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
            {frame.map((f) => (
              <li key={f.id}>{f.teks}</li>
            ))}
          </ol>
          Pilihan yang tepat: <strong>{opsiBenar.teks}</strong> — {opsiBenar.alasan}
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

function EcoCommunicationTombol({ tugasId, stageIndex, onStageComplete }: MiniGameTugasSlotProps) {
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
        <span className="aia-kicker">Misi Tambahan · Eco-Communication · Tahap {stageIndex + 1} dari 3</span>
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

      <div className="aia-dialog" aria-label="Brief konten">
        <strong>
          <Megaphone aria-hidden="true" style={{ width: 18, height: 18, verticalAlign: -3 }} /> Brief konten
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
            border = '2px solid #236b4d'
          } else if (isSalah) {
            kelasUmpan = 'aia-umpan-salah'
            border = '2px solid #b83232'
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
          <strong>Belum berhasil.</strong> {opsiDipilih?.alasan ?? ''} Pilihan yang tepat:{' '}
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
