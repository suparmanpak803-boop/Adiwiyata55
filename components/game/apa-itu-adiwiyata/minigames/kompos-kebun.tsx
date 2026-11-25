'use client'

// Mini-game Bab 4 "Kompos dan Kebun" — dipakai per tahap, stageIndex memilih
// fase: 0 Susun lapis kompos -> 1 Rawat tanaman -> 2 Panen sayur. Tiap tahap
// memanggil onStageComplete TEPAT SATU KALI dengan skor tahap itu (0–100).
// Mode gestur (default): SusunMenara / SiramRitme / PanenKetuk dari pustaka
// interaksi (perbaikan kompos bau tetap TapSpam). Mode satu-ketukan (prop modeSatuKetukan): versi tombol lama dipakai sebagai
// alternatif aksesibilitas. Gagal di satu tahap menampilkan layar "Coba lagi"
// internal (hanya tahap itu yang diulang); setelah 2x salah, target membesar
// (kesulitan adaptif).

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Coins,
  Droplets,
  GitBranch,
  Leaf,
  Package,
  RefreshCw,
  RotateCcw,
  Salad,
  Sprout,
  Sun,
  Volume2,
  VolumeX,
  Wheat,
  Wind,
} from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import type { MiniGameSlotProps } from '../misi-shell'
import {
  EfekBenar,
  EfekSalah,
  PanenKetuk,
  PetunjukMagi,
  SiramRitme,
  SusunMenara,
  TanganPenunjuk,
  TapSpam,
} from '../interaksi'
import type { LapisanMenara, ObjekPanen } from '../interaksi'
import {
  benar,
  koin,
  nyawa,
  panen,
  salah,
  setSuaraMuted,
  siram,
  tumbuh,
} from '../suara'

const NAMA_FASE = ['Susun lapis kompos', 'Rawat tanaman', 'Panen sayur']

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
      <p className="aia-muted">Kamu sudah gagal {gagal} kali di fase ini. Tenang, kebunnya masih menunggu.</p>
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

// --------------------------------------------------- Fase 0: lapis kompos ----

type JenisBahan = 'cokelat' | 'hijau'

interface Bahan {
  id: string
  nama: string
  jenis: JenisBahan
}

const BAHAN: Bahan[] = [
  { id: 'daun', nama: 'Daun kering', jenis: 'cokelat' },
  { id: 'kardus', nama: 'Kardus sobek', jenis: 'cokelat' },
  { id: 'ranting', nama: 'Ranting', jenis: 'cokelat' },
  { id: 'sayur', nama: 'Sisa sayur', jenis: 'hijau' },
  { id: 'rumput', nama: 'Potongan rumput', jenis: 'hijau' },
]

const IKON_BAHAN: Record<string, typeof Leaf> = {
  daun: Leaf,
  kardus: Package,
  ranting: GitBranch,
  sayur: Salad,
  rumput: Sprout,
}

const TARGET_LAPIS = 8
// B-18: rasio 3 cokelat : 1 hijau diterapkan sungguhan — dari 8 lapis,
// paling banyak 2 lapis hijau (6 cokelat : 2 hijau = 3 : 1).
const MAKS_HIJAU = TARGET_LAPIS / 4

// Urutan 8 lapis untuk SusunMenara: cokelat dan hijau berselang-seling,
// memakai 5 bahan lama (id unik per lapis supaya kartu kandidat tidak tertukar).
const URUTAN_LAPIS: LapisanMenara[] = [
  { id: 'lapis-1', label: 'Daun kering', jenis: 'cokelat', ikon: <Leaf aria-hidden="true" /> },
  { id: 'lapis-2', label: 'Sisa sayur', jenis: 'hijau', ikon: <Salad aria-hidden="true" /> },
  { id: 'lapis-3', label: 'Kardus sobek', jenis: 'cokelat', ikon: <Package aria-hidden="true" /> },
  { id: 'lapis-4', label: 'Potongan rumput', jenis: 'hijau', ikon: <Sprout aria-hidden="true" /> },
  { id: 'lapis-5', label: 'Ranting', jenis: 'cokelat', ikon: <GitBranch aria-hidden="true" /> },
  { id: 'lapis-6', label: 'Sisa sayur', jenis: 'hijau', ikon: <Salad aria-hidden="true" /> },
  { id: 'lapis-7', label: 'Daun kering', jenis: 'cokelat', ikon: <Leaf aria-hidden="true" /> },
  { id: 'lapis-8', label: 'Potongan rumput', jenis: 'hijau', ikon: <Sprout aria-hidden="true" /> },
]

// ------------------------------------------- Versi tombol (mode satu-ketukan) ----

