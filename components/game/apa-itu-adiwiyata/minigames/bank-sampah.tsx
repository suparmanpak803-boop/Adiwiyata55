'use client'

// Mini-game Misi Kader "Bank Sampah dan Daur Ulang" — versi gestur baru.
// Tahap 1 (pilah): SortirCepat — item melintas di ban berjalan, ketuk
//   kelompok PET / Kertas / Kaleng / Kaca sebelum waktu habis.
// Tahap 2 (catat): baca slip timbangan (berat baris yang sedang ditimbang),
// lalu ketuk berat yang sama dari pilihan yang tersedia untuk mengisi buku
// catatan — kolom Berat tabel tetap dikosongkan ("?"/"—") supaya jawaban
// tidak bocor dari tabel.
// Tahap 3 (kuis): KuisKilat — satu soal per layar dengan bar waktu.
// Gestur mengikuti INTERAKSI_MISI['bank-sampah']; isi dari KONTEN_TUGAS.
// Skor tiap tahap 0–100; onStageComplete dipanggil tepat satu kali.
// Prop modeSatuKetukan menampilkan versi tombol lama (logika tombol yang
// sudah ada di file ini) sebagai alternatif aksesibilitas.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Coins, Heart, Package, Receipt, Recycle, RotateCcw, X } from 'lucide-react'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { SpesifikasiInteraksi } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import { KONTEN_TUGAS } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TahapTugas } from '@/lib/apa-itu-adiwiyata/content/tugas'
import type { TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { warnaTombolBak } from '@/lib/apa-itu-adiwiyata/content/bak'
import type { TongSampah } from '@/lib/apa-itu-adiwiyata/types'
import { EfekBenar, EfekSalah, KuisKilat, SortirCepat, TanganPenunjuk } from '../interaksi'
import { TahapTidakTersedia } from '../tahap-tidak-tersedia'
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

/**
 * Slip timbangan — SATU-SATUNYA sumber jawaban tahap "Timbang dan Catat".
 * Menampilkan HANYA baris yang sedang ditimbang (jenis + beratnya), jadi
 * pemain bisa membaca jawabannya tanpa membocorkan baris lain. Tabel di
 * bawah tetap jadi buku catatan (terisi satu per satu saat baris dijawab
 * benar). Dipakai di kedua mode (CatatGestur dan CatatTimbangan).
 */
function SlipTimbangan({ jenis, berat }: { jenis: string; berat: string }) {
  return (
    <div
      className="aia-card"
      role="status"
      aria-label={`Slip timbangan: ${jenis} beratnya ${berat}`}
      style={{ border: '2px dashed var(--line)' }}
    >
      <span className="aia-kicker">
        <Receipt aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Slip timbangan
      </span>
      <p style={{ margin: '8px 0 0', fontSize: 18, lineHeight: 1.5 }}>
        <strong>{jenis}</strong> — <strong>{berat}</strong>
      </p>
      <p className="aia-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
        Baca slip ini, lalu ketuk berat yang sama di bawah.
      </p>
    </div>
  )
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

/**
 * C-9: warna kelompok material memakai palet 5 Bak SMAN 55 — PET, Kaleng,
 * dan Kaca semuanya Anorganik di sistem 5 bak, Kertas memakai warna
 * Kertas sistem (#c98a2e, bukan #b45309). Dipakai untuk ikon daur ulang;
 * latar tombol memakai versi gelapnya (warnaTombolBak) supaya teks putih
 * tetap ≥4,5:1.
 */
const BAK_KELOMPOK: Record<string, TongSampah> = {
  PET: 'anorganik',
  Kertas: 'kertas',
  Kaleng: 'anorganik',
  Kaca: 'anorganik',
}

const WARNA_KELOMPOK: Record<string, string> = {
  PET: '#3b7ea1',
  Kertas: '#c98a2e',
  Kaleng: '#3b7ea1',
  Kaca: '#3b7ea1',
}

// ------------------------------------------------- Tahap 1: pilah (gestur) ----
// SortirCepat: item anorganik melintas satu per satu di ban berjalan;
// pemain mengetuk kelompok yang benar (PET / Kertas / Kaleng / Kaca)
// sebelum waktu habis. Skor 0–100 = persen item benar (10 poin per item;
// jawaban salah langsung lanjut ke item berikutnya, tanpa ulangan).

function PilahGestur({
  tahap,
  spec,
  onStageComplete,
  tahapTerakhir = false,
  terjeda = false,
}: {
  tahap: TahapPilah
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
  /** True bila ini tahap terakhir (stageIndex 2): tombol akhir berbunyi "Ke Pos Hijau". */
  tahapTerakhir?: boolean
  terjeda?: boolean
}) {
  const [skorAkhir, setSkorAkhir] = useState<number | null>(null)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)

  const selesaiRef = useRef(false)
  const item = useMemo(
    () =>
      acak(tahap.items).map((it) => ({
        id: it.nama,
        label: it.nama,
        target: it.kelompok,
        ikon: <Package aria-hidden="true" style={{ width: 40, height: 40, color: 'var(--green)' }} />,
      })),
    [tahap],
  )
  const target = useMemo(
    () =>
      tahap.kelompok.map((k) => ({
        id: k,
        label: k,
        ikon: <Recycle aria-hidden="true" color={WARNA_KELOMPOK[k] ?? '#236b4d'} />,
      })),
    [tahap],
  )

  const selesaikan = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(nilai)
  }

  if (skorAkhir !== null) {
    const benarHitung = Math.round(skorAkhir / 10)
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu memilah {benarHitung} dari {item.length} item dengan benar. {spec.hasilBenar}
          </p>
          <p>
            Skor tahap ini: <strong>{skorAkhir}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesaikan(skorAkhir)}>
              <Check aria-hidden="true" /> {tahapTerakhir ? 'Ke Pos Hijau' : 'Level Selanjutnya'}
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <div className="aia-card">
        <span className="aia-kicker">Bank Sampah · {tahap.judul}</span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          {tahap.instruksi}
        </p>
      </div>
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Ketuk kelompok yang benar sebelum waktu habis" />
        </div>
      )}
      <SortirCepat
        item={item}
        target={target}
        terjeda={terjeda}
        onSelesai={(skor) => {
          setTunjuk(false)
          setSkorAkhir(skor)
        }}
      />
    </div>
  )
}

