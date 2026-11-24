'use client'

// Mini-game Misi Kader "Lingkungan Sehat" — versi gestur baru.
// Tahap 1: Cek Toilet. Tahap 2: Cek Drainase. Tahap 3: Cek Taman dan PHBS.
// Tiap tahap: CariPerbedaan — bandingkan panel "seharusnya" dan
// "sebenarnya", ketuk sel yang berbeda di panel kanan, lalu ketuk
// tindakan yang benar dari 3 kartu.
// Gestur mengikuti INTERAKSI_MISI['lingkungan-sehat']; isi dari KONTEN_TUGAS.
// Skor tiap tahap 0–100 (20 per temuan, 10 bila butuh percobaan ulang).
// onStageComplete dipanggil tepat satu kali.
// Prop modeSatuKetukan menampilkan versi tombol lama (logika tombol yang
// sudah ada di file ini) sebagai alternatif aksesibilitas.

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, CloudRain, Coins, Droplets, Heart, RotateCcw, Sprout, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { SpesifikasiInteraksi } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TahapTugas } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { CariPerbedaan, EfekBenar, EfekSalah, TanganPenunjuk } from '../interaksi'
import { benar, getar, koin, nyawa, playPop, salah } from '../suara'

export interface TugasMiniGameSlotProps {
  tugasId: TugasKaderId
  stageIndex: number
  onStageComplete: (score: number) => void
  /** Bila true, tampilkan versi tombol lama (mode alternatif satu-ketukan). */
  modeSatuKetukan?: boolean
  /** True saat misi dijeda dari shell: mini-game membekukan timer/interval/rAF-nya. */
  terjeda?: boolean
}

const NYAWA_AWAL = 3
const NYAWA_MUDAH = 4

type Fase = 'main' | 'gagal' | 'selesai'

type TahapInspeksi = Extract<TahapTugas, { jenis: 'inspeksi' }>

const IKON_TAHAP: LucideIcon[] = [Droplets, CloudRain, Sprout]

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

// ------------------------------------------------- Inspeksi (gestur) ----
// CariPerbedaan: dua panel adegan berdampingan — kiri kondisi seharusnya
// (semua beres), kanan kondisi sebenarnya. Pemain mengetuk sel yang
// berbeda di panel kanan untuk menemukan masalah, lalu mengetuk tindakan
// yang benar dari 3 kartu. +20 percobaan pertama / +10 ulangan per
// temuan; skor maks 100.

/** Nama singkat tiap titik adegan, per tahap (toilet / drainase / taman). */
const LABEL_TITIK: string[][] = [
  ['Keran', 'Sabun', 'Lantai', 'Gayung', 'Tong sampah'],
  ['Selokan', 'Halaman', 'Bak air', 'Daun kering', 'Saluran air'],
  ['Tanaman', 'Bedeng', 'Taman', 'Poster', 'Wastafel'],
]

/** Titik adegan yang sehat (sama di kedua panel), per tahap. */
const TITIK_SEHAT: string[][] = [
  ['Cermin', 'Pintu', 'Jendela'],
  ['Pagar', 'Pohon', 'Jalan'],
  ['Bangku', 'Pot bunga', 'Papan nama'],
]