function FaseLapis({
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
  const [perluPerbaikan, setPerluPerbaikan] = useState(save.carryover.komposBau)
  const [perbaikan, setPerbaikan] = useState({ cokelat: false, aduk: false })
  const [lapis, setLapis] = useState<JenisBahan[]>([])
  const [ditolak, setDitolak] = useState(0)
  const [pesan, setPesan] = useState<string | null>(
    save.carryover.komposBau
      ? 'Kompos bau! Maggot kemarin memberi pakan yang salah. Perbaiki dulu sebelum menyusun lapis baru.'
      : null,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const jumlahCokelat = lapis.filter((l) => l === 'cokelat').length
  const jumlahHijau = lapis.filter((l) => l === 'hijau').length
  const batasTolak = mudah ? 5 : 3

  const perbaiki = (aksi: 'cokelat' | 'aduk') => {
    const baru = { ...perbaikan, [aksi]: true }
    setPerbaikan(baru)
    if (aksi === 'cokelat') setPesan('Bahan cokelat ditambahkan. Sekarang aduk supaya udara masuk.')
    else setPesan('Kompos diaduk, udara masuk. Baunya mulai hilang.')
    if (baru.cokelat && baru.aduk) {
      dispatch({ type: 'SET_CARRYOVER', patch: { komposBau: false } })
      setPerluPerbaikan(false)
      setPesan('Kompos sudah tidak bau lagi. Sekarang susun lapisnya!')
    }
  }

  const tambah = (bahan: Bahan) => {
    if (perluPerbaikan || lapis.length >= TARGET_LAPIS) return
    // B-18: rasio sungguhan — tolak bahan hijau bila kuota hijaunya sudah
    // habis (2 dari 8 lapis), supaya hasil akhir benar-benar 3 : 1.
    if (bahan.jenis === 'hijau' && jumlahHijau >= MAKS_HIJAU) {
      salah()
      const tolakBaru = ditolak + 1
      setDitolak(tolakBaru)
      setPesan(
        'Rasio kompos 3 cokelat : 1 hijau — lapis hijaunya sudah cukup (2 dari 8). Tambah bahan cokelat, lapis ini tidak dihitung.',
      )
      if (tolakBaru >= batasTolak) {
        timerRef.current = setTimeout(
          () => onGagal('Kompos terlalu sering salah lapis dan jadi becek. Ulangi susunan dari awal, ingat rasio 3 cokelat : 1 hijau.'),
          1200,
        )
      }
      return
    }
    const baru = [...lapis, bahan.jenis]
    setLapis(baru)
    tambahSkor(10)
    benar()
    setPesan(
      bahan.jenis === 'cokelat'
        ? `${bahan.nama} ditambahkan. Bahan cokelat memberi udara dan karbon.`
        : `${bahan.nama} ditambahkan. Bahan hijau memberi nitrogen untuk pengurai.`,
    )
    if (baru.length === TARGET_LAPIS) {
      timerRef.current = setTimeout(onSelesai, 700)
    }
  }

  return (
    <section className="aia-card" aria-labelledby="aia-kompos-lapis">
      <span className="aia-kicker">Fase 1 dari 3 · Susun lapis kompos</span>
      <h3 id="aia-kompos-lapis" className="aia-section-title">
        Susun lapis kompos
      </h3>
      <p className="aia-muted">
        Ketuk bahan untuk menyusun {TARGET_LAPIS} lapis ke bak kompos. Target rasio 3 cokelat : 1 hijau —
        paling banyak {MAKS_HIJAU} lapis hijau dari {TARGET_LAPIS} lapis.
      </p>

      {perluPerbaikan ? (
        <>
          <p className="aia-chip" role="alert">
            <AlertTriangle aria-hidden="true" /> Kompos bau! Perbaiki dulu dengan 2 aksi ini.
          </p>
          <div className="aia-zone-grid" role="group" aria-label="Perbaiki kompos bau">
            <button
              type="button"
              className="aia-btn aia-btn-ghost aia-btn-block"
              disabled={perbaikan.cokelat}
              onClick={() => perbaiki('cokelat')}
            >
              <Leaf aria-hidden="true" /> Tambah bahan cokelat {perbaikan.cokelat ? '· Sudah' : ''}
            </button>
            <button
              type="button"
              className="aia-btn aia-btn-ghost aia-btn-block"
              disabled={perbaikan.aduk}
              onClick={() => perbaiki('aduk')}
            >
              <RefreshCw aria-hidden="true" /> Aduk {perbaikan.aduk ? '· Sudah' : ''}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="aia-progress-row">
            <span>Rasio lapis</span>
            <strong>
              Cokelat {jumlahCokelat} · Hijau {jumlahHijau} · Target 3 : 1
            </strong>
          </div>
          <div
            style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: '#e8ede6' }}
            role="progressbar"
            aria-valuenow={lapis.length}
            aria-valuemin={0}
            aria-valuemax={TARGET_LAPIS}
            aria-label={`Lapis kompos ${lapis.length} dari ${TARGET_LAPIS}`}
          >
            <span style={{ width: `${(jumlahCokelat / TARGET_LAPIS) * 100}%`, background: '#8b5a2b' }} />
            <span style={{ width: `${(jumlahHijau / TARGET_LAPIS) * 100}%`, background: '#4d8a4f' }} />
          </div>

          <div
            style={{
              border: '2px solid #8d6e63',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#f5efe6',
              minHeight: 32,
              display: 'flex',
              flexDirection: 'column-reverse',
            }}
            aria-label="Bak kompos"
          >
            {lapis.length === 0 ? (
              <p className="aia-muted" style={{ textAlign: 'center', margin: '4px 0' }}>
                Bak masih kosong.
              </p>
            ) : (
              lapis.map((jenis, i) => (
                <div key={i} style={{ height: 16, background: jenis === 'cokelat' ? '#8b5a2b' : '#4d8a4f' }} />
              ))
            )}
          </div>
          <p className="aia-muted">
            Lapis: {lapis.length}/{TARGET_LAPIS}
            {mudah && jumlahHijau >= MAKS_HIJAU ? ' · Sebaiknya tambah bahan cokelat sekarang.' : ''}
          </p>

          <div className="aia-zone-grid" role="group" aria-label="Pilihan bahan kompos">
            {BAHAN.map((bahan) => {
              const Ikon = IKON_BAHAN[bahan.id]
              return (
                <button
                  key={bahan.id}
                  type="button"
                  className="aia-btn aia-btn-ghost aia-btn-block"
                  disabled={lapis.length >= TARGET_LAPIS}
                  onClick={() => tambah(bahan)}
                >
                  <Ikon aria-hidden="true" /> {bahan.nama}
                  {mudah && bahan.jenis === 'cokelat' && jumlahHijau >= MAKS_HIJAU ? ' · Disarankan' : ''}
                </button>
              )
            })}
          </div>
        </>
      )}

      {pesan && (
        <p role="status" aria-live="polite">
          {pesan}
        </p>
      )}
    </section>
  )
}