// ------------------------------------------------- Tahap 2: catat (gestur) ----
// Ketuk sel tabel: slip timbangan menampilkan berat baris yang sedang
// ditimbang (satu-satunya sumber jawaban); pemain mengetuk berat yang sama
// dari pilihan yang tersedia untuk mengisi buku catatan. Tabel tetap jadi
// buku catatan: berat hanya terlihat setelah baris itu dijawab benar
// ('?' untuk baris aktif, '—' untuk sisanya).
// +25 percobaan pertama / +10 ulangan; skor maks 100.

function CatatGestur({
  tahap,
  spec,
  onStageComplete,
  tahapTerakhir = false,
  terjeda = false,
}: {
  tahap: TahapCatat
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
  /** True bila ini tahap terakhir (stageIndex 2): tombol akhir berbunyi "Ke Pos Hijau". */
  tahapTerakhir?: boolean
  terjeda?: boolean
}) {
  const [pos, setPos] = useState(0)
  const [skor, setSkor] = useState(0)
  const [benarCount, setBenarCount] = useState(0)
  const [percobaan, setPercobaan] = useState(0)
  const [selesai, setSelesai] = useState(false)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)
  const [efekBenar, setEfekBenar] = useState(false)
  const [pesanSalah, setPesanSalah] = useState<string | null>(null)
  const [tercatat, setTercatat] = useState<Record<string, string>>({})
  // C-25: cermin state dari terkunciRef — `disabled={ref.current}` adalah
  // prop mati (ref tidak memicu render), jadi tombol tampak aktif selama
  // 550 ms jeda maju baris. State ini yang menggerakkan `disabled`.
  const [terkunci, setTerkunci] = useState(false)

  const selesaiRef = useRef(false)
  const terkunciRef = useRef(false)
  const timerEfekRef = useRef<number | null>(null)
  // Jeda: kemajuan ke baris berikutnya ditunda selama terjeda.
  const terjedaRef = useRef(terjeda)
  const timerLanjutRef = useRef<number | null>(null)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])
  const baris = tahap.tabel.baris
  const urutan = useMemo(() => acak(baris.map((_, i) => i)), [baris])
  const barisIdx = urutan[pos] ?? 0
  const barisSaatIni = baris[barisIdx] ?? null
  const jenis = barisSaatIni?.[0] ?? ''
  const beratBenar = barisSaatIni?.[1] ?? ''
  const opsiBerat = useMemo(() => acak(baris.map((b) => b[1] ?? '')), [baris])

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

  const jawab = (berat: string) => {
    if (!barisSaatIni || terkunciRef.current) return
    if (berat === beratBenar) {
      terkunciRef.current = true
      setTerkunci(true)
      benar()
      getar(20)
      setSkor((s) => s + (percobaan === 0 ? 25 : 10))
      setBenarCount((c) => c + 1)
      setTercatat((t) => ({ ...t, [jenis]: beratBenar }))
      setPesanSalah(null)
      setTunjuk(false)
      kilauBenar()
      // Maju ke baris berikutnya setelah 550 ms; bila sedang dijeda,
      // tunda sampai jeda selesai supaya tidak ada kemajuan saat jeda.
      const maju = () => {
        if (terjedaRef.current) {
          timerLanjutRef.current = window.setTimeout(maju, 150)
          return
        }
        terkunciRef.current = false
        setTerkunci(false)
        if (pos + 1 >= baris.length) setSelesai(true)
        else {
          setPos((p) => p + 1)
          setPercobaan(0)
        }
      }
      timerLanjutRef.current = window.setTimeout(maju, 550)
    } else {
      salah()
      getar([40, 40, 40])
      setPercobaan((p) => p + 1)
      setPesanSalah(teksMagi(spec.petunjukMagi))
    }
  }

  if (selesai) {
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu mencatat {benarCount} dari {baris.length} jenis sampah dengan benar. Total timbangan hari ini:{' '}
            <strong>{totalBerat}</strong>. {spec.hasilBenar}
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesaikan(skor)}>
              <Check aria-hidden="true" /> {tahapTerakhir ? 'Ke Pos Hijau' : 'Level Selanjutnya'}
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
            <Coins aria-hidden="true" /> Skor {skor}
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
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => {
              const namaJenis = b[0] ?? ''
              const sedangDitimbang = namaJenis === jenis
              const sudah = tercatat[namaJenis]
              return (
                <tr
                  key={namaJenis || i}
                  style={
                    sedangDitimbang
                      ? { background: 'color-mix(in srgb, #2f7d4f 8%, transparent)' }
                      : undefined
                  }
                >
                  <td
                    style={{
                      padding: '8px 4px',
                      borderBottom: '1px solid var(--line)',
                      fontWeight: sedangDitimbang ? 800 : 700,
                    }}
                  >
                    {namaJenis}
                  </td>
                  <td
                    style={{
                      padding: '8px 4px',
                      borderBottom: '1px solid var(--line)',
                      fontWeight: sedangDitimbang ? 800 : undefined,
                    }}
                  >
                    {sudah ?? (sedangDitimbang ? '?' : '—')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <SlipTimbangan jenis={jenis} berat={beratBenar} />
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Baca slip timbangan, lalu ketuk berat yang sama" />
        </div>
      )}
      <div className="aia-card">
        <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
          Berapa berat {jenis} hari ini?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {opsiBerat.map((berat) => {
            const isJawaban = berat === beratBenar
            const sorot = percobaan >= 2 && isJawaban
            return (
              <button
                key={berat}
                type="button"
                className="aia-btn aia-btn-block"
                disabled={terkunci}
                onClick={() => jawab(berat)}
                aria-label={`Berat ${berat}`}
                style={{
                  minHeight: 48,
                  outline: sorot ? '2px dashed #b45309' : undefined,
                  outlineOffset: 2,
                  whiteSpace: 'normal',
                  height: 'auto',
                  padding: '12px 16px',
                }}
              >
                {berat}
              </button>
            )
          })}
        </div>
        {pesanSalah && <EfekSalah tampil petunjuk={pesanSalah} />}
      </div>
    </div>
  )
}

