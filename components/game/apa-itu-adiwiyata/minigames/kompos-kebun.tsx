'use client'

// Mini-game Bab 4 "Kompos dan Kebun" — dipakai per tahap, stageIndex memilih
// fase: 0 Susun lapis kompos -> 1 Rawat tanaman -> 2 Panen sayur. Tiap tahap
// memanggil onStageComplete TEPAT SATU KALI dengan skor tahap itu. Gagal di
// satu tahap menampilkan layar "Coba lagi" internal (hanya tahap itu yang
// diulang); setelah 2x gagal ditawarkan mode mudah.

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
import type { MiniGameSlotProps } from '../bab-shell'
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
  const [beruntunHijau, setBeruntunHijau] = useState(0)
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
    if (bahan.jenis === 'hijau' && beruntunHijau >= 2) {
      salah()
      const tolakBaru = ditolak + 1
      setDitolak(tolakBaru)
      setPesan(
        'Tiga lapis hijau berturut-turut bikin kompos becek dan bau. Selingi dengan bahan cokelat, lapis ini tidak dihitung.',
      )
      if (tolakBaru >= batasTolak) {
        timerRef.current = setTimeout(
          () => onGagal('Kompos terlalu sering salah lapis dan jadi becek. Ulangi susunan dari awal, ingat selingi cokelat dan hijau.'),
          1200,
        )
      }
      return
    }
    const baru = [...lapis, bahan.jenis]
    setLapis(baru)
    setBeruntunHijau(bahan.jenis === 'hijau' ? beruntunHijau + 1 : 0)
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
        Ketuk bahan untuk menyusun {TARGET_LAPIS} lapis ke bak kompos. Target rasio 3 cokelat : 1 hijau. Jangan
        susun 3 lapis hijau berturut-turut.
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
            {mudah && beruntunHijau >= 2 ? ' · Sebaiknya tambah bahan cokelat sekarang.' : ''}
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
                  {mudah && bahan.jenis === 'cokelat' && beruntunHijau >= 2 ? ' · Disarankan' : ''}
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
  layu,
  butuh,
}: {
  nama: string
  sehat: number
  layu: boolean
  butuh: string | null
}) {
  return (
    <div className="aia-card" aria-label={`Tanaman ${nama}`}>
      <strong>
        <Sprout aria-hidden="true" /> {nama}
      </strong>
      <p className="aia-muted" style={{ margin: '4px 0' }}>
        {layu ? 'Layu — perlu dipulihkan.' : butuh ?? 'Segar.'}
      </p>
      <p aria-label={`Kesehatan ${nama}: ${sehat} dari 3`}>
        {[0, 1, 2].map((i) => (
          <Leaf key={i} aria-hidden="true" style={{ color: i < sehat ? '#2e7d32' : '#c8cfc4' }} />
        ))}
      </p>
    </div>
  )
}

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
  const { save, dispatch } = useCampaign()
  const sehatAwal = save.carryover.kebunLayu ? 2 : 3
  const [ronde, setRonde] = useState(0)
  const [sehat, setSehat] = useState<Record<TanamanId, number>>({ cabai: sehatAwal, kangkung: sehatAwal })
  const [pesan, setPesan] = useState<string | null>(
    save.carryover.kebunLayu ? 'Tanaman layu karena kompos kemarin belum matang. Pulihkan dengan perawatan yang tepat.' : null,
  )
  const aktif = RONDE_RAWAT[ronde]
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const pilih = (aksi: AksiRawat) => {
    if (aksi === 'siram') siram()
    if (aksi === aktif.kebutuhan) {
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
          if (save.carryover.kebunLayu) {
            dispatch({ type: 'SET_CARRYOVER', patch: { kebunLayu: false } })
          }
          onSelesai()
        } else {
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

      {save.carryover.kebunLayu && (
        <p className="aia-chip" role="alert">
          <AlertTriangle aria-hidden="true" /> Kebun layu karena kompos kemarin belum matang.
        </p>
      )}

      <div className="aia-zone-grid">
        <KartuTanaman
          nama="Cabai"
          sehat={sehat.cabai}
          layu={save.carryover.kebunLayu}
          butuh={aktif.tanaman === 'cabai' ? aktif.teks : null}
        />
        <KartuTanaman
          nama="Kangkung"
          sehat={sehat.kangkung}
          layu={save.carryover.kebunLayu}
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
            <button key={aksi.id} type="button" className="aia-btn aia-btn-ghost aia-btn-block" onClick={() => pilih(aksi.id)}>
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

// ---------------------------------------------------- Fase 2: panen sayur ----

const SAYUR = ['Cabai merah', 'Kangkung', 'Tomat', 'Bayam', 'Terong', 'Sawi']

function FasePanenSayur({ tambahSkor, onSelesai }: { tambahSkor: (n: number) => void; onSelesai: () => void }) {
  const [matang, setMatang] = useState(0)
  const [dipanen, setDipanen] = useState<number[]>([])
  const [selesaiPanen, setSelesaiPanen] = useState(false)
  const [pesan, setPesan] = useState<string | null>('Sayur sedang tumbuh. Tunggu sampai matang, lalu ketuk untuk memanen.')

  useEffect(() => {
    if (matang >= SAYUR.length) return
    const t = setInterval(() => {
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
          <div className="aia-actions">
            <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={onSelesai}>
              <Check aria-hidden="true" /> Selesai
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

// ------------------------------------------------------------------ Komponen utama ----

export function KomposKebun({ stageIndex, onStageComplete }: MiniGameSlotProps) {
  const { save, dispatch } = useCampaign()
  // Fase = tahap yang sedang dimainkan (dipilih kerangka bab).
  const fase = stageIndex
  const [skor, setSkor] = useState(0)
  const [skorFase, setSkorFase] = useState(0)
  const [gagal, setGagal] = useState(0)
  const [mudah, setMudah] = useState(false)
  const [alasanGagal, setAlasanGagal] = useState<string | null>(null)
  const [percobaan, setPercobaan] = useState(0)
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

  const selesaiFase = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    // Bonus rapor hanya sekali, di tahap terakhir saat pertama kali selesai.
    if (stageIndex === 2 && save.chapters.kompos.stages[2].status !== 'done') {
      dispatch({ type: 'SET_REPORT', patch: { hijau: save.report.hijau + 10, sampah: save.report.sampah + 5 } })
    }
    onStageComplete(skor)
  }

  return (
    <div className="aia-stack">
      <div className="aia-progress-row">
        <span className="aia-kicker" style={{ marginBottom: 0 }}>
          Kompos dan Kebun · Fase {Math.min(fase + 1, 3)} dari 3
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
        aria-label="Progres fase Kompos dan Kebun"
      >
        <span style={{ width: `${(fase / 3) * 100}%` }} />
      </div>

      {alasanGagal ? (
        <LayarGagal alasan={alasanGagal} gagal={gagal} onUlang={ulangFase} onMudah={modeMudah} />
      ) : fase === 0 ? (
        <FaseLapis key={`lapis-${percobaan}`} mudah={mudah} tambahSkor={tambahSkor} onSelesai={selesaiFase} onGagal={gagalFase} />
      ) : fase === 1 ? (
        <FaseTanaman key={`tanaman-${percobaan}`} mudah={mudah} tambahSkor={tambahSkor} onSelesai={selesaiFase} onGagal={gagalFase} />
      ) : (
        <FasePanenSayur key={`panen-${percobaan}`} tambahSkor={tambahSkor} onSelesai={selesaiFase} />
      )}

      <p className="aia-muted">
        <Wind aria-hidden="true" /> {NAMA_FASE[fase]} · Jawaban benar +10 Koin Hijau.
      </p>
    </div>
  )
}