// ------------------------------------------------- Versi gestur: lapis kompos ----
// SusunMenara: ketuk kandidat lapisan yang benar; cokelat dan hijau
// berselang-seling sampai 8 lapis. SusunMenara tidak melaporkan ketukan salah
// ke luar (efek salah tampil di dalam komponen), jadi petunjuk Magi
// ditampilkan sebagai petunjuk tetap di bawah judul. Perbaikan kompos bau
// (carryover) tetap dua langkah seperti versi lama — tambah bahan cokelat lalu
// aduk — keduanya kini TapSpam supaya tidak ada lagi DragDrop di file ini.

function FaseLapisGestur({ tambahSkor, onSelesai, perbesarTarget, terjeda = false }: PropsGestur) {
  const { save, dispatch } = useCampaign()
  const spec = INTERAKSI_MISI.kompos[0]
  const [perluPerbaikan, setPerluPerbaikan] = useState(save.carryover.komposBau)
  const [tahapPerbaiki, setTahapPerbaiki] = useState<'cokelat' | 'aduk'>('cokelat')
  const [pesan, setPesan] = useState<string | null>(
    save.carryover.komposBau
      ? 'Kompos bau! Maggot kemarin memberi pakan yang salah. Perbaiki dulu sebelum menyusun lapis baru.'
      : null,
  )
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

  const perbaikiCokelatSelesai = () => {
    setPesan('Bahan cokelat ditambahkan. Sekarang aduk supaya udara masuk.')
    setTahapPerbaiki('aduk')
  }

  const perbaikiAdukSelesai = () => {
    dispatch({ type: 'SET_CARRYOVER', patch: { komposBau: false } })
    setPerluPerbaikan(false)
    setPesan('Kompos sudah tidak bau lagi. Sekarang susun lapisnya!')
  }

  const selesaiMenara = (skorAkhir: number) => {
    if (diprosesRef.current) return
    diprosesRef.current = true
    tambahSkor(skorAkhir)
    setEfekBenar(true)
    setPesan(spec.hasilBenar)
    setSelesai(true)
    timerRef.current = setTimeout(onSelesai, 900)
  }

  return (
    <section className="aia-card" aria-labelledby="aia-kompos-lapis" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} label="Lapis tersusun!" />
      <span className="aia-kicker">Fase 1 dari 3 · Susun lapis kompos</span>
      <h3 id="aia-kompos-lapis" className="aia-section-title">
        Susun lapis kompos
      </h3>
      <p className="aia-muted">
        Ketuk lapisan yang benar untuk menumpuknya — cokelat dan hijau berselang-seling — sampai {TARGET_LAPIS}{' '}
        lapis.
      </p>

      {perluPerbaikan ? (
        <>
          <p className="aia-chip" role="alert">
            <AlertTriangle aria-hidden="true" /> Kompos bau! Perbaiki dulu dengan 2 aksi ini.
          </p>
          {tahapPerbaiki === 'cokelat' ? (
            <TapSpam
              label="Tambah bahan cokelat"
              jumlahKetukan={5}
              ikon={<Leaf aria-hidden="true" />}
              terjeda={terjeda}
              onSelesai={perbaikiCokelatSelesai}
            />
          ) : (
            <TapSpam
              label="Aduk kompos"
              jumlahKetukan={5}
              ikon={<RefreshCw aria-hidden="true" />}
              terjeda={terjeda}
              onSelesai={perbaikiAdukSelesai}
            />
          )}
        </>
      ) : (
        <>
          {spec.tutorial && !selesai && (
            <p style={{ textAlign: 'center', margin: '4px 0' }}>
              <TanganPenunjuk label="Ketuk lapisan yang benar untuk menumpuknya" />
            </p>
          )}

          <PetunjukMagi teks={bersihPetunjuk(spec.petunjukMagi)} />

          <SusunMenara
            lapisan={URUTAN_LAPIS}
            modeSatuKetukan={perbesarTarget}
            disabled={selesai}
            terjeda={terjeda}
            onSelesai={selesaiMenara}
          />
        </>
      )}

      {pesan && (
        <p role="status" aria-live="polite">
          {pesan}
        </p>
      )}
    </section>
  )
}