// -------------------------------------------------- Tahap 3: kuis (gestur) ----
// KuisKilat: satu soal per layar dengan bar waktu; ketuk jawaban, lalu
// penjelasan tampil sebelum soal berikutnya. Pilihan diacak tiap soal
// supaya jawaban benar tidak selalu di posisi yang sama.

function KuisGestur({
  tahap,
  spec,
  onStageComplete,
  tahapTerakhir = false,
  terjeda = false,
}: {
  tahap: TahapKuis
  spec: SpesifikasiInteraksi
  onStageComplete: (score: number) => void
  /** True bila ini tahap terakhir (stageIndex 2): tombol akhir berbunyi "Ke Pos Hijau". */
  tahapTerakhir?: boolean
  terjeda?: boolean
}) {
  const [skorAkhir, setSkorAkhir] = useState<number | null>(null)
  const [tunjuk, setTunjuk] = useState(spec.tutorial)

  const selesaiRef = useRef(false)
  const soal = useMemo(
    () =>
      tahap.soal.map((s) => {
        const urutan = acak([0, 1, 2])
        return {
          pertanyaan: s.pertanyaan,
          pilihan: urutan.map((i) => s.pilihan[i] ?? ''),
          jawaban: urutan.indexOf(s.jawaban),
          penjelasan: s.penjelasan,
        }
      }),
    [tahap],
  )

  const selesaikan = (nilai: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    koin()
    onStageComplete(nilai)
  }

  if (skorAkhir !== null) {
    return (
      <div className="aia-stack">
        <section className="aia-card aia-pos-hijau" style={{ textAlign: 'center' }}>
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
          <h3 className="aia-section-title">Tahap selesai!</h3>
          <p className="aia-muted">
            Kamu menyelesaikan {soal.length} soal hitung tabungan. {spec.hasilBenar}
          </p>
          <p>
            Skor tahap ini: <strong>{skorAkhir}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesaikan(skorAkhir)}>
              <Check aria-hidden="true" /> {tahapTerakhir ? 'Ke Pos Hijau' : 'Level Selanjutnya'}
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <div className="aia-card">
        <span className="aia-kicker">Bank Sampah · {tahap.judul}</span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          {tahap.instruksi}
        </p>
      </div>
      {tunjuk && (
        <div style={{ textAlign: 'center' }}>
          <TanganPenunjuk label="Ketuk jawaban sebelum waktu habis" />
        </div>
      )}
      <KuisKilat
        soal={soal}
        terjeda={terjeda}
        onSelesai={(skor) => {
          setTunjuk(false)
          setSkorAkhir(skor)
        }}
      />
    </div>
  )
}

