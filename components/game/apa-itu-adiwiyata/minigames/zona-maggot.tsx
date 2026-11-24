'use client'

// Mini-game Bab 3 "Pos Maggot" — dipakai per tahap, stageIndex memilih fase:
// 0 Beri pakan -> 1 Jaga kotak -> 2 Panen. Tiap tahap memanggil
// onStageComplete TEPAT SATU KALI dengan skor tahap itu (0–100).
// Mode gestur (default): TangkapJatuh / SliderLever / HoldAction dari pustaka
// interaksi. Mode satu-ketukan (prop modeSatuKetukan): versi tombol lama
// dipakai sebagai alternatif aksesibilitas. Gagal di satu tahap menampilkan
// layar "Coba lagi" internal (hanya tahap itu yang diulang); setelah 2x
// salah, target membesar (kesulitan adaptif).

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Apple,
  Bug,
  Check,
  Coins,
  Droplets,
  Drumstick,
  Fish,
  Leaf,
  Lightbulb,
  RotateCcw,
  Salad,
  Soup,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
  Umbrella,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { FAKTA_MAGGOT } from '@/lib/apa-itu-adiwiyata/content/fakta'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { MiniGameSlotProps } from '../misi-shell'
import {
  EfekBenar,
  EfekSalah,
  HoldAction,
  PetunjukMagi,
  SliderLever,
  TanganPenunjuk,
  TangkapJatuh,
} from '../interaksi'
import {
  benar,
  koin,
  lalat,
  maggot as sfxMaggot,
  nyawa,
  panen,
  salah,
  setSuaraMuted,
  tik,
} from '../suara'

const NAMA_FASE = ['Beri pakan', 'Jaga kotak', 'Panen']

/** Bersihkan awalan `Magi: "..."` dari data petunjuk menjadi teks polos. */
function bersihPetunjuk(teks: string): string {
  return teks.replace(/^Magi:\s*"/, '').replace(/"$/, '')
}

/** Props bersama untuk fase gestur. */
interface PropsGestur {
  tambahSkor: (n: number) => void
  onSelesai: () => void
  onGagal: (alasan: string) => void
  /** Dipanggil tiap aksi salah (untuk hitung kesulitan adaptif). */
  onSalah: () => void
  /** True setelah 2 kali salah — target membesar. */
  perbesarTarget: boolean
  /** True saat misi dijeda: jam/timer fase dibekukan, diteruskan ke pustaka interaksi. */
  terjeda?: boolean
}