// -------------------------------------------------- Fase 1: rawat tanaman ----

type TanamanId = 'cabai' | 'kangkung'
type AksiRawat = 'siram' | 'jemur' | 'pupuk'

interface RondeRawat {
  tanaman: TanamanId
  kebutuhan: AksiRawat
  teks: string
  penjelasanSalah: string
}

const RONDE_RAWAT: RondeRawat[] = [
  {
    tanaman: 'cabai',
    kebutuhan: 'siram',
    teks: 'Cabai haus!',
    penjelasanSalah: 'Cabai sedang haus, bukan butuh cahaya atau pupuk. Siram dulu.',
  },
  {
    tanaman: 'kangkung',
    kebutuhan: 'jemur',
    teks: 'Kangkung kurang cahaya!',
    penjelasanSalah: 'Kangkung butuh cahaya matahari, bukan air atau pupuk sekarang.',
  },
  {
    tanaman: 'cabai',
    kebutuhan: 'pupuk',
    teks: 'Cabai butuh pupuk kasgot!',
    penjelasanSalah: 'Cabai sudah cukup air dan cahaya. Sekarang ia butuh pupuk kasgot dari maggot.',
  },
]

const AKSI_RAWAT: { id: AksiRawat; label: string }[] = [
  { id: 'siram', label: 'Siram' },
  { id: 'jemur', label: 'Jemur' },
  { id: 'pupuk', label: 'Beri pupuk kasgot' },
]

const IKON_AKSI_RAWAT: Record<AksiRawat, typeof Droplets> = {
  siram: Droplets,
  jemur: Sun,
  pupuk: Wheat,
}

function KartuTanaman({
  nama,
  sehat,
  butuh,
}: {
  nama: string
  sehat: number
  butuh: string | null
}) {
  return (
    <div className="aia-card" aria-label={`Tanaman ${nama}`}>
      <strong>
        <Sprout aria-hidden="true" /> {nama}
      </strong>
      <p className="aia-muted" style={{ margin: '4px 0' }}>
        {butuh ?? 'Segar.'}
      </p>
      <p aria-label={`Kesehatan ${nama}: ${sehat} dari 3`}>
        {[0, 1, 2].map((i) => (
          <Leaf key={i} aria-hidden="true" style={{ color: i < sehat ? '#2e7d32' : '#c8cfc4' }} />
        ))}
      </p>
    </div>
  )
}

// ------------------------------------------- Versi tombol (mode satu-ketukan) ----