// ------------------------------------------------------- Tahap 1: pilah (tombol) ----
// Versi tombol lama — dipakai sebagai mode alternatif satu-ketukan.

function PilahAnorganik({
  tahap,
  onStageComplete,
  tahapTerakhir = false,
}: {
  tahap: TahapPilah
  onStageComplete: (score: number) => void
  /** True bila ini tahap terakhir (stageIndex 2): tombol akhir berbunyi "Ke Pos Hijau". */
  tahapTerakhir?: boolean
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
                <Coins aria-hidden="true" /> Skor {skor}
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
              <p className="aia-muted" style={{ margin: '8px 0 0', color: 'var(--green)' }}>
                Petunjuk: masuk kelompok {item.kelompok}.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {tahap.kelompok.map((kelompok) => {
              // C-9: latar tombol memakai versi gelap warna bak supaya
              // teks putih ≥4,5:1 (warna bak mentah #c98a2e hanya 2,93:1).
              const warnaTombol = warnaTombolBak(BAK_KELOMPOK[kelompok] ?? 'anorganik')
              const isDipilih = dipilih === kelompok
              const isJawaban = item.kelompok === kelompok
              let kelasUmpan: string | undefined
              let border: string | undefined
              if (umpan && isJawaban) {
                kelasUmpan = 'aia-umpan-benar'
                border = '2px solid #236b4d'
              } else if (umpan && isDipilih) {
                kelasUmpan = 'aia-umpan-salah'
                border = '2px solid #b83232'
              }
              return (
                <button
                  key={kelompok}
                  type="button"
                  className={`aia-btn aia-btn-block${kelasUmpan ? ` ${kelasUmpan}` : ''}`}
                  disabled={!!umpan}
                  onClick={() => jawab(kelompok)}
                  aria-label={`Kelompok ${kelompok}`}
                  style={{
                    minHeight: 56,
                    background: kelasUmpan ? undefined : warnaTombol,
                    border,
                    color: kelasUmpan ? undefined : '#ffffff',
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
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
          <h3 id="aia-bs-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu memilah {benarCount} dari {deck.length} item dengan benar.
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
              <Check aria-hidden="true" /> {tahapTerakhir ? 'Ke Pos Hijau' : 'Level Selanjutnya'}
            </button>
          </div>
        </section>
      )}

      {fase === 'gagal' && (
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-bs-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--aia-merah)' }} />
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
  tahapTerakhir = false,
}: {
  tahap: TahapCatat
  onStageComplete: (score: number) => void
  /** True bila ini tahap terakhir (stageIndex 2): tombol akhir berbunyi "Ke Pos Hijau". */
  tahapTerakhir?: boolean
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
      setUmpan({ benar: false, teks: `Bukan ${berat}. Cek lagi slip timbangannya: ${jenis} beratnya ${beratBenar}.` })
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
                <Coins aria-hidden="true" /> Skor {skor}
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
                        {/* B-12: kolom Berat disembunyikan seperti di CatatGestur —
                            berat hanya terlihat setelah baris itu dijawab benar,
                            '?' untuk baris yang sedang ditimbang, '—' untuk sisanya.
                            Kalau berat ditampilkan semua, pertanyaannya bocor. */}
                        {j === 1
                          ? hasil[i] === true
                            ? sel
                            : i === rowIdx
                              ? '?'
                              : '—'
                          : sel}
                      </td>
                    ))}
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid var(--line)' }}>
                      {hasil[i] === true ? (
                        <Check size={16} role="img" aria-label="Benar" />
                      ) : hasil[i] === false ? (
                        <X size={16} role="img" aria-label="Salah" />
                      ) : i === rowIdx ? (
                        '…'
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SlipTimbangan jenis={jenis} berat={beratBenar} />

          <div className="aia-card">
            <p style={{ margin: '0 0 12px', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>
              Berapa berat {jenis} hari ini?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {opsi.map((berat) => {
                const isDipilih = dipilih === berat
                const isJawaban = berat === beratBenar
                let kelasUmpan: string | undefined
                let border: string | undefined
                if (umpan && isJawaban) {
                  kelasUmpan = 'aia-umpan-benar'
                  border = '2px solid #236b4d'
                } else if (umpan && isDipilih) {
                  kelasUmpan = 'aia-umpan-salah'
                  border = '2px solid #b83232'
                }
                return (
                  <button
                    key={berat}
                    type="button"
                    className={`aia-btn aia-btn-block${kelasUmpan ? ` ${kelasUmpan}` : ''}`}
                    disabled={!!umpan}
                    onClick={() => jawab(berat)}
                    aria-label={`Berat ${berat}`}
                    style={{
                      minHeight: 48,
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
                className={umpan.benar ? 'aia-umpan-benar' : 'aia-umpan-salah'}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
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
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
          <h3 id="aia-bs2-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu mencatat {benarCount} dari {baris.length} jenis sampah dengan benar. Total timbangan hari ini:{' '}
            <strong>{totalBerat}</strong>.
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
              <Check aria-hidden="true" /> {tahapTerakhir ? 'Ke Pos Hijau' : 'Level Selanjutnya'}
            </button>
          </div>
        </section>
      )}

      {fase === 'gagal' && (
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-bs2-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--aia-merah)' }} />
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
  tahapTerakhir = false,
}: {
  tahap: TahapKuis
  onStageComplete: (score: number) => void
  /** True bila ini tahap terakhir (stageIndex 2): tombol akhir berbunyi "Ke Pos Hijau". */
  tahapTerakhir?: boolean
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
                <Coins aria-hidden="true" /> Skor {skor}
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
                let kelasUmpan: string | undefined
                let border: string | undefined
                if (umpan && isJawaban) {
                  kelasUmpan = 'aia-umpan-benar'
                  border = '2px solid #236b4d'
                } else if (umpan && isDipilih) {
                  kelasUmpan = 'aia-umpan-salah'
                  border = '2px solid #b83232'
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className={`aia-btn aia-btn-block${kelasUmpan ? ` ${kelasUmpan}` : ''}`}
                    disabled={!!umpan}
                    onClick={() => jawab(i)}
                    aria-label={`Pilihan ${String.fromCharCode(65 + i)}: ${pilihan}`}
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
                    <span>{pilihan}</span>
                    {umpan && isJawaban && <Check aria-hidden="true" />}
                    {umpan && isDipilih && !isJawaban && <X aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            {umpan && (
              <div
                role="status"
                className={umpan.benar ? 'aia-umpan-benar' : 'aia-umpan-salah'}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
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
          <Check aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--green)' }} />
          <h3 id="aia-bs3-selesai-title" className="aia-section-title">
            Tahap selesai!
          </h3>
          <p className="aia-muted">
            Kamu menjawab {benarCount} dari {soal.length} soal hitung tabungan dengan benar.
          </p>
          <p>
            Skor tahap ini: <strong>{skor}</strong>
          </p>
          <div className="aia-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => selesai(skor)}>
              <Check aria-hidden="true" /> {tahapTerakhir ? 'Ke Pos Hijau' : 'Level Selanjutnya'}
            </button>
          </div>
        </section>
      )}

      {fase === 'gagal' && (
        <section className="aia-card" style={{ textAlign: 'center' }} aria-labelledby="aia-bs3-gagal-title">
          <X aria-hidden="true" style={{ width: 36, height: 36, color: 'var(--aia-merah)' }} />
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
export function BankSampah({ tugasId, stageIndex, onStageComplete, modeSatuKetukan = false, terjeda = false }: TugasMiniGameSlotProps) {
  const konten = KONTEN_TUGAS[tugasId]
  const tahap = konten?.tahapan[stageIndex]
  const spec = INTERAKSI_MISI[tugasId]?.[stageIndex]
  if (!tahap || !spec) {
    return (
      <TahapTidakTersedia onLewati={() => onStageComplete(0)} />
    )
  }
  const kunci = `${tugasId}-${stageIndex}`
  if (modeSatuKetukan) {
    if (tahap.jenis === 'pilah') return <PilahAnorganik key={kunci} tahap={tahap} onStageComplete={onStageComplete} tahapTerakhir={stageIndex === 2} />
    if (tahap.jenis === 'catat') return <CatatTimbangan key={kunci} tahap={tahap} onStageComplete={onStageComplete} tahapTerakhir={stageIndex === 2} />
    if (tahap.jenis === 'kuis') return <KuisTabungan key={kunci} tahap={tahap} onStageComplete={onStageComplete} tahapTerakhir={stageIndex === 2} />
    return (
      <TahapTidakTersedia onLewati={() => onStageComplete(0)} />
    )
  }
  if (tahap.jenis === 'pilah') return <PilahGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} tahapTerakhir={stageIndex === 2} terjeda={terjeda} />
  if (tahap.jenis === 'catat') return <CatatGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} tahapTerakhir={stageIndex === 2} terjeda={terjeda} />
  if (tahap.jenis === 'kuis') return <KuisGestur key={kunci} tahap={tahap} spec={spec} onStageComplete={onStageComplete} tahapTerakhir={stageIndex === 2} terjeda={terjeda} />
  return (
    <TahapTidakTersedia onLewati={() => onStageComplete(0)} />
  )
}