function InspeksiGestur({
  tahap,
  stageIndex,
  spec,
  onStageComplete,
  terjeda = false,
}: {
  tahap: TahapInspeksi
  stageIndex: number
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
  terjeda?: boolean
}) {
  const [temuanSelesai, setTemuanSelesai] = useState<Set<string>>(new Set())
  const [temuanAktif, setTemuanAktif] = useState<number | null>(null)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [percobaanAktif, setPercobaanAktif] = useState(0)
  const [selesai, setSelesai] = useState(false)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)
  const [efekBenar, setEfekBenar] = useState(false)
  const [pesanSalah, setPesanSalah] = useState<string | null>(null)
  const [jawabanBenar, setJawabanBenar] = useState<string | null>(null)

  const selesaiRef = useRef(false)
  const terkunciRef = useRef(false)
  const timerEfekRef = useRef<number | null>(null)
  // Jeda: penandaan temuan selesai ditunda selama terjeda.
  const terjedaRef = useRef(terjeda)
  const timerLanjutRef = useRef<number | null>(null)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])
  const temuan = tahap.temuan
  const IkonTahap = IKON_TAHAP[stageIndex] ?? Droplets
  const temuanSaatIni = temuanAktif !== null ? temuan[temuanAktif] ?? null : null

  // Sel adegan: 5 titik masalah (beda kiri-kanan) + 3 titik sehat (sama),
  // diacak posisinya tiap tahap.
  const sel = useMemo(() => {
    const labelTahap = LABEL_TITIK[stageIndex] ?? LABEL_TITIK[0]
    const sehatTahap = TITIK_SEHAT[stageIndex] ?? TITIK_SEHAT[0]
    const beda = temuan.map((t, i) => ({
      id: `temuan-${i}`,
      label: labelTahap[i] ?? t.masalah,
      kiri: <Check aria-hidden="true" style={{ width: 22, height: 22, color: '#2f7d4f' }} />,
      kanan: <AlertTriangle aria-hidden="true" style={{ width: 22, height: 22, color: '#b45309' }} />,
    }))
    const sehat = sehatTahap.map((nama, i) => ({
      id: `sehat-${i}`,
      label: nama,
      kiri: <Check aria-hidden="true" style={{ width: 22, height: 22, color: '#2f7d4f' }} />,
      kanan: <Check aria-hidden="true" style={{ width: 22, height: 22, color: '#2f7d4f' }} />,
    }))
    return acak([...beda, ...sehat])
  }, [temuan, stageIndex])

  const bedaIds = useMemo(() => temuan.map((_, i) => `temuan-${i}`), [temuan])

  // Tiga kartu tindakan untuk temuan yang sedang ditangani (diacak tiap temuan).
  const kartuTindakan = useMemo(() => {
    if (!temuanSaatIni) return []
    return acak([
      { id: 'aksi-benar', label: temuanSaatIni.tindakan, benar: true },
      ...temuanSaatIni.pilihanSalah.map((s, i) => ({ id: `aksi-salah-${i}`, label: s, benar: false })),
    ])
  }, [temuanSaatIni])

  useEffect(
    () => () => {
      if (timerEfekRef.current) window.clearTimeout(timerEfekRef.current)
      if (timerLanjutRef.current) window.clearTimeout(timerLanjutRef.current)
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
    setJawabanBenar(null)
  }

  const jawabTindakan = (benarPilihan: boolean) => {
    if (temuanAktif === null || terkunciRef.current) return
    if (benarPilihan) {
      terkunciRef.current = true
      const id = `temuan-${temuanAktif}`
      benar()
      getar(20)
      setSkor((s) => s + (percobaanAktif === 0 ? 20 : 10))
      setBenarCount((c) => c + 1)
      setPesanSalah(null)
      setTunjuk(false)
      kilauBenar()
      setJawabanBenar(temuanSaatIni?.tindakan ?? '')
      // Tandai temuan selesai setelah 550 ms; bila sedang dijeda,
      // tunda sampai jeda selesai supaya tidak ada kemajuan saat jeda.
      const maju = () => {
        if (terjedaRef.current) {
          timerLanjutRef.current = window.setTimeout(maju, 150)
          return
        }
        terkunciRef.current = false
        const baru = new Set(temuanSelesai)
        baru.add(id)
        setTemuanSelesai(baru)
        setTemuanAktif(null)
        setPercobaanAktif(0)
        setJawabanBenar(null)
        if (baru.size >= temuan.length) setSelesai(true)
      }
      timerLanjutRef.current = window.setTimeout(maju, 550)
    } else {
      salah()
      getar([40, 40, 40])
      setPercobaanAktif((p) => p + 1)
      setPesanSalah(teksMagi(spec.petunjukMagi))
    }
  }

  if (selesai) {
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: '#2f7d4f' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu memilih {benarCount} dari {temuan.length} tindakan yang benar. Sekolah jadi lebih sehat!{' '}
            {spec.hasilBenar}
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
          <TanganPenunjuk label="Ketuk sel yang berbeda di panel kanan" />
        </div>
      )}
      <CariPerbedaan
        item={sel}
        beda={bedaIds}
        batasWaktuMs={0}
        terjeda={terjeda}
        disabled={temuanAktif !== null}
        onTemukan={onTemukan}
        onSelesai={() => {
          // Semua masalah ketemu — tahap tetap lanjut ke tindakan tiap masalah.
        }}
      />
      {temuanSaatIni && temuanAktif !== null && (
        <div className="aia-card">
          <span className="aia-kicker">Masalah ditemukan</span>
          <IkonTahap aria-hidden="true" style={{ width: 28, height: 28, color: 'var(--green)', marginTop: 8 }} />
          <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{temuanSaatIni.masalah}</strong>
          <p className="aia-muted" style={{ margin: '4px 0 0' }}>
            Ketuk tindakan yang benar.
          </p>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {kartuTindakan.map((k) => {
              const sorot = percobaanAktif >= 2 && k.benar
              const sudahBenar = jawabanBenar !== null && k.benar
              return (
                <button
                  key={k.id}
                  type="button"
                  className="aia-btn aia-btn-block"
                  disabled={terkunciRef.current}
                  onClick={() => jawabTindakan(k.benar)}
                  aria-label={`Tindakan: ${k.label}`}
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    minHeight: 48,
                    outline: sorot ? '2px dashed #b45309' : undefined,
                    outlineOffset: 2,
                    background: sudahBenar ? '#dcfce7' : undefined,
                    border: sudahBenar ? '2px solid #236b4d' : undefined,
                    whiteSpace: 'normal',
                    height: 'auto',
                    padding: '12px 16px',
                  }}
                >
                  {k.label}
                </button>
              )
            })}
          </div>
          {jawabanBenar && (
            <div role="status" style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#dcfce7' }}>
              <strong>Benar!</strong> {jawabanBenar}
            </div>
          )}
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
export function LingkunganSehat({ tugasId, stageIndex, onStageComplete, modeSatuKetukan = false, terjeda = false }: TugasMiniGameSlotProps) {
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
  return <InspeksiGestur key={kunci} tahap={tahap} stageIndex={stageIndex} spec={spec} onStageComplete={onStageComplete} terjeda={terjeda} />
}
