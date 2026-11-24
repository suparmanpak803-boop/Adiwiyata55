'use client'

// Mini-game Bab 5 "Air dan Energi" — tiga tahap, dipilih dari stageIndex:
//   0 = Biopori (putar bor), 1 = Tampung Hujan (labirin pipa),
//   2 = Cari Boros (cari perangkat boros).
// Versi utama memakai gestur langsung dari pustaka ../interaksi
// (RotateDial, PipePuzzle, HiddenObject) sesuai INTERAKSI_MISI. Versi tombol
// lama disimpan sebagai mode alternatif satu-ketukan (prop modeSatuKetukan).
// Tiap tahap memanggil onStageComplete(score) TEPAT SATU KALI (dijaga ref
// di komponen utama).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AirVent,
  Check,
  Clock,
  CloudRain,
  Droplet,
  Droplets,
  Fan,
  Lightbulb,
  Monitor,
  RotateCcw,
  Shovel,
  X,
} from 'lucide-react'
import type { MiniGameSlotProps } from '../misi-shell'
import { INTERAKSI_MISI } from '@/lib/apa-itu-adiwiyata/content/interaksi'
import {
  HiddenObject,
  PetunjukMagi,
  PipePuzzle,
  RotateDial,
  TanganPenunjuk,
} from '../interaksi'
import type { PotonganPipa } from '../interaksi'
import { benar, getar, klik, koin, salah, siram } from '../suara'

/** Petunjuk di data diawali 'Magi: "..."' — komponen PetunjukMagi sudah
 *  memberi label Magi sendiri, jadi awalan dan tanda kutipnya dibuang. */
function teksMagi(s: string): string {
  return s.replace(/^Magi:\s*/, '').replace(/^"|"$/g, '')
}

// ------------------------------------------------------------- Biopori ----

const JUMLAH_LUBANG = 5
const KETUKAN_PER_LUBANG = 3