function TombolBisukan() {
  const { save, dispatch } = useCampaign()
  return (
    <button
      type="button"
      className="aia-icon-btn"
      aria-label={save.muted ? 'Nyalakan suara' : 'Bisukan suara'}
      onClick={() => {
        const next = !save.muted
        dispatch({ type: 'SET_MUTED', muted: next })
        setSuaraMuted(next)
      }}
    >
      {save.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
    </button>
  )
}

function LayarGagal({
  alasan,
  gagal,
  onUlang,
  onMudah,
}: {
  alasan: string
  gagal: number
  onUlang: () => void
  onMudah: () => void
}) {
  return (
    <section className="aia-card" role="alert" aria-label="Gagal, coba lagi">
      <span className="aia-kicker">Yah, belum berhasil</span>
      <h3 className="aia-section-title">
        <AlertTriangle aria-hidden="true" /> Coba lagi, ya!
      </h3>
      <p className="aia-muted">{alasan}</p>
      <p className="aia-muted">Kamu sudah gagal {gagal} kali di fase ini. Tenang, maggot-nya masih menunggu.</p>
      <div className="aia-actions">
        <button type="button" className="aia-btn aia-btn-primary" onClick={onUlang}>
          <RotateCcw aria-hidden="true" /> Coba lagi
        </button>
        {gagal >= 2 && (
          <button type="button" className="aia-btn aia-btn-ghost" onClick={onMudah}>
            <Leaf aria-hidden="true" /> Mode mudah (petunjuk muncul)
          </button>
        )}
      </div>
    </section>
  )
}

// ------------------------------------------------------------ Fase 0: pakan ----

interface Pakan {
  id: string
  nama: string
  benar: boolean
  penjelasan: string
}

const PAKAN: Pakan[] = [
  { id: 'nasi', nama: 'Sisa nasi', benar: true, penjelasan: 'Maggot doyan nasi. Ini makanan favorit mereka.' },
  { id: 'sayur', nama: 'Sayur sisa', benar: true, penjelasan: 'Sayur sisa cepat habis dimakan maggot.' },
  { id: 'buah', nama: 'Buah matang', benar: true, penjelasan: 'Buah yang terlalu matang justru paling disukai maggot.' },
  { id: 'daging', nama: 'Daging berlebih', benar: false, penjelasan: 'Daging berlebih bikin kotak bau dan mengundang lalat.' },
  { id: 'minyak', nama: 'Makanan berminyak', benar: false, penjelasan: 'Minyak menempel di maggot dan bikin mereka sakit.' },
  { id: 'plastik', nama: 'Plastik', benar: false, penjelasan: 'Plastik bukan makanan! Maggot tidak bisa mencernanya.' },
]

const IKON_PAKAN: Record<string, typeof Soup> = {
  nasi: Soup,
  sayur: Salad,
  buah: Apple,
  daging: Drumstick,
  minyak: Droplets,
  plastik: Trash2,
}

// ------------------------------------------- Versi tombol (mode satu-ketukan) ----

function FasePakan({
  mudah,
  tambahSkor,
  onSelesai,
  onGagal,
}: {
  mudah: boolean
  tambahSkor: (n: number) => void
  onSelesai: () => void
  onGagal: (alasan: string) => void
}) {
  const { save, dispatch } = useCampaign()
  const [diberi, setDiberi] = useState<string[]>([])
  const [bau, setBau] = useState(() => (save.carryover.maggotKenaMinyak ? 2 : 0))
  const [pesan, setPesan] = useState<string | null>(
    save.carryover.maggotKenaMinyak
      ? 'Maggot kena minyak dari kantin! Baunya sudah tinggi. Beri pakan bersih untuk memulihkan.'
      : null,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const beri = (pakan: Pakan) => {
    if (diberi.length >= 5) return
    sfxMaggot()
    const baru = [...diberi, pakan.id]
    setDiberi(baru)
    if (pakan.benar) {
      tambahSkor(10)
      benar()
      setPesan(pakan.penjelasan)
    } else {
      salah()
      setPesan(pakan.penjelasan)
      if (!mudah) {
        const bauBaru = bau + 1
        setBau(bauBaru)
        if (bauBaru >= 1) lalat()
        if (bauBaru >= 3) {
          timerRef.current = setTimeout(
            () => onGagal('Bau kotak sudah tidak tertahankan dan lalat menyerbu. Kotak maggot perlu diulang dari awal.'),
            1200,
          )
          return
        }
      }
    }
    if (baru.length === 5) {
      timerRef.current = setTimeout(() => {
        if (save.carryover.maggotKenaMinyak) {
          dispatch({ type: 'SET_CARRYOVER', patch: { maggotKenaMinyak: false } })
        }
        onSelesai()
      }, 700)
    }
  }

  return (
    <section className="aia-card" aria-labelledby="aia-maggot-pakan">
      <span className="aia-kicker">Fase 1 dari 3 · Beri pakan</span>
      <h3 id="aia-maggot-pakan" className="aia-section-title">
        Beri maggot makan
      </h3>
      <p className="aia-muted">
        Pilih 5 pakan dari stok organik kantin. Pakan yang benar bikin maggot sehat; pakan yang salah bikin bau naik
        dan lalat datang.
      </p>

      {save.carryover.maggotKenaMinyak && (
        <p className="aia-chip" role="alert">
          <AlertTriangle aria-hidden="true" /> Maggot kena minyak dari kantin! Bau awal sudah tinggi.
        </p>
      )}

      <div className="aia-progress-row">
        <span>Stok organik dari kantin</span>
        <strong>
          {diberi.length}/5 pakan · Bau: {bau}/3
        </strong>
      </div>
      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={bau}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label="Tingkat bau kotak maggot"
      >
        <span style={{ width: `${(bau / 3) * 100}%`, background: bau >= 2 ? '#b91c1c' : '#2e7d32' }} />
      </div>

      {bau >= 1 && (
        <p role="status" aria-live="polite">
          <Bug aria-hidden="true" /> Lalat datang! Bau kotaknya naik. Beri pakan bersih supaya baunya turun.
        </p>
      )}

      <div className="aia-zone-grid" role="group" aria-label="Pilihan pakan">
        {PAKAN.map((pakan) => {
          const Ikon = IKON_PAKAN[pakan.id]
          const sudah = diberi.includes(pakan.id)
          return (
            <button
              key={pakan.id}
              type="button"
              className="aia-btn aia-btn-ghost aia-btn-block"
              disabled={sudah || diberi.length >= 5}
              onClick={() => beri(pakan)}
            >
              <Ikon aria-hidden="true" /> {pakan.nama}
              {mudah && pakan.benar && !sudah ? ' · Cocok' : ''}
              {sudah ? ' · Sudah diberi' : ''}
            </button>
          )
        })}
      </div>

      {pesan && (
        <p role="status" aria-live="polite">
          {pesan}
        </p>
      )}
    </section>
  )
}

// ------------------------------------------------- Versi gestur: beri pakan ----
// TangkapJatuh: makanan jatuh satu per satu dari atas; tangkap makanan yang
// aman untuk maggot, biarkan makanan yang bikin sakit jatuh ke tanah.
// TangkapJatuh hanya melaporkan skor akhir (skor = round(benar/3*100 -
// 5*salah), diklem 0–100). Dengan 3 pakan benar, tiap pasangan (benar, salah)
// menghasilkan skor yang berbeda, jadi jumlah tangkapan salah diurai kembali
// dari skor untuk menghitung bau — kecuali skor 0 (tidak ada pakan benar yang
// tertangkap), yang langsung dianggap gagal.

function uraiSkorTangkap(skor: number): { benar: number; salah: number } {
  for (let b = 3; b >= 0; b--) {
    for (let s = 0; s <= 3; s++) {
      if (Math.max(0, Math.round((b / 3) * 100 - 5 * s)) === skor) return { benar: b, salah: s }
    }
  }
  return { benar: 0, salah: 0 }
}

function FasePakanGestur({ tambahSkor, onSelesai, onGagal, onSalah, perbesarTarget, terjeda = false }: PropsGestur) {
  const { save, dispatch } = useCampaign()
  const spec = INTERAKSI_MISI.maggot[0]
  const bauAwal = save.carryover.maggotKenaMinyak ? 2 : 0
  const [bau, setBau] = useState(bauAwal)
  const [pesan, setPesan] = useState<string | null>(
    save.carryover.maggotKenaMinyak
      ? 'Maggot kena minyak dari kantin! Baunya sudah tinggi. Tangkap pakan bersih untuk memulihkan.'
      : null,
  )
  const [petunjuk, setPetunjuk] = useState<string | null>(null)
  const [efekBenar, setEfekBenar] = useState(false)
  const [selesai, setSelesai] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const diprosesRef = useRef(false)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const objek = useMemo(
    () =>
      [...PAKAN].sort(() => Math.random() - 0.5).map((pakan) => {
        const Ikon = IKON_PAKAN[pakan.id]
        return { id: pakan.id, label: pakan.nama, benar: pakan.benar, ikon: <Ikon aria-hidden="true" /> }
      }),
    [],
  )

  const selesaiTangkap = (skorAkhir: number) => {
    if (diprosesRef.current) return
    diprosesRef.current = true
    setSelesai(true)
    const { benar: jumlahBenar, salah: jumlahSalah } = uraiSkorTangkap(skorAkhir)
    const bauAkhir = bauAwal + jumlahSalah
    setBau(bauAkhir)
    for (let i = 0; i < jumlahSalah; i++) onSalah()
    if (jumlahBenar === 0) {
      setPetunjuk(bersihPetunjuk(spec.petunjukMagi))
      setPesan('Maggot tidak mendapat pakan sama sekali — semua makanan jatuh ke tanah.')
      timerRef.current = setTimeout(
        () =>
          onGagal(
            'Maggot masih lapar karena tidak ada pakan yang tertangkap. Coba lagi dan tangkap makanan yang aman untuk maggot.',
          ),
        1200,
      )
      return
    }
    if (bauAkhir >= 3) {
      lalat()
      setPetunjuk(bersihPetunjuk(spec.petunjukMagi))
      setPesan('Kotak jadi bau karena makanan yang bikin sakit ikut tertangkap.')
      timerRef.current = setTimeout(
        () => onGagal('Bau kotak sudah tidak tertahankan dan lalat menyerbu. Kotak maggot perlu diulang dari awal.'),
        1200,
      )
      return
    }
    tambahSkor(skorAkhir)
    setEfekBenar(true)
    setPetunjuk(null)
    setPesan(spec.hasilBenar)
    timerRef.current = setTimeout(() => {
      if (save.carryover.maggotKenaMinyak) {
        dispatch({ type: 'SET_CARRYOVER', patch: { maggotKenaMinyak: false } })
      }
      onSelesai()
    }, 900)
  }

  return (
    <section className="aia-card" aria-labelledby="aia-maggot-pakan" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} label="Maggot suka!" />
      <span className="aia-kicker">Fase 1 dari 3 · Beri pakan</span>
      <h3 id="aia-maggot-pakan" className="aia-section-title">
        Beri maggot makan
      </h3>
      <p className="aia-muted">
        Makanan jatuh satu per satu dari atas. Gerakkan keranjang untuk menangkap makanan yang aman untuk maggot,
        dan biarkan makanan yang bikin sakit jatuh ke tanah.
      </p>

      {save.carryover.maggotKenaMinyak && (
        <p className="aia-chip" role="alert">
          <AlertTriangle aria-hidden="true" /> Maggot kena minyak dari kantin! Bau awal sudah tinggi.
        </p>
      )}

      <div className="aia-progress-row">
        <span>Bau kotak (salah tangkap menaikkan bau)</span>
        <strong>Bau: {bau}/3</strong>
      </div>
      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={bau}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label="Tingkat bau kotak maggot"
      >
        <span style={{ width: `${(bau / 3) * 100}%`, background: bau >= 2 ? '#b91c1c' : '#2e7d32' }} />
      </div>

      {bau >= 1 && (
        <p role="status" aria-live="polite">
          <Bug aria-hidden="true" /> Lalat datang! Bau kotaknya naik. Beri pakan bersih supaya baunya turun.
        </p>
      )}

      {spec.tutorial && !selesai && (
        <p style={{ textAlign: 'center', margin: '4px 0' }}>
          <TanganPenunjuk label="Gerakkan keranjang, tangkap makanan yang aman" />
        </p>
      )}

      <TangkapJatuh objek={objek} modeSatuKetukan={perbesarTarget} disabled={selesai} terjeda={terjeda} onSelesai={selesaiTangkap} />

      {petunjuk && <EfekSalah tampil petunjuk={petunjuk} />}

      {pesan && (
        <p role="status" aria-live="polite">
          {pesan}
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------- Fase 1: jaga kotak ----

interface AksiJaga {
  id: string
  label: string
}

interface RondeJaga {
  indikator: 'kelembapan' | 'suhu' | 'bau'
  label: string
  masalah: string
  nilaiAwal: number
  benarId: string
  aksi: AksiJaga[]
  penjelasanSalah: string
}

const RONDE_JAGA: RondeJaga[] = [
  {
    indikator: 'kelembapan',
    label: 'Kelembapan',
    masalah: 'Terlalu lembap!',
    nilaiAwal: 85,
    benarId: 'kering',
    aksi: [
      { id: 'kering', label: 'Tambah bahan kering' },
      { id: 'siram', label: 'Siram lagi' },
      { id: 'tutup', label: 'Tutup rapat' },
    ],
    penjelasanSalah: 'Itu malah bikin kotak makin lembap. Maggot butuh bahan kering supaya kelembabannya turun.',
  },
  {
    indikator: 'suhu',
    label: 'Suhu',
    masalah: 'Terlalu panas!',
    nilaiAwal: 88,
    benarId: 'teduh',
    aksi: [
      { id: 'teduh', label: 'Pindah ke tempat teduh' },
      { id: 'lampu', label: 'Tambah lampu' },
      { id: 'tutup', label: 'Tutup kotak rapat' },
    ],
    penjelasanSalah: 'Itu malah bikin kotak makin panas. Maggot kepanasan kalau tidak dipindah ke tempat teduh.',
  },
  {
    indikator: 'bau',
    label: 'Bau',
    masalah: 'Bau naik!',
    nilaiAwal: 82,
    benarId: 'aduk',
    aksi: [
      { id: 'aduk', label: 'Aduk kotak' },
      { id: 'daging', label: 'Tambah daging' },
      { id: 'biar', label: 'Biarkan saja' },
    ],
    penjelasanSalah: 'Itu malah bikin bau makin naik. Kotak perlu diaduk supaya udara masuk.',
  },
]

const IKON_AKSI_JAGA: Record<string, typeof Leaf> = {
  kering: Leaf,
  siram: Droplets,
  tutup: X,
  teduh: Umbrella,
  lampu: Lightbulb,
  aduk: Wind,
  daging: Drumstick,
  biar: X,
}

function BarIndikator({
  label,
  nilai,
  masalah,
  ikon: Ikon,
}: {
  label: string
  nilai: number
  masalah: string
  ikon: typeof Thermometer
}) {
  const status = nilai < 40 ? 'Terlalu rendah' : nilai <= 70 ? 'Aman' : masalah
  const warna = nilai < 40 ? '#b45309' : nilai <= 70 ? '#2e7d32' : '#b91c1c'
  return (
    <div>
      <div className="aia-progress-row">
        <span>
          <Ikon aria-hidden="true" /> {label}
        </span>
        <strong>
          {nilai}% · {status}
        </strong>
      </div>
      <div
        style={{ position: 'relative', height: 14, borderRadius: 999, background: '#e8ede6', overflow: 'hidden' }}
        role="progressbar"
        aria-valuenow={nilai}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${status}`}
      >
        <span style={{ position: 'absolute', left: '40%', width: '30%', top: 0, bottom: 0, background: '#a8d5a2' }} />
        <span
          style={{
            position: 'absolute',
            left: `calc(${nilai}% - 3px)`,
            width: 6,
            top: 0,
            bottom: 0,
            background: warna,
            borderRadius: 999,
          }}
        />
      </div>
      <small className="aia-muted">Zona hijau 40–70% itu aman.</small>
    </div>
  )
}

// ------------------------------------------- Versi tombol (mode satu-ketukan) ----

function FaseJaga({
  mudah,
  tambahSkor,
  onSelesai,
  onGagal,
}: {
  mudah: boolean
  tambahSkor: (n: number) => void
  onSelesai: () => void
  onGagal: (alasan: string) => void
}) {
  const [ronde, setRonde] = useState(0)
  const [nilai, setNilai] = useState({ kelembapan: 55, suhu: 50, bau: 45 })
  const [pesan, setPesan] = useState<string | null>(null)
  const aktif = RONDE_JAGA[ronde]
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Setiap ronde dimulai, indikator yang bermasalah naik ke nilai masalahnya.
  useEffect(() => {
    const kunci = RONDE_JAGA[ronde].indikator
    const nilaiAwal = RONDE_JAGA[ronde].nilaiAwal
    setNilai((lama) => ({ ...lama, [kunci]: nilaiAwal }))
  }, [ronde])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const pilih = (aksiId: string) => {
    if (aksiId === aktif.benarId) {
      tambahSkor(10)
      benar()
      setNilai((lama) => ({ ...lama, [aktif.indikator]: 55 }))
      setPesan('Tepat! Indikator kembali ke zona aman.')
      timerRef.current = setTimeout(() => {
        if (ronde >= 2) onSelesai()
        else setRonde(ronde + 1)
      }, 700)
    } else {
      salah()
      setPesan(aktif.penjelasanSalah)
      if (mudah) return
      const kunci = aktif.indikator
      const baru = Math.min(100, nilai[kunci] + 5)
      setNilai((lama) => ({ ...lama, [kunci]: baru }))
      if (baru >= 100) {
        timerRef.current = setTimeout(
          () => onGagal('Kotak maggot sudah tidak tertolong: indikatornya melewati batas aman. Ulangi penjagaan kotak dari awal ronde ini.'),
          1200,
        )
      }
    }
  }

  return (
    <section className="aia-card" aria-labelledby="aia-maggot-jaga">
      <span className="aia-kicker">Fase 2 dari 3 · Jaga kotak</span>
      <h3 id="aia-maggot-jaga" className="aia-section-title">
        Jaga kotak maggot
      </h3>
      <p className="aia-muted">
        Ronde {ronde + 1} dari 3: {aktif.label} {aktif.masalah.toLowerCase()} Pilih tindakan yang tepat.
      </p>

      <div className="aia-stack">
        <BarIndikator label="Kelembapan" nilai={nilai.kelembapan} masalah="Terlalu lembap!" ikon={Droplets} />
        <BarIndikator label="Suhu" nilai={nilai.suhu} masalah="Terlalu panas!" ikon={Thermometer} />
        <BarIndikator label="Bau" nilai={nilai.bau} masalah="Bau naik!" ikon={Wind} />
      </div>

      <div className="aia-zone-grid" role="group" aria-label="Pilihan tindakan">
        {aktif.aksi.map((aksi) => {
          const Ikon = IKON_AKSI_JAGA[aksi.id] ?? X
          return (
            <button key={aksi.id} type="button" className="aia-btn aia-btn-ghost aia-btn-block" onClick={() => pilih(aksi.id)}>
              <Ikon aria-hidden="true" /> {aksi.label}
              {mudah && aksi.id === aktif.benarId ? ' · Disarankan' : ''}
            </button>
          )
        })}
      </div>

      {pesan && (
        <p role="status" aria-live="polite">
          {pesan}
        </p>
      )}
    </section>
  )
}

// -------------------------------------------------- Versi gestur: jaga kotak ----

const SKOR_RONDE_JAGA = [34, 33, 33]

function FaseJagaGestur({ tambahSkor, onSelesai, onGagal, onSalah, terjeda = false }: PropsGestur) {
  const spec = INTERAKSI_MISI.maggot[1]
  const [ronde, setRonde] = useState(0)
  const [nilai, setNilai] = useState({ kelembapan: 55, suhu: 50, bau: 45 })
  const [pesan, setPesan] = useState<string | null>(null)
  const [petunjuk, setPetunjuk] = useState<string | null>(null)
  const [efekBenar, setEfekBenar] = useState(false)
  const [salahRonde, setSalahRonde] = useState(0)
  const [terkunci, setTerkunci] = useState(false)
  const [selesai, setSelesai] = useState(false)
  const aktif = RONDE_JAGA[ronde]
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const terakhirRef = useRef<number | null>(null)

  // Setiap ronde dimulai, indikator yang bermasalah naik ke nilai masalahnya.
  useEffect(() => {
    const kunci = RONDE_JAGA[ronde].indikator
    const nilaiAwal = RONDE_JAGA[ronde].nilaiAwal
    setNilai((lama) => ({ ...lama, [kunci]: nilaiAwal }))
    terakhirRef.current = null
  }, [ronde])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const nilaiAkhir = (nilaiBaru: number) => {
    if (terkunci || selesai) return
    if (terakhirRef.current === nilaiBaru) return
    terakhirRef.current = nilaiBaru
    if (nilaiBaru >= 40 && nilaiBaru <= 70) {
      tambahSkor(SKOR_RONDE_JAGA[ronde])
      setNilai((lama) => ({ ...lama, [aktif.indikator]: 55 }))
      setEfekBenar(true)
      setPetunjuk(null)
      setPesan('Tepat! Indikator kembali ke zona aman.')
      setTerkunci(true)
      if (ronde >= 2) {
        setSelesai(true)
        timerRef.current = setTimeout(onSelesai, 900)
      } else {
        timerRef.current = setTimeout(() => {
          setEfekBenar(false)
          setSalahRonde(0)
          setTerkunci(false)
          setRonde(ronde + 1)
        }, 700)
      }
    } else {
      onSalah()
      const baru = salahRonde + 1
      setSalahRonde(baru)
      setPetunjuk(bersihPetunjuk(spec.petunjukMagi))
      setPesan(aktif.penjelasanSalah)
      if (baru >= 3) {
        setTerkunci(true)
        timerRef.current = setTimeout(
          () => onGagal('Kotak maggot sudah tidak tertolong: indikatornya melewati batas aman. Ulangi penjagaan kotak dari awal ronde ini.'),
          1200,
        )
      }
    }
  }

  return (
    <section className="aia-card" aria-labelledby="aia-maggot-jaga" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} label="Indikator aman!" />
      <span className="aia-kicker">Fase 2 dari 3 · Jaga kotak</span>
      <h3 id="aia-maggot-jaga" className="aia-section-title">
        Jaga kotak maggot
      </h3>
      <p className="aia-muted">
        Ronde {ronde + 1} dari 3: {aktif.label} {aktif.masalah.toLowerCase()} Geser tuas sampai jarumnya masuk zona
        hijau 40–70%.
      </p>

      <div className="aia-stack">
        <BarIndikator label="Kelembapan" nilai={nilai.kelembapan} masalah="Terlalu lembap!" ikon={Droplets} />
        <BarIndikator label="Suhu" nilai={nilai.suhu} masalah="Terlalu panas!" ikon={Thermometer} />
        <BarIndikator label="Bau" nilai={nilai.bau} masalah="Bau naik!" ikon={Wind} />
      </div>

      {selesai ? (
        <p role="status" aria-live="polite">
          <Check aria-hidden="true" /> Semua indikator aman. Maggot tenang dan aktif!
        </p>
      ) : (
        <>
          <SliderLever
            key={ronde}
            label={`Atur ${aktif.label.toLowerCase()}`}
            min={0}
            max={100}
            nilaiAwal={aktif.nilaiAwal}
            langkah={1}
            satuan="%"
            disabled={terkunci}
            terjeda={terjeda}
            onUbah={(v) => setNilai((lama) => ({ ...lama, [aktif.indikator]: v }))}
            onSelesai={nilaiAkhir}
          />
          <button
            type="button"
            className="aia-btn aia-btn-primary aia-btn-block"
            disabled={terkunci}
            onClick={() => nilaiAkhir(nilai[aktif.indikator])}
          >
            <Check aria-hidden="true" /> Periksa nilai
          </button>
        </>
      )}

      {petunjuk && <EfekSalah tampil petunjuk={petunjuk} />}

      {pesan && (
        <p role="status" aria-live="polite">
          {pesan}
        </p>
      )}
    </section>
  )
}

// -------------------------------------------------------------- Fase 2: panen ----

// ------------------------------------------- Versi tombol (mode satu-ketukan) ----

function FasePanen({
  tambahSkor,
  onSelesai,
  terjeda = false,
}: {
  tambahSkor: (n: number) => void
  onSelesai: () => void
  /** True saat misi dijeda: hitung mundur dibekukan. */
  terjeda?: boolean
}) {
  const [sisa, setSisa] = useState(20)
  const [dipanen, setDipanen] = useState(false)
  const fakta = useMemo(() => FAKTA_MAGGOT[Math.floor(Math.random() * FAKTA_MAGGOT.length)], [])
  // Cermin terjeda untuk dibaca di dalam tick interval (hindari closure basi).
  const terjedaRef = useRef(terjeda)

  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  useEffect(() => {
    if (sisa <= 0) return
    const t = setInterval(() => {
      if (terjedaRef.current) return
      setSisa((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [sisa])

  useEffect(() => {
    if (sisa > 0 && sisa <= 5) tik(sisa <= 3)
  }, [sisa])

  const panenSekarang = () => {
    if (sisa > 0 || dipanen) return
    setDipanen(true)
    tambahSkor(10)
    panen()
    koin()
  }

  return (
    <section className="aia-card" aria-labelledby="aia-maggot-panen">
      <span className="aia-kicker">Fase 3 dari 3 · Panen</span>
      <h3 id="aia-maggot-panen" className="aia-section-title">
        Panen maggot
      </h3>

      {!dipanen ? (
        <>
          <p className="aia-muted">Maggot sedang makan dengan lahap. Tunggu timer selesai, lalu ketuk Panen.</p>
          <p style={{ fontSize: 44, fontWeight: 800, textAlign: 'center', margin: '8px 0' }} aria-live="polite">
            0:{sisa.toString().padStart(2, '0')}
          </p>
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={20 - sisa}
            aria-valuemin={0}
            aria-valuemax={20}
            aria-label="Waktu menuju panen"
          >
            <span style={{ width: `${((20 - sisa) / 20) * 100}%` }} />
          </div>
          <div className="aia-actions">
            <button
              type="button"
              className="aia-btn aia-btn-primary aia-btn-block"
              disabled={sisa > 0}
              onClick={panenSekarang}
            >
              <Sprout aria-hidden="true" /> {sisa > 0 ? `Panen (tunggu ${sisa} detik)` : 'Panen sekarang!'}
            </button>
          </div>
          <p className="aia-muted">
            <Bug aria-hidden="true" /> Maggot bergerak-gerak di dalam kotak. Sabar, sebentar lagi panen.
          </p>
        </>
      ) : (
        <>
          <p role="status" aria-live="polite">
            <Check aria-hidden="true" /> Panen berhasil! Maggot jadi pakan ikan, kasgotnya jadi pupuk kebun.
          </p>
          <p>
            <Fish aria-hidden="true" /> Pakan ikan <strong>→</strong> <Sprout aria-hidden="true" /> masuk ke kebun.
          </p>
          <div className="aia-card" aria-label="Kartu fakta maggot">
            <span className="aia-kicker">Kartu fakta · Maggot BSF</span>
            <h4 className="aia-section-title">{fakta.judul}</h4>
            <p className="aia-muted">{fakta.isi}</p>
          </div>
          <div className="aia-actions">
            <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={onSelesai}>
              <Check aria-hidden="true" /> Selesai
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// -------------------------------------------------- Versi gestur: panen ----

function FasePanenGestur({
  tambahSkor,
  onSelesai,
  terjeda = false,
}: Pick<PropsGestur, 'tambahSkor' | 'onSelesai'> & { terjeda?: boolean }) {
  const [sisa, setSisa] = useState(20)
  const [siap, setSiap] = useState(false)
  const [dipanen, setDipanen] = useState(false)
  const [petunjuk, setPetunjuk] = useState<string | null>(null)
  const fakta = useMemo(() => FAKTA_MAGGOT[Math.floor(Math.random() * FAKTA_MAGGOT.length)], [])
  const spec = INTERAKSI_MISI.maggot[2]
  // Cermin terjeda untuk dibaca di dalam tick interval (hindari closure basi).
  const terjedaRef = useRef(terjeda)

  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  useEffect(() => {
    if (sisa <= 0) return
    const t = setInterval(() => {
      if (terjedaRef.current) return
      setSisa((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [sisa])

  useEffect(() => {
    if (sisa > 0 && sisa <= 5) tik(sisa <= 3)
  }, [sisa])

  useEffect(() => {
    if (sisa === 0) setSiap(true)
  }, [sisa])

  const ayakSelesai = () => {
    tambahSkor(100)
    panen()
    setDipanen(true)
  }

  const ayakBatal = () => {
    setPetunjuk(bersihPetunjuk(spec.petunjukMagi))
  }

  return (
    <section className="aia-card" aria-labelledby="aia-maggot-panen">
      <span className="aia-kicker">Fase 3 dari 3 · Panen</span>
      <h3 id="aia-maggot-panen" className="aia-section-title">
        Panen maggot
      </h3>

      {!dipanen ? (
        <>
          <p className="aia-muted">
            Maggot sedang makan dengan lahap. Tunggu timer selesai, lalu tahan saringan untuk mengayak maggot dari
            kasgot.
          </p>
          <p style={{ fontSize: 44, fontWeight: 800, textAlign: 'center', margin: '8px 0' }} aria-live="polite">
            0:{sisa.toString().padStart(2, '0')}
          </p>
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={20 - sisa}
            aria-valuemin={0}
            aria-valuemax={20}
            aria-label="Waktu menuju panen"
          >
            <span style={{ width: `${((20 - sisa) / 20) * 100}%` }} />
          </div>
          {siap ? (
            <>
              <HoldAction
                label="Tahan saringan untuk mengayak"
                durasiMs={2000}
                ikon={<Fish aria-hidden="true" />}
                terjeda={terjeda}
                onSelesai={ayakSelesai}
                onBatal={ayakBatal}
              />
              {petunjuk && <PetunjukMagi teks={petunjuk} />}
            </>
          ) : (
            <p className="aia-muted">
              <Bug aria-hidden="true" /> Maggot bergerak-gerak di dalam kotak. Sabar, sebentar lagi panen.
            </p>
          )}
        </>
      ) : (
        <>
          <p role="status" aria-live="polite">
            <Check aria-hidden="true" /> Panen berhasil! Maggot jadi pakan ikan, kasgotnya jadi pupuk kebun.
          </p>
          <p>
            <Fish aria-hidden="true" /> Pakan ikan <strong>→</strong> <Sprout aria-hidden="true" /> masuk ke kebun.
          </p>
          <div className="aia-card" aria-label="Kartu fakta maggot">
            <span className="aia-kicker">Kartu fakta · Maggot BSF</span>
            <h4 className="aia-section-title">{fakta.judul}</h4>
            <p className="aia-muted">{fakta.isi}</p>
          </div>
          <div className="aia-actions">
            <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={onSelesai}>
              <Check aria-hidden="true" /> Selesai
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// ------------------------------------------------------------------ Komponen utama ----

export function ZonaMaggot({
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
  terjeda = false,
}: MiniGameSlotProps & { modeSatuKetukan?: boolean }) {
  const { save, dispatch } = useCampaign()
  // Fase = tahap yang sedang dimainkan (dipilih kerangka bab).
  const fase = stageIndex
  const [skor, setSkor] = useState(0)
  const [skorFase, setSkorFase] = useState(0)
  const [gagal, setGagal] = useState(0)
  const [mudah, setMudah] = useState(false)
  const [alasanGagal, setAlasanGagal] = useState<string | null>(null)
  const [percobaan, setPercobaan] = useState(0)
  const [salahGestur, setSalahGestur] = useState(0)
  const selesaiRef = useRef(false)

  const tambahSkor = (n: number) => {
    setSkor((s) => s + n)
    setSkorFase((s) => s + n)
  }

  const gagalFase = (alasan: string) => {
    nyawa()
    setSkor((s) => Math.max(0, s - skorFase))
    setSkorFase(0)
    setGagal((g) => g + 1)
    setAlasanGagal(alasan)
  }

  const ulangFase = () => {
    setPercobaan((p) => p + 1)
    setAlasanGagal(null)
  }

  const modeMudah = () => {
    setMudah(true)
    ulangFase()
  }

  const salahAksi = () => {
    setSalahGestur((g) => g + 1)
  }

  const perbesarTarget = salahGestur >= 2 || mudah

  const selesaiFase = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    // Bonus rapor hanya sekali, di tahap terakhir saat pertama kali selesai.
    if (stageIndex === 2 && save.chapters.maggot.stages[2].status !== 'done') {
      dispatch({ type: 'SET_REPORT', patch: { hijau: save.report.hijau + 10 } })
    }
    onStageComplete(skor)
  }

  return (
    <div className="aia-stack">
      <div className="aia-progress-row">
        <span className="aia-kicker" style={{ marginBottom: 0 }}>
          Pos Maggot · Fase {Math.min(fase + 1, 3)} dari 3
        </span>
        <span>
          <Coins aria-hidden="true" /> {skor} Koin Hijau
        </span>
        <TombolBisukan />
      </div>
      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={fase}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label="Progres fase Pos Maggot"
      >
        <span style={{ width: `${(fase / 3) * 100}%` }} />
      </div>

      {save.carryover.maggotKenaMinyak && (
        <p className="aia-chip" role="alert">
          <AlertTriangle aria-hidden="true" /> Maggot kena minyak dari kantin — pulihkan dengan pakan bersih di fase
          pertama.
        </p>
      )}

      {alasanGagal ? (
        <LayarGagal alasan={alasanGagal} gagal={gagal} onUlang={ulangFase} onMudah={modeMudah} />
      ) : modeSatuKetukan ? (
        fase === 0 ? (
          <FasePakan key={`pakan-${percobaan}`} mudah={mudah} tambahSkor={tambahSkor} onSelesai={selesaiFase} onGagal={gagalFase} />
        ) : fase === 1 ? (
          <FaseJaga key={`jaga-${percobaan}`} mudah={mudah} tambahSkor={tambahSkor} onSelesai={selesaiFase} onGagal={gagalFase} />
        ) : (
          <FasePanen key={`panen-${percobaan}`} tambahSkor={tambahSkor} onSelesai={selesaiFase} terjeda={terjeda} />
        )
      ) : fase === 0 ? (
        <FasePakanGestur
          key={`pakan-g-${percobaan}`}
          tambahSkor={tambahSkor}
          onSelesai={selesaiFase}
          onGagal={gagalFase}
          onSalah={salahAksi}
          perbesarTarget={perbesarTarget}
          terjeda={terjeda}
        />
      ) : fase === 1 ? (
        <FaseJagaGestur
          key={`jaga-g-${percobaan}`}
          tambahSkor={tambahSkor}
          onSelesai={selesaiFase}
          onGagal={gagalFase}
          onSalah={salahAksi}
          perbesarTarget={perbesarTarget}
          terjeda={terjeda}
        />
      ) : (
        <FasePanenGestur key={`panen-g-${percobaan}`} tambahSkor={tambahSkor} onSelesai={selesaiFase} terjeda={terjeda} />
      )}

      <p className="aia-muted">
        <Sun aria-hidden="true" /> {NAMA_FASE[fase]} · Aksi benar menambah Koin Hijau.
      </p>
    </div>
  )
}