function FaseTanaman({
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
  const sehatAwal = 3
  const [ronde, setRonde] = useState(0)
  const [sehat, setSehat] = useState<Record<TanamanId, number>>({ cabai: sehatAwal, kangkung: sehatAwal })
  const [pesan, setPesan] = useState<string | null>(null)
  // B-10: kunci jawaban begitu satu jawaban benar dipilih — selama jeda
  // 700 ms menuju ronde berikutnya, tombol tidak boleh diklik lagi
  // (klik ganda memberi skor dua kali; klik salah bisa memicu timer
  // onGagal yang berlomba dengan onSelesai).
  const [terkunci, setTerkunci] = useState(false)
  const aktif = RONDE_RAWAT[ronde]
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const pilih = (aksi: AksiRawat) => {
    if (terkunci) return
    if (aksi === 'siram') siram()
    if (aksi === aktif.kebutuhan) {
      setTerkunci(true)
      tambahSkor(10)
      benar()
      tumbuh()
      setPesan(
        aktif.kebutuhan === 'siram'
          ? 'Cabai disiram, daunnya segar lagi.'
          : aktif.kebutuhan === 'jemur'
            ? 'Kangkung dijemur, daunnya menghadap matahari.'
            : 'Pupuk kasgot diberikan. Cabai punya makanan untuk berbuah.',
      )
      timerRef.current = setTimeout(() => {
        if (ronde >= 2) {
          onSelesai()
        } else {
          setTerkunci(false)
          setRonde(ronde + 1)
        }
      }, 700)
    } else {
      salah()
      const sisa = sehat[aktif.tanaman] - 1
      setSehat((lama) => ({ ...lama, [aktif.tanaman]: Math.max(0, sisa) }))
      setPesan(aktif.penjelasanSalah)
      if (mudah) return
      if (sisa <= 0) {
        timerRef.current = setTimeout(
          () => onGagal(`${aktif.tanaman === 'cabai' ? 'Cabai' : 'Kangkung'} layu total karena salah dirawat. Ulangi perawatan dari awal ronde ini.`),
          1200,
        )
      }
    }
  }

  return (
    <section className="aia-card" aria-labelledby="aia-kompos-tanaman">
      <span className="aia-kicker">Fase 2 dari 3 · Rawat tanaman</span>
      <h3 id="aia-kompos-tanaman" className="aia-section-title">
        Rawat tanaman
      </h3>
      <p className="aia-muted">
        Ronde {ronde + 1} dari 3. Perhatikan apa yang dibutuhkan tanaman, lalu pilih tindakan yang tepat.
      </p>

      <div className="aia-zone-grid">
        <KartuTanaman
          nama="Cabai"
          sehat={sehat.cabai}
          butuh={aktif.tanaman === 'cabai' ? aktif.teks : null}
        />
        <KartuTanaman
          nama="Kangkung"
          sehat={sehat.kangkung}
          butuh={aktif.tanaman === 'kangkung' ? aktif.teks : null}
        />
      </div>

      <p role="status" aria-live="polite">
        <strong>{aktif.teks}</strong>
      </p>

      <div className="aia-zone-grid" role="group" aria-label="Pilihan tindakan perawatan">
        {AKSI_RAWAT.map((aksi) => {
          const Ikon = IKON_AKSI_RAWAT[aksi.id]
          return (
            <button key={aksi.id} type="button" className="aia-btn aia-btn-ghost aia-btn-block" disabled={terkunci} onClick={() => pilih(aksi.id)}>
              <Ikon aria-hidden="true" /> {aksi.label}
              {mudah && aksi.id === aktif.kebutuhan ? ' · Disarankan' : ''}
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

// ------------------------------------------------- Versi gestur: rawat tanaman ----
// SiramRitme: ketuk tombol besar tepat pada ketukan metronom (8 ketukan per
// ronde, 3 ronde). Skor ronde di bawah 60 berarti perawatan meleset: tanaman
// kehilangan 1 daun dan ronde yang sama diulang; daun habis berarti layu total
// ("Coba lagi"). SiramRitme tidak melaporkan ketukan yang meleset satu per
// satu, jadi kesehatan dihitung dari skor ronde.

const SKOR_RONDE_RAWAT = [34, 33, 33]

function FaseTanamanGestur({ tambahSkor, onSelesai, onGagal, onSalah, perbesarTarget, terjeda = false }: PropsGestur) {
  const { save, dispatch } = useCampaign()
  const spec = INTERAKSI_MISI.kompos[1]
  const sehatAwal = 3
  const [ronde, setRonde] = useState(0)
  const [ulangan, setUlangan] = useState(0)
  const [sehat, setSehat] = useState<Record<TanamanId, number>>({ cabai: sehatAwal, kangkung: sehatAwal })
  const [pesan, setPesan] = useState<string | null>(null)
  const [petunjuk, setPetunjuk] = useState<string | null>(null)
  const [efekBenar, setEfekBenar] = useState(false)
  const [selesai, setSelesai] = useState(false)
  const [terkunci, setTerkunci] = useState(false)
  const aktif = RONDE_RAWAT[ronde]
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const diprosesRef = useRef(false)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const selesaiRonde = (skorRonde: number) => {
    if (diprosesRef.current) return
    diprosesRef.current = true
    setTerkunci(true)
    if (skorRonde >= 60) {
      tambahSkor(Math.round((SKOR_RONDE_RAWAT[ronde] * skorRonde) / 100))
      if (aktif.kebutuhan === 'siram') siram()
      tumbuh()
      setEfekBenar(true)
      setPetunjuk(null)
      setPesan(spec.hasilBenar)
      if (ronde >= 2) {
        setSelesai(true)
        timerRef.current = setTimeout(() => {
          onSelesai()
        }, 900)
      } else {
        timerRef.current = setTimeout(() => {
          setEfekBenar(false)
          diprosesRef.current = false
          setTerkunci(false)
          setRonde(ronde + 1)
        }, 900)
      }
      return
    }
    onSalah()
    const sisa = sehat[aktif.tanaman] - 1
    setSehat((lama) => ({ ...lama, [aktif.tanaman]: Math.max(0, sisa) }))
    setPetunjuk(bersihPetunjuk(spec.petunjukMagi))
    setPesan(aktif.penjelasanSalah)
    if (sisa <= 0) {
      timerRef.current = setTimeout(
        () =>
          onGagal(
            `${aktif.tanaman === 'cabai' ? 'Cabai' : 'Kangkung'} layu total karena salah dirawat. Ulangi perawatan dari awal ronde ini.`,
          ),
        1200,
      )
      return
    }
    timerRef.current = setTimeout(() => {
      diprosesRef.current = false
      setTerkunci(false)
      setUlangan((u) => u + 1)
    }, 1200)
  }

  return (
    <section className="aia-card" aria-labelledby="aia-kompos-tanaman" style={{ position: 'relative' }}>
      <EfekBenar tampil={efekBenar} label="Tanaman segar!" />
      <span className="aia-kicker">Fase 2 dari 3 · Rawat tanaman</span>
      <h3 id="aia-kompos-tanaman" className="aia-section-title">
        Rawat tanaman
      </h3>
      <p className="aia-muted">
        Ronde {ronde + 1} dari 3. Ketuk tombol besar tepat pada ketukan metronom untuk merawat tanaman — 8 ketukan
        per ronde.
      </p>

      <div className="aia-zone-grid">
        <KartuTanaman
          nama="Cabai"
          sehat={sehat.cabai}
          butuh={aktif.tanaman === 'cabai' ? aktif.teks : null}
        />
        <KartuTanaman
          nama="Kangkung"
          sehat={sehat.kangkung}
          butuh={aktif.tanaman === 'kangkung' ? aktif.teks : null}
        />
      </div>

      <p role="status" aria-live="polite">
        <strong>{aktif.teks}</strong>
      </p>

      {selesai ? (
        <p role="status" aria-live="polite">
          <Check aria-hidden="true" /> Semua tanaman segar kembali!
        </p>
      ) : (
        <SiramRitme
          key={`${ronde}-${ulangan}`}
          ketukan={8}
          tempoBpm={80}
          modeSatuKetukan={perbesarTarget}
          disabled={terkunci}
          terjeda={terjeda}
          onSelesai={selesaiRonde}
        />
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

// ---------------------------------------------------- Fase 2: panen sayur ----

const SAYUR = ['Cabai merah', 'Kangkung', 'Tomat', 'Bayam', 'Terong', 'Sawi']

// Objek untuk PanenKetuk: 6 sayur matang lama + 3 sayur muda yang belum
// matang sebagai pengecoh (ketuk hanya yang matang).
const OBJEK_PANEN: ObjekPanen[] = [
  ...SAYUR.map((nama) => ({ id: nama, label: nama, matang: true, ikon: <Sprout aria-hidden="true" /> })),
  { id: 'cabai-kecil', label: 'Cabai kecil', matang: false, ikon: <Sprout aria-hidden="true" /> },
  { id: 'tomat-hijau', label: 'Tomat hijau', matang: false, ikon: <Sprout aria-hidden="true" /> },
  { id: 'bayam-muda', label: 'Bayam muda', matang: false, ikon: <Sprout aria-hidden="true" /> },
]

// ------------------------------------------- Versi tombol (mode satu-ketukan) ----

function FasePanenSayur({
  tambahSkor,
  onSelesai,
  terjeda = false,
}: {
  tambahSkor: (n: number) => void
  onSelesai: () => void
  /** True saat misi dijeda: pematangan sayur dibekukan. */
  terjeda?: boolean
}) {
  const [matang, setMatang] = useState(0)
  const [dipanen, setDipanen] = useState<number[]>([])
  const [selesaiPanen, setSelesaiPanen] = useState(false)
  const [pesan, setPesan] = useState<string | null>('Sayur sedang tumbuh. Tunggu sampai matang, lalu ketuk untuk memanen.')
  // Cermin terjeda untuk dibaca di dalam tick interval (hindari closure basi).
  const terjedaRef = useRef(terjeda)

  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  useEffect(() => {
    if (matang >= SAYUR.length) return
    const t = setInterval(() => {
      if (terjedaRef.current) return
      setMatang((m) => {
        if (m >= SAYUR.length) return m
        tumbuh()
        return m + 1
      })
    }, 2500)
    return () => clearInterval(t)
  }, [matang])

  const panenSayur = (index: number) => {
    if (index >= matang) {
      setPesan('Belum matang, tunggu sebentar.')
      return
    }
    if (dipanen.includes(index)) return
    const baru = [...dipanen, index]
    setDipanen(baru)
    tambahSkor(10)
    panen()
    koin()
    setPesan(`${SAYUR[index]} dipanen! ${6 - baru.length} lagi.`)
    if (baru.length === SAYUR.length) {
      setSelesaiPanen(true)
    }
  }

  return (
    <section className="aia-card" aria-labelledby="aia-kompos-panen">
      <span className="aia-kicker">Fase 3 dari 3 · Panen sayur</span>
      <h3 id="aia-kompos-panen" className="aia-section-title">
        Panen sayur
      </h3>

      {!selesaiPanen ? (
        <>
          <p className="aia-muted">Sayur matang bergiliran. Ketuk sayur yang sudah matang untuk memanennya.</p>
          <div className="aia-zone-grid" role="group" aria-label="Petak sayur">
            {SAYUR.map((nama, i) => {
              const sudahMatang = i < matang
              const sudahDipanen = dipanen.includes(i)
              return (
                <button
                  key={nama}
                  type="button"
                  className="aia-btn aia-btn-ghost aia-btn-block"
                  disabled={sudahDipanen}
                  onClick={() => panenSayur(i)}
                  aria-label={`${nama}: ${sudahDipanen ? 'sudah dipanen' : sudahMatang ? 'matang, ketuk untuk panen' : 'belum matang'}`}
                >
                  {sudahDipanen ? <Check aria-hidden="true" /> : <Sprout aria-hidden="true" />} {nama}
                  {sudahDipanen ? ' · Dipanen' : sudahMatang ? ' · Matang!' : ' · Tumbuh...'}
                </button>
              )
            })}
          </div>
          <p className="aia-muted">
            Dipanen: {dipanen.length}/6 · Matang: {matang}/6
          </p>
        </>
      ) : (
        <>
          <p role="status" aria-live="polite">
            <Check aria-hidden="true" /> Semua sayur sudah dipanen!
          </p>
          <p>
            <strong>Sayur ini kembali ke kantin — siklus tertutup selesai satu putaran!</strong> Sisa makanan jadi
            maggot, maggot jadi pupuk, pupuk jadi sayur, dan sayur kembali ke piring kita.
          </p>
            {/* Fase panen hanya dirender untuk tahap terakhir (stageIndex 2), jadi tombol akhir tahap di sini selalu "Ke Pos Hijau". */}
          <div className="aia-actions">
            <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={onSelesai}>
              <Check aria-hidden="true" /> Ke Pos Hijau
            </button>
          </div>
        </>
      )}

      {pesan && !selesaiPanen && (
        <p role="status" aria-live="polite">
          {pesan}
        </p>
      )}
    </section>
  )
}

// ------------------------------------------------- Versi gestur: panen sayur ----
// PanenKetuk: sayur muncul bergantian di petak acak; ketuk hanya yang sudah
// matang (12 giliran, 6 sayur matang + 3 pengecoh belum matang). Skor akhir
// PanenKetuk (0–100) dipakai langsung sebagai skor tahap.

function FasePanenGestur({ tambahSkor, onSelesai, perbesarTarget, terjeda = false }: PropsGestur) {
  const spec = INTERAKSI_MISI.kompos[2]
  const [selesaiPanen, setSelesaiPanen] = useState(false)
  const [skorPanen, setSkorPanen] = useState<number | null>(null)
  const [pesan, setPesan] = useState<string | null>(
    'Sayur muncul bergantian di petak kebun. Ketuk hanya sayur yang sudah matang!',
  )
  const [petunjuk, setPetunjuk] = useState<string | null>(null)
  const diprosesRef = useRef(false)

  const selesaiKetuk = (skorAkhir: number) => {
    if (diprosesRef.current) return
    diprosesRef.current = true
    tambahSkor(skorAkhir)
    setSkorPanen(skorAkhir)
    setSelesaiPanen(true)
    if (skorAkhir >= 100) {
      setPetunjuk(null)
      setPesan(spec.hasilBenar)
    } else if (skorAkhir >= 70) {
      // C-14: skor 70–99 itu panen yang bagus — tidak perlu EfekSalah
      // ("Belum tepat") hanya karena tidak sempurna.
      setPetunjuk(null)
      setPesan('Hampir sempurna — ada sayur matang yang terlewat atau sayur yang belum matang ikut terpetik.')
    } else {
      setPetunjuk(bersihPetunjuk(spec.petunjukMagi))
      setPesan('Ada sayur matang yang terlewat atau sayur yang belum matang ikut terpetik.')
    }
  }

  return (
    <section className="aia-card" aria-labelledby="aia-kompos-panen" style={{ position: 'relative' }}>
      <span className="aia-kicker">Fase 3 dari 3 · Panen sayur</span>
      <h3 id="aia-kompos-panen" className="aia-section-title">
        Panen sayur
      </h3>

      {!selesaiPanen ? (
        <>
          <p className="aia-muted">Sayur muncul bergantian di petak kebun. Ketuk hanya sayur yang sudah matang!</p>
          <PanenKetuk
            objek={OBJEK_PANEN}
            giliranMs={2500}
            jumlahGiliran={12}
            modeSatuKetukan={perbesarTarget}
            terjeda={terjeda}
            onSelesai={selesaiKetuk}
          />
        </>
      ) : (
        <>
          <p role="status" aria-live="polite">
            <Check aria-hidden="true" /> Panen selesai! Skor panen: {skorPanen}.
          </p>
          <p>
            <strong>Sayur ini kembali ke kantin — siklus tertutup selesai satu putaran!</strong> Sisa makanan jadi
            maggot, maggot jadi pupuk, pupuk jadi sayur, dan sayur kembali ke piring kita.
          </p>
            {/* Fase panen hanya dirender untuk tahap terakhir (stageIndex 2), jadi tombol akhir tahap di sini selalu "Ke Pos Hijau". */}
          <div className="aia-actions">
            <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={onSelesai}>
              <Check aria-hidden="true" /> Ke Pos Hijau
            </button>
          </div>
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

// ------------------------------------------------------------------ Komponen utama ----

// B-9: skor mentah mode tombol per fase — fase 0: 8 lapis × 10,
// fase 1: 3 ronde × 10, fase 2: 6 sayur × 10. Mode gestur sudah
// 0–100 per fase (SusunMenara / SiramRitme / PanenKetuk).
// onStageComplete selalu menerima persen 0–100, supaya kinerja yang
// sama memberi Koin Hijau yang sama di kedua mode.
const MAKS_SKOR_TOMBOL = [80, 30, 60]

export function KomposKebun({
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
    if (stageIndex === 2 && save.chapters.kompos.stages[2].status !== 'done') {
      dispatch({ type: 'SET_REPORT', patch: { hijau: save.report.hijau + 10, sampah: save.report.sampah + 5 } })
    }
    // B-9: normalisasi skor mentah mode tombol ke persen 0–100.
    const persen = modeSatuKetukan
      ? Math.min(100, Math.round((skor / MAKS_SKOR_TOMBOL[stageIndex]) * 100))
      : Math.min(100, skor)
    onStageComplete(persen)
  }

  // Tampilan skor di header memakai persen yang sama dengan yang
  // dikirim ke onStageComplete (supaya angka yang terlihat = hadiahnya).
  const skorTampil = modeSatuKetukan
    ? Math.min(100, Math.round((skor / MAKS_SKOR_TOMBOL[stageIndex]) * 100))
    : Math.min(100, skor)

  return (
    <div className="aia-stack">
      <div className="aia-progress-row">
        <span className="aia-kicker" style={{ marginBottom: 0 }}>
          Kompos dan Kebun · Fase {Math.min(fase + 1, 3)} dari 3
        </span>
        <span>
          <Coins aria-hidden="true" /> Skor {skorTampil}
        </span>
        <TombolBisukan />
      </div>
      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={fase}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label="Progres fase Kompos dan Kebun"
      >
        <span style={{ width: `${(fase / 3) * 100}%` }} />
      </div>

      {alasanGagal ? (
        <LayarGagal alasan={alasanGagal} gagal={gagal} onUlang={ulangFase} onMudah={modeMudah} />
      ) : modeSatuKetukan ? (
        fase === 0 ? (
          <FaseLapis key={`lapis-${percobaan}`} mudah={mudah} tambahSkor={tambahSkor} onSelesai={selesaiFase} onGagal={gagalFase} />
        ) : fase === 1 ? (
          <FaseTanaman key={`tanaman-${percobaan}`} mudah={mudah} tambahSkor={tambahSkor} onSelesai={selesaiFase} onGagal={gagalFase} />
        ) : (
          <FasePanenSayur key={`panen-${percobaan}`} tambahSkor={tambahSkor} onSelesai={selesaiFase} terjeda={terjeda} />
        )
      ) : fase === 0 ? (
        <FaseLapisGestur
          key={`lapis-g-${percobaan}`}
          tambahSkor={tambahSkor}
          onSelesai={selesaiFase}
          onGagal={gagalFase}
          onSalah={salahAksi}
          perbesarTarget={perbesarTarget}
          terjeda={terjeda}
        />
      ) : fase === 1 ? (
        <FaseTanamanGestur
          key={`tanaman-g-${percobaan}`}
          tambahSkor={tambahSkor}
          onSelesai={selesaiFase}
          onGagal={gagalFase}
          onSalah={salahAksi}
          perbesarTarget={perbesarTarget}
          terjeda={terjeda}
        />
      ) : (
        <FasePanenGestur
          key={`panen-g-${percobaan}`}
          tambahSkor={tambahSkor}
          onSelesai={selesaiFase}
          onGagal={gagalFase}
          onSalah={salahAksi}
          perbesarTarget={perbesarTarget}
          terjeda={terjeda}
        />
      )}

      <p className="aia-muted">
        <Wind aria-hidden="true" /> {NAMA_FASE[fase]} · Aksi benar menambah Koin Hijau.
      </p>
    </div>
  )
}