function Biopori({ onSelesai }: { onSelesai: (score: number) => void }) {
  const [lubang, setLubang] = useState<number[]>(() => Array(JUMLAH_LUBANG).fill(0))
  const [pesan, setPesan] = useState('Ketuk lubang untuk mengebor. Tiap lubang butuh 3 ketukan.')
  const selesai = lubang.filter((n) => n >= KETUKAN_PER_LUBANG).length
  const banjir = 100 - selesai * 20
  const skor = selesai * 10
  const tuntas = selesai === JUMLAH_LUBANG

  const bor = (i: number) => {
    if (tuntas || lubang[i] >= KETUKAN_PER_LUBANG) return
    const next = [...lubang]
    next[i] = lubang[i] + 1
    setLubang(next)
    if (next[i] === KETUKAN_PER_LUBANG) {
      siram()
      benar()
      koin()
      setPesan(`Lubang ${i + 1} selesai! Air hujan kini meresap ke tanah.`)
    } else {
      klik()
      setPesan(`Mengebor lubang ${i + 1}... ${next[i]}/${KETUKAN_PER_LUBANG} ketukan.`)
    }
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Biopori · ketuk untuk mengebor</span>
        <div className="aia-progress-row" style={{ marginTop: 8 }}>
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={banjir}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tinggi genangan air"
          >
            <span style={{ width: `${banjir}%`, background: '#3b7ea1' }} />
          </div>
          <span>Genangan {banjir}%</span>
        </div>
        <p className="aia-muted" style={{ marginBottom: 0 }}>
          {tuntas
            ? 'Halaman sekolah tidak lagi tergenang. Semua air hujan meresap ke tanah!'
            : 'Halaman sekolah tergenang setiap hujan deras. Bor lubang biopori supaya air meresap!'}
        </p>
      </div>

      <div
        role="group"
        aria-label="Halaman sekolah, ketuk lubang untuk mengebor"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          padding: 16,
          borderRadius: 16,
          border: '1px solid var(--line)',
          background: 'linear-gradient(180deg, #e9f0e3 0%, #cbb98a 100%)',
        }}
      >
        {lubang.map((ketukan, i) => {
          const jadi = ketukan >= KETUKAN_PER_LUBANG
          return (
            <button
              key={i}
              type="button"
              className="aia-btn"
              onClick={() => bor(i)}
              disabled={jadi || tuntas}
              aria-label={
                jadi
                  ? `Lubang ${i + 1} selesai, air meresap`
                  : `Lubang ${i + 1}, ${ketukan} dari ${KETUKAN_PER_LUBANG} ketukan`
              }
              style={{
                width: 64,
                height: 64,
                minHeight: 64,
                padding: 0,
                borderRadius: '50%',
                border: jadi ? '3px solid #236b4d' : '2px solid #8a6a3b',
                background: jadi ? '#3b7ea1' : ketukan > 0 ? '#8a6a3b' : '#b08954',
                color: '#fff',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {jadi ? (
                <>
                  <Droplet aria-hidden="true" />
                  <span style={{ fontSize: 9 }}>meresap</span>
                </>
              ) : (
                <>
                  <Shovel aria-hidden="true" />
                  <span style={{ fontSize: 11 }}>
                    {ketukan}/{KETUKAN_PER_LUBANG}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <p className="aia-muted" role="status" style={{ margin: 0 }}>
        {pesan}
      </p>
      <p className="aia-muted" style={{ margin: 0 }}>
        Lubang selesai: {selesai}/{JUMLAH_LUBANG} · Skor: {skor}
      </p>

      {tuntas && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Banjir berkurang!
          </h3>
          <p>
            {JUMLAH_LUBANG} lubang biopori selesai. Genangan turun dari 100% menjadi 0% — air hujan
            sekarang meresap dan mengisi air tanah.
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------- Tampung Hujan ----

interface Tetes {
  id: number
  x: number
  y: number
}

const TINGGI_AREA = 320
const TARGET_NORMAL = 10
const TARGET_MUDAH = 7
const WAKTU_NORMAL = 30
const WAKTU_MUDAH = 40

function TampungHujan({ onSelesai }: { onSelesai: (score: number) => void }) {
  const [fase, setFase] = useState<'main' | 'selesai' | 'gagal'>('main')
  const [mudah, setMudah] = useState(false)
  const [gagal, setGagal] = useState(0)
  const [waktu, setWaktu] = useState(WAKTU_NORMAL)
  const [tertangkap, setTertangkap] = useState(0)
  const [tangkiX, setTangkiX] = useState(140)
  const [, setRender] = useState(0)

  const target = mudah ? TARGET_MUDAH : TARGET_NORMAL
  const lebarTangki = mudah ? 96 : 72
  const skor = tertangkap * 5

  const areaRef = useRef<HTMLDivElement>(null)
  const tetesRef = useRef<Tetes[]>([])
  const tangkiRef = useRef({ x: 140 })
  const tertangkapRef = useRef(0)
  const idRef = useRef(0)
  const spawnRef = useRef(0)

  // Loop game: tetes jatuh, tangkapan dicek, tetes baru muncul.
  // Posisi tetes disimpan di ref supaya tick 50ms tidak memicu
  // efek samping di dalam updater state.
  useEffect(() => {
    if (fase !== 'main') return
    const id = setInterval(() => {
      const area = areaRef.current
      const lebar = area ? area.clientWidth : 360
      spawnRef.current += 1
      if (spawnRef.current >= 13 && tetesRef.current.length < 14) {
        spawnRef.current = 0
        tetesRef.current = [
          ...tetesRef.current,
          { id: (idRef.current += 1), x: 22 + Math.random() * Math.max(40, lebar - 44), y: -12 },
        ]
      }
      const tengahTangki = tangkiRef.current.x + lebarTangki / 2
      let dapat = 0
      const sisa: Tetes[] = []
      for (const t of tetesRef.current) {
        const y = t.y + 3.4
        const kena =
          y >= 264 && y <= 312 && Math.abs(t.x - tengahTangki) <= lebarTangki / 2 + 14
        if (kena) {
          dapat += 1
          continue
        }
        if (y > 316) continue // jatuh ke tanah, tidak mengurangi skor
        sisa.push({ ...t, y })
      }
      tetesRef.current = sisa
      if (dapat > 0) {
        tertangkapRef.current += dapat
        setTertangkap(tertangkapRef.current)
        koin()
      }
      setRender((n) => n + 1)
    }, 50)
    return () => clearInterval(id)
  }, [fase, lebarTangki])

  // Timer 1 detik.
  useEffect(() => {
    if (fase !== 'main') return
    const id = setInterval(() => setWaktu((w) => Math.max(0, w - 1)), 1000)
    return () => clearInterval(id)
  }, [fase])

  // Akhir tahap: target tercapai atau waktu habis.
  useEffect(() => {
    if (fase !== 'main') return
    if (tertangkap >= target) {
      setFase('selesai')
      benar()
    } else if (waktu <= 0) {
      setFase('gagal')
      setGagal((g) => g + 1)
      salah()
      getar([60, 40, 60])
    }
  }, [tertangkap, waktu, target, fase])

  const gerakTangki = useCallback(
    (clientX: number) => {
      const area = areaRef.current
      if (!area) return
      const rect = area.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width - lebarTangki, clientX - rect.left - lebarTangki / 2))
      tangkiRef.current.x = x
      setTangkiX(x)
    },
    [lebarTangki],
  )

  const geserTangki = (arah: -1 | 1) => {
    const area = areaRef.current
    const lebar = area ? area.clientWidth : 360
    const x = Math.max(0, Math.min(lebar - lebarTangki, tangkiRef.current.x + arah * 40))
    tangkiRef.current.x = x
    setTangkiX(x)
  }

  const tangkapLangsung = (idTetes: number) => {
    if (fase !== 'main') return
    tetesRef.current = tetesRef.current.filter((t) => t.id !== idTetes)
    tertangkapRef.current += 1
    setTertangkap(tertangkapRef.current)
    koin()
    setRender((n) => n + 1)
  }

  const ulangi = (pakaiMudah: boolean) => {
    setMudah(pakaiMudah)
    tetesRef.current = []
    tertangkapRef.current = 0
    spawnRef.current = 0
    setTertangkap(0)
    setWaktu(pakaiMudah ? WAKTU_MUDAH : WAKTU_NORMAL)
    setRender((n) => n + 1)
    setFase('main')
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Tampung hujan · {target} tetes dalam {mudah ? WAKTU_MUDAH : WAKTU_NORMAL} detik</span>
        <div className="aia-progress-row" style={{ marginTop: 8 }}>
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={tertangkap}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label="Tetes hujan tertampung"
          >
            <span style={{ width: `${Math.min(100, (tertangkap / target) * 100)}%`, background: '#3b7ea1' }} />
          </div>
          <span>
            {tertangkap}/{target} tetes
          </span>
        </div>
        <p className="aia-muted" style={{ margin: '8px 0 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>
            <Clock aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {waktu} dtk
          </span>
          <span>Skor: {skor}</span>
        </p>
      </div>

      {fase === 'main' && (
        <>
          <div
            ref={areaRef}
            role="application"
            aria-label="Area hujan. Gerakkan tangki untuk menangkap tetes, atau ketuk tetesnya langsung."
            tabIndex={0}
            onPointerMove={(e) => gerakTangki(e.clientX)}
            onPointerDown={(e) => gerakTangki(e.clientX)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                geserTangki(-1)
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                geserTangki(1)
              }
            }}
            style={{
              position: 'relative',
              height: TINGGI_AREA,
              overflow: 'hidden',
              borderRadius: 16,
              border: '1px solid var(--line)',
              background: 'linear-gradient(180deg, #7fb3d5 0%, #cfe3ef 70%, #e9f0e3 100%)',
              touchAction: 'none',
              cursor: 'crosshair',
            }}
          >
            <CloudRain aria-hidden="true" style={{ position: 'absolute', top: 8, left: 8, color: '#236b4d' }} />
            {tetesRef.current.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label="Tetes hujan, ketuk untuk menangkap"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  tangkapLangsung(t.id)
                }}
                style={{
                  position: 'absolute',
                  left: t.x - 22,
                  top: t.y - 22,
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  border: 0,
                  background: 'transparent',
                  color: '#2b6cb0',
                  cursor: 'pointer',
                }}
              >
                <Droplet aria-hidden="true" />
              </button>
            ))}
            {/* Tangki */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: tangkiX,
                bottom: 8,
                width: lebarTangki,
                height: 44,
                borderRadius: '8px 8px 12px 12px',
                border: '3px solid #236b4d',
                background: '#fffefa',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${Math.min(100, (tertangkap / target) * 100)}%`,
                  background: '#3b7ea1',
                }}
              />
              <Droplets
                aria-hidden="true"
                style={{ position: 'relative', margin: '8px auto', display: 'block', color: '#236b4d' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="aia-btn aia-btn-ghost" onClick={() => geserTangki(-1)}>
              Geser kiri
            </button>
            <button type="button" className="aia-btn aia-btn-ghost" onClick={() => geserTangki(1)}>
              Geser kanan
            </button>
          </div>
          <p className="aia-muted" role="status" style={{ margin: 0 }}>
            Gerakkan tangki mengikuti tetes, atau ketuk tetesnya langsung. Tetes yang jatuh ke tanah tidak
            mengurangi skor.
          </p>
        </>
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Tangki penuh!
          </h3>
          <p>
            Kamu menampung {tertangkap} tetes hujan. Air ini bisa dipakai menyiram kebun — tidak perlu lagi
            membuka keran!
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}

      {fase === 'gagal' && (
        <div className="aia-card">
          <h3>
            <X aria-hidden="true" /> Waktu habis
          </h3>
          <p>
            Kamu menangkap {tertangkap} dari {target} tetes. Hujan sudah reda — ayo coba lagi, gerakkan
            tangki lebih cepat!
          </p>
          <div className="aia-actions">
            <button type="button" className="aia-btn aia-btn-primary" onClick={() => ulangi(mudah)}>
              <RotateCcw aria-hidden="true" /> Coba lagi
            </button>
            {gagal >= 2 && !mudah && (
              <button type="button" className="aia-btn aia-btn-ghost" onClick={() => ulangi(true)}>
                Mode mudah: {TARGET_MUDAH} tetes, {WAKTU_MUDAH} detik, tangki lebih lebar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------ Cari Boros ----

type IkonPerangkat = 'lampu' | 'ac' | 'keran' | 'komputer' | 'kipas'

interface Perangkat {
  id: string
  ruangan: string
  nama: string
  ikon: IkonPerangkat
  boros: boolean
  penjelasan: string
}

const RUANGAN = ['Kelas', 'Kantin', 'Toilet', 'Lab']

const PERANGKAT: Perangkat[] = [
  {
    id: 'lampu-kelas',
    ruangan: 'Kelas',
    nama: 'Lampu kelas menyala',
    ikon: 'lampu',
    boros: true,
    penjelasan: 'Lampu ini menyala padahal siang — matikan saja!',
  },
  {
    id: 'ac-kelas',
    ruangan: 'Kelas',
    nama: 'AC 16°C',
    ikon: 'ac',
    boros: true,
    penjelasan: 'AC 16°C terlalu dingin dan boros listrik. 24–25°C sudah nyaman.',
  },
  {
    id: 'kipas-kantin',
    ruangan: 'Kantin',
    nama: 'Kipas menyala',
    ikon: 'kipas',
    boros: true,
    penjelasan: 'Kipas menyala di kantin yang sedang kosong — matikan!',
  },
  {
    id: 'komputer-lab',
    ruangan: 'Lab',
    nama: 'Komputer standby',
    ikon: 'komputer',
    boros: true,
    penjelasan: 'Komputer standby tetap makan listrik. Matikan total bila tidak dipakai.',
  },
  {
    id: 'keran-toilet',
    ruangan: 'Toilet',
    nama: 'Keran menetes',
    ikon: 'keran',
    boros: true,
    penjelasan: 'Keran menetes bisa jadi ember penuh dalam sehari — laporkan!',
  },
  {
    id: 'lampu-lab',
    ruangan: 'Lab',
    nama: 'Lampu LED mati',
    ikon: 'lampu',
    boros: false,
    penjelasan: 'Lampu ini sudah mati. Bagus, tidak ada listrik terbuang!',
  },
  {
    id: 'kipas-kelas',
    ruangan: 'Kelas',
    nama: 'Kipas mati',
    ikon: 'kipas',
    boros: false,
    penjelasan: 'Kipas ini sudah mati dan tidak membuang listrik.',
  },
  {
    id: 'keran-kantin',
    ruangan: 'Kantin',
    nama: 'Keran tertutup',
    ikon: 'keran',
    boros: false,
    penjelasan: 'Keran ini tertutup rapat, tidak ada air yang terbuang.',
  },
]

const JUMLAH_BOROS = PERANGKAT.filter((p) => p.boros).length

function ikonPerangkat(ikon: IkonPerangkat) {
  switch (ikon) {
    case 'lampu':
      return <Lightbulb aria-hidden="true" />
    case 'ac':
      return <AirVent aria-hidden="true" />
    case 'keran':
      return <Droplet aria-hidden="true" />
    case 'komputer':
      return <Monitor aria-hidden="true" />
    case 'kipas':
      return <Fan aria-hidden="true" />
  }
}

function CariBoros({ onSelesai }: { onSelesai: (score: number) => void }) {
  const [ditemukan, setDitemukan] = useState<ReadonlySet<string>>(new Set())
  const [salahKetuk, setSalahKetuk] = useState<ReadonlySet<string>>(new Set())
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>({
    teks: 'Ada 5 perangkat boros di sekolah ini. Ketuk yang menurutmu boros!',
    ok: true,
  })
  const skor = ditemukan.size * 10
  const tuntas = ditemukan.size === JUMLAH_BOROS

  const ketuk = (p: Perangkat) => {
    if (tuntas || ditemukan.has(p.id) || salahKetuk.has(p.id)) return
    if (p.boros) {
      const next = new Set(ditemukan)
      next.add(p.id)
      setDitemukan(next)
      benar()
      koin()
      setPesan({ teks: `Benar! ${p.penjelasan}`, ok: true })
    } else {
      const next = new Set(salahKetuk)
      next.add(p.id)
      setSalahKetuk(next)
      salah()
      setPesan({ teks: p.penjelasan, ok: false })
    }
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Cari boros · {ditemukan.size}/{JUMLAH_BOROS} ditemukan</span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          Lampu, AC, keran, komputer, kipas — ada yang menyala dan menetes sia-sia. Temukan semuanya!
          Mengetuk perangkat yang hemat tidak mengurangi nyawa, hanya penjelasan.
        </p>
      </div>

      {RUANGAN.map((ruangan) => (
        <section key={ruangan} aria-label={`Ruangan ${ruangan}`}>
          <h3 className="aia-section-title">{ruangan}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PERANGKAT.filter((p) => p.ruangan === ruangan).map((p) => {
              const sudahBenar = ditemukan.has(p.id)
              const sudahSalah = salahKetuk.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => ketuk(p)}
                  disabled={sudahBenar || sudahSalah || tuntas}
                  aria-label={`${p.nama} di ${ruangan}${sudahBenar ? ' — sudah ditemukan boros' : sudahSalah ? ' — sudah dicek, ternyata hemat' : ''}`}
                  style={{
                    minHeight: 64,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: 10,
                    borderRadius: 12,
                    border: sudahBenar
                      ? '2px solid #236b4d'
                      : sudahSalah
                        ? '2px solid var(--line)'
                        : '1px solid var(--line)',
                    background: sudahBenar ? '#dcfce7' : 'var(--card)',
                    color: 'var(--foreground)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: sudahBenar || sudahSalah || tuntas ? 'default' : 'pointer',
                  }}
                >
                  {sudahBenar ? <Check aria-hidden="true" color="#236b4d" /> : ikonPerangkat(p.ikon)}
                  {p.nama}
                  {sudahBenar && <span style={{ fontSize: 11, color: '#236b4d' }}>Boros — ditemukan!</span>}
                  {sudahSalah && <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Hemat</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {pesan && (
        <p className="aia-muted" role="status" style={{ margin: 0, color: pesan.ok ? '#236b4d' : undefined }}>
          {pesan.teks}
        </p>
      )}
      <p className="aia-muted" style={{ margin: 0 }}>
        Skor: {skor}
      </p>

      {tuntas && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Semua perangkat boros ditemukan!
          </h3>
          <p>
            Lampu dimatikan, AC diatur, keran diperbaiki, komputer dan kipas dimatikan. Sekolah jadi lebih
            hemat energi dan air.
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

// --------------------------------------------- Versi gestur (utama) --------

function BioporiGestur({
  onSelesai,
  modeSatuKetukan,
}: {
  onSelesai: (score: number) => void
  modeSatuKetukan?: boolean
}) {
  const [selesai, setSelesai] = useState(0)
  const tuntas = selesai >= JUMLAH_LUBANG
  const banjir = 100 - selesai * 20
  const skor = selesai * 10
  const spec = INTERAKSI_MISI['air-energi'][0]

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Biopori · putar bor untuk mengebor</span>
        <div className="aia-progress-row" style={{ marginTop: 8 }}>
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={banjir}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tinggi genangan air"
          >
            <span style={{ width: `${banjir}%`, background: '#3b7ea1' }} />
          </div>
          <span>Genangan {banjir}%</span>
        </div>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          {tuntas
            ? 'Halaman sekolah tidak lagi tergenang. Semua air hujan meresap ke tanah!'
            : 'Halaman sekolah tergenang setiap hujan deras. Bor lubang biopori supaya air meresap!'}
        </p>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          Lubang selesai: {selesai}/{JUMLAH_LUBANG} · Skor: {skor}
        </p>
        <PetunjukMagi teks={teksMagi(spec.petunjukMagi)} />
      </div>

      {!tuntas && (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {spec.tutorial && <TanganPenunjuk label="Putar bornya sampai penuh!" />}
          <RotateDial
            key={selesai}
            label={`Bor lubang ${selesai + 1}`}
            sudutTarget={360}
            ikon={<Shovel aria-hidden="true" />}
            modeSatuKetukan={modeSatuKetukan}
            onSelesai={() => {
              setSelesai((s) => s + 1)
              siram()
            }}
          />
          <p className="aia-muted" style={{ margin: 0 }}>
            Lubang {selesai + 1} dari {JUMLAH_LUBANG}
          </p>
        </div>
      )}

      {tuntas && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Banjir berkurang!
          </h3>
          <p>
            {JUMLAH_LUBANG} lubang biopori selesai. Genangan turun dari 100% menjadi 0% — air hujan
            sekarang meresap dan mengisi air tanah.
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------- Tampung Hujan ----
// Versi gestur baru: PipePuzzle (labirin pipa 3x3) — bukan lagi seret tetes.
// Jalur yang benar: (0,0) → (0,1) → (0,2) → (1,2) → (2,2), dari sumber
// hujan (atas kiri) ke tong penampung (kanan bawah). Tiap potongan sengaja
// diputar dari posisi benarnya supaya puzzle belum tersambung di awal;
// pemain memutar potongan (ketuk = putar 90°) sampai air mengalir.
// Sorotan petunjuk muncul sendiri di dalam PipePuzzle setelah 2 putaran
// yang tidak menambah aliran (1 putaran di mode satu-ketukan).
//
// Aturan skor (0–100): mulai 100, −5 per putaran di atas putaran minimal.
// Putaran minimal dari susunan awal = 12: (0,0) 3 + (0,1) 3 + (0,2) 3 +
// (1,2) 1 + (2,2) 2. Skor = max(0, 100 − 5 × max(0, totalPutaran − 12)).

const PIPA_AWAL: PotonganPipa[] = [
  { id: 'p00', jenis: 'belok', rotasi: 90 },
  { id: 'p01', jenis: 'lurus', rotasi: 90 },
  { id: 'p02', jenis: 'belok', rotasi: 270 },
  { id: 'p10', jenis: 'lurus', rotasi: 90 },
  { id: 'p11', jenis: 'belok', rotasi: 270 },
  { id: 'p12', jenis: 'lurus', rotasi: 0 },
  { id: 'p20', jenis: 'belok', rotasi: 0 },
  { id: 'p21', jenis: 'tiga', rotasi: 90 },
  { id: 'p22', jenis: 'belok', rotasi: 90 },
]

const PUTARAN_MINIMAL = 12

function skorPipa(totalPutaran: number): number {
  return Math.max(0, 100 - 5 * Math.max(0, totalPutaran - PUTARAN_MINIMAL))
}

function TampungHujanGestur({
  onSelesai,
  modeSatuKetukan,
}: {
  onSelesai: (score: number) => void
  modeSatuKetukan?: boolean
}) {
  const [fase, setFase] = useState<'main' | 'selesai'>('main')
  const [putaran, setPutaran] = useState(0)
  const [skor, setSkor] = useState(100)
  const putaranRef = useRef(0)
  const spec = INTERAKSI_MISI['air-energi'][1]

  const aliranTersambung = useCallback(() => {
    setSkor(skorPipa(putaranRef.current))
    setFase('selesai')
  }, [])

  const catatPutaran = useCallback(() => {
    putaranRef.current += 1
    setPutaran(putaranRef.current)
  }, [])

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">Tampung hujan · susun pipa ke tong penampung</span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          Hujan turun dari awan! Ketuk potongan pipa untuk memutarnya sampai air mengalir dari sumber
          ke tong penampung.
        </p>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          Putaran: {putaran} · Skor: {fase === 'selesai' ? skor : skorPipa(putaran)}
        </p>
        <PetunjukMagi teks={teksMagi(spec.petunjukMagi)} />
      </div>

      {fase === 'main' && (
        <PipePuzzle
          ukuran={3}
          potongan={PIPA_AWAL}
          awal={{ baris: 0, kolom: 0, dari: 'atas' }}
          akhir={{ baris: 2, kolom: 2 }}
          modeSatuKetukan={modeSatuKetukan}
          onSelesai={aliranTersambung}
          onPutar={catatPutaran}
        />
      )}

      {fase === 'selesai' && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Air mengalir ke tong!
          </h3>
          <p>{spec.hasilBenar}</p>
          <p>
            Putaran dipakai: {putaran} (minimal {PUTARAN_MINIMAL}).
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

const BOROS_POS: Record<string, { x: number; y: number }> = {
  'lampu-kelas': { x: 20, y: 25 },
  'ac-kelas': { x: 50, y: 18 },
  'kipas-kantin': { x: 78, y: 28 },
  'komputer-lab': { x: 30, y: 66 },
  'keran-toilet': { x: 68, y: 70 },
}

const LABEL_PENDEK: Record<string, string> = {
  'lampu-kelas': 'Lampu',
  'ac-kelas': 'AC',
  'kipas-kantin': 'Kipas',
  'komputer-lab': 'Komputer',
  'keran-toilet': 'Keran',
}

function CariBorosGestur({ onSelesai }: { onSelesai: (score: number) => void }) {
  const [ditemukan, setDitemukan] = useState<ReadonlySet<string>>(new Set())
  const [pesan, setPesan] = useState<string | null>(null)
  const [tuntas, setTuntas] = useState(false)
  const spec = INTERAKSI_MISI['air-energi'][2]

  const boros = useMemo(() => PERANGKAT.filter((p) => p.boros), [])
  const skor = ditemukan.size * 10

  // Identitas array objek harus stabil (useMemo) — HiddenObject mereset
  // progresnya bila referensi objek berubah.
  const objek = useMemo(
    () =>
      boros.map((p) => {
        const pos = BOROS_POS[p.id] ?? { x: 50, y: 50 }
        return {
          id: p.id,
          label: p.nama,
          x: pos.x,
          y: pos.y,
          ikon: (
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                lineHeight: 1,
              }}
            >
              {ikonPerangkat(p.ikon)}
              <span style={{ fontSize: 9, fontWeight: 700 }}>{LABEL_PENDEK[p.id] ?? p.nama}</span>
            </span>
          ),
        }
      }),
    [boros],
  )

  const temukan = (id: string) => {
    const p = boros.find((x) => x.id === id)
    if (!p) return
    setDitemukan((prev) => new Set(prev).add(id))
    setPesan(`Benar! ${p.penjelasan}`)
  }

  return (
    <div className="aia-stack">
      <div className="aia-card">
        <span className="aia-kicker">
          Cari boros · {ditemukan.size}/{JUMLAH_BOROS} ditemukan
        </span>
        <p className="aia-muted" style={{ margin: '8px 0 0' }}>
          Lampu, AC, keran, komputer, kipas — ada yang menyala dan menetes sia-sia. Cari dan ketuk
          perangkat yang boros!
        </p>
        <PetunjukMagi teks={teksMagi(spec.petunjukMagi)} />
      </div>

      {!tuntas && (
        <HiddenObject
          objek={objek}
          onTemukan={temukan}
          onSelesai={(semua) => {
            if (semua) setTuntas(true)
          }}
        />
      )}

      {pesan && !tuntas && (
        <p className="aia-muted" role="status" style={{ margin: 0, color: '#236b4d' }}>
          {pesan}
        </p>
      )}
      <p className="aia-muted" style={{ margin: 0 }}>
        Skor: {skor}
      </p>

      {tuntas && (
        <div className="aia-card aia-pos-hijau">
          <h3>
            <Check aria-hidden="true" /> Semua perangkat boros ditemukan!
          </h3>
          <p>
            Lampu dimatikan, AC diatur, keran diperbaiki, komputer dan kipas dimatikan. Sekolah jadi lebih
            hemat energi dan air.
          </p>
          <button type="button" className="aia-btn aia-btn-primary" onClick={() => onSelesai(skor)}>
            Selesai · +{skor} Koin Hijau
          </button>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Utama ----

export function AirEnergi({
  stageIndex,
  onStageComplete,
  modeSatuKetukan = false,
}: MiniGameSlotProps & { modeSatuKetukan?: boolean }) {
  const selesaiRef = useRef(false)
  const selesai = useCallback(
    (score: number) => {
      if (selesaiRef.current) return
      selesaiRef.current = true
      onStageComplete(score)
    },
    [onStageComplete],
  )

  if (modeSatuKetukan) {
    if (stageIndex === 0) return <Biopori onSelesai={selesai} />
    if (stageIndex === 1) return <TampungHujan onSelesai={selesai} />
    if (stageIndex === 2) return <CariBoros onSelesai={selesai} />
  } else {
    if (stageIndex === 0) return <BioporiGestur onSelesai={selesai} modeSatuKetukan={modeSatuKetukan} />
    if (stageIndex === 1) return <TampungHujanGestur onSelesai={selesai} modeSatuKetukan={modeSatuKetukan} />
    if (stageIndex === 2) return <CariBorosGestur onSelesai={selesai} />
  }
  return (
    <div className="aia-card">
      <p className="aia-muted">Tahap tidak dikenal.</p>
    </div>
  )
}
