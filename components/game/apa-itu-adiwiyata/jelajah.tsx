'use client'

// Explorer "Jelajah" — peta sekolah top-down di Canvas 2D.
// Tokoh siswa chibi berjalan dengan joystick virtual (sentuh) atau
// WASD/panah (keyboard), bicara dengan NPC, dan memungut sampah yang
// berserakan. Dialog dan HUD memakai DOM supaya terbaca pembaca layar.
// Data dunia (DUNIA, NPCS) dan dialog NPC (DIALOG_NPC) dibuat agen lain
// mengikuti kontrak di lib/apa-itu-adiwiyata/dunia.ts dan content/npc.ts.

import { useEffect, useRef, useState } from 'react'
import { Coins, MessageCircle, Volume2, VolumeX, X } from 'lucide-react'
import { CHAPTERS } from '@/lib/apa-itu-adiwiyata/chapters'
import { selectChapterUnlocked, useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { DIALOG_NPC } from '@/lib/apa-itu-adiwiyata/content/npc'
import { DUNIA, NPCS, type NpcDunia } from '@/lib/apa-itu-adiwiyata/dunia'
import type { ChapterId } from '@/lib/apa-itu-adiwiyata/types'
import { klik, koin, pindah, playMumble, setSuaraMuted } from './suara'

const KECEPATAN = 160 // unit dunia per detik
const JARAK_BICARA = 56
const RADIUS_PEMAIN = 14
const JARI_JOYSTICK = 52

type Arah = 'atas' | 'bawah' | 'kiri' | 'kanan'

interface PemainState {
  x: number
  y: number
  arah: Arah
  bergerak: boolean
  fase: number
}

interface NpcJalan extends NpcDunia {
  homeX: number
  homeY: number
  sudut: number
  timer: number
  fase: number
}

// ---------------------------------------------------------- util & gambar ----

function mulberry32(benih: number): () => number {
  let a = benih
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Persegi bersudut membulat (path saja, belum fill/stroke). */
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rad, y)
  g.arcTo(x + w, y, x + w, y + h, rad)
  g.arcTo(x + w, y + h, x, y + h, rad)
  g.arcTo(x, y + h, x, y, rad)
  g.arcTo(x, y, x + w, y, rad)
  g.closePath()
}

function tabrakan(x: number, y: number, r: number): boolean {
  if (x < r || y < r || x > DUNIA.lebar - r || y > DUNIA.tinggi - r) return true
  for (const d of DUNIA.dinding) {
    if (x + r > d.x && x - r < d.x + d.w && y + r > d.y && y - r < d.y + d.h) return true
  }
  return false
}

function jepitKamera(nilai: number, pandang: number, dunia: number): number {
  if (pandang >= dunia) return (dunia - pandang) / 2
  return Math.max(0, Math.min(nilai, dunia - pandang))
}

function posisiPohon(): { x: number; y: number; r: number }[] {
  const acak = mulberry32(20261124)
  const pohon: { x: number; y: number; r: number }[] = []
  const kandidat: { x: number; y: number }[] = []
  for (let x = 50; x < DUNIA.lebar - 40; x += 120) {
    kandidat.push({ x: x + acak() * 50, y: 34 + acak() * 16 })
    kandidat.push({ x: x + acak() * 50, y: DUNIA.tinggi - 34 - acak() * 16 })
  }
  for (let y = 120; y < DUNIA.tinggi - 100; y += 170) {
    kandidat.push({ x: 34 + acak() * 16, y })
    kandidat.push({ x: DUNIA.lebar - 34 - acak() * 16, y })
  }
  for (const k of kandidat) {
    const diZona = DUNIA.zona.some(
      (z) => k.x > z.x - 26 && k.x < z.x + z.w + 26 && k.y > z.y - 26 && k.y < z.y + z.h + 26,
    )
    const diDinding = DUNIA.dinding.some(
      (d) => k.x > d.x - 26 && k.x < d.x + d.w + 26 && k.y > d.y - 26 && k.y < d.y + d.h + 26,
    )
    const dekatSpawn = Math.hypot(k.x - DUNIA.spawn.x, k.y - DUNIA.spawn.y) < 110
    if (!diZona && !diDinding && !dekatSpawn) pohon.push({ ...k, r: 16 + acak() * 8 })
  }
  return pohon
}

/** Lapisan statis dunia (rumput, jalan, zona, bangunan, pohon) — digambar sekali. */
function bangunStatis(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = DUNIA.lebar
  c.height = DUNIA.tinggi
  const g = c.getContext('2d')
  if (!g) return c

  // Rumput + petak halus.
  g.fillStyle = '#7cb85c'
  g.fillRect(0, 0, DUNIA.lebar, DUNIA.tinggi)
  const petak = 60
  g.fillStyle = 'rgba(255,255,255,0.05)'
  for (let y = 0; y < DUNIA.tinggi; y += petak) {
    for (let x = 0; x < DUNIA.lebar; x += petak) {
      if ((x / petak + y / petak) % 2 === 0) g.fillRect(x, y, petak, petak)
    }
  }

  // Jalan tanah utama (nanti tertutup zona/bangunan bila bersilangan).
  g.fillStyle = 'rgba(217,196,154,0.55)'
  g.fillRect(0, DUNIA.tinggi / 2 - 26, DUNIA.lebar, 52)
  g.fillRect(DUNIA.lebar / 2 - 26, 0, 52, DUNIA.tinggi)

  // Zona: area berwarna + label.
  for (const z of DUNIA.zona) {
    g.globalAlpha = 0.35
    g.fillStyle = z.warna
    rr(g, z.x, z.y, z.w, z.h, 14)
    g.fill()
    g.globalAlpha = 1
    g.strokeStyle = z.warna
    g.lineWidth = 3
    rr(g, z.x, z.y, z.w, z.h, 14)
    g.stroke()
    g.font = 'bold 14px system-ui, sans-serif'
    const lebarTeks = g.measureText(z.nama).width
    const cx = z.x + z.w / 2
    const cy = z.y + 22
    g.fillStyle = 'rgba(0,0,0,0.55)'
    rr(g, cx - lebarTeks / 2 - 10, cy - 13, lebarTeks + 20, 24, 12)
    g.fill()
    g.fillStyle = '#ffffff'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(z.nama, cx, cy + 1)
  }

  // Bangunan (dinding): badan + atap.
  for (const d of DUNIA.dinding) {
    g.fillStyle = '#8d6e63'
    rr(g, d.x, d.y, d.w, d.h, 6)
    g.fill()
    g.fillStyle = '#a1887f'
    g.fillRect(d.x + 4, d.y + 4, d.w - 8, 10)
    g.strokeStyle = '#6d4c41'
    g.lineWidth = 2
    rr(g, d.x, d.y, d.w, d.h, 6)
    g.stroke()
  }

  // Pohon di tepi dunia.
  for (const t of posisiPohon()) {
    g.fillStyle = '#6d4c41'
    g.fillRect(t.x - 3, t.y + 4, 6, 12)
    g.fillStyle = '#4e9a3d'
    g.beginPath()
    g.arc(t.x - 6, t.y - 4, t.r * 0.7, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(t.x + 7, t.y - 2, t.r * 0.7, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#5cb85c'
    g.beginPath()
    g.arc(t.x, t.y - 10, t.r * 0.75, 0, Math.PI * 2)
    g.fill()
  }

  return c
}

function gambarSampah(g: CanvasRenderingContext2D, x: number, y: number, i: number) {
  g.save()
  g.translate(x, y)
  if (i % 3 === 0) {
    // Botol plastik hijau.
    g.fillStyle = '#66bb6a'
    rr(g, -4, -6, 8, 12, 3)
    g.fill()
    g.fillRect(-1.5, -10, 3, 5)
  } else if (i % 3 === 1) {
    // Kaleng.
    g.fillStyle = '#b0bec5'
    rr(g, -5, -6, 10, 12, 2)
    g.fill()
    g.fillStyle = '#78909c'
    g.fillRect(-5, -6, 10, 3)
  } else {
    // Bungkus.
    g.fillStyle = '#ff7043'
    g.beginPath()
    g.moveTo(0, -8)
    g.lineTo(7, 6)
    g.lineTo(-7, 6)
    g.closePath()
    g.fill()
  }
  g.restore()
}

function gambarPemain(g: CanvasRenderingContext2D, p: PemainState, reduced: boolean) {
  const bob = p.bergerak && !reduced ? Math.sin(p.fase) * 2 : 0
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(p.x, p.y + 13, 12, 4, 0, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.translate(p.x, p.y + bob)
  const langkah = p.bergerak && !reduced ? Math.sin(p.fase) * 3 : 0
  // Kaki.
  g.fillStyle = '#37474f'
  g.fillRect(-7, 8 + langkah * 0.3, 5, 8)
  g.fillRect(2, 8 - langkah * 0.3, 5, 8)
  // Badan (seragam putih, kerah hijau).
  g.fillStyle = '#f5f5f5'
  rr(g, -10, -4, 20, 15, 6)
  g.fill()
  g.fillStyle = '#2e7d32'
  g.fillRect(-10, -4, 20, 4)
  g.fillStyle = '#f5f5f5'
  g.fillRect(-13, -2, 4, 10)
  g.fillRect(9, -2, 4, 10)
  // Kepala + rambut.
  g.fillStyle = '#ffd9b3'
  g.beginPath()
  g.arc(0, -13, 10, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#4e342e'
  g.beginPath()
  g.arc(0, -14, 10, Math.PI, 0)
  g.fill()
  // Mata (tidak terlihat saat menghadap ke atas).
  if (p.arah !== 'atas') {
    const ex = p.arah === 'kiri' ? -2 : p.arah === 'kanan' ? 2 : 0
    g.fillStyle = '#212121'
    g.beginPath()
    g.arc(-3.5 + ex, -12, 1.4, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(3.5 + ex, -12, 1.4, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

function gambarNpc(g: CanvasRenderingContext2D, n: NpcJalan, disorot: boolean, reduced: boolean) {
  const bob = reduced ? 0 : Math.sin(n.fase) * 1.5
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(n.x, n.y + 13, 12, 4, 0, 0, Math.PI * 2)
  g.fill()
  if (disorot) {
    g.strokeStyle = '#ffd54a'
    g.lineWidth = 3
    g.beginPath()
    g.arc(n.x, n.y, 22, 0, Math.PI * 2)
    g.stroke()
  }
  g.save()
  g.translate(n.x, n.y + bob)
  if (n.nama === 'Magi') {
    // Larva maggot hijau bulat.
    g.fillStyle = '#8bc34a'
    g.beginPath()
    g.ellipse(0, 2, 13, 10, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#689f38'
    g.beginPath()
    g.ellipse(4, 2, 7, 8, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#558b2f'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(-4, -6)
    g.lineTo(-7, -13)
    g.moveTo(4, -6)
    g.lineTo(7, -13)
    g.stroke()
    g.fillStyle = '#558b2f'
    g.beginPath()
    g.arc(-7, -14, 2, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(7, -14, 2, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#212121'
    g.beginPath()
    g.arc(-4, 0, 1.8, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(4, 0, 1.8, 0, Math.PI * 2)
    g.fill()
  } else if (n.nama === 'Pak Plastik') {
    // Botol plastik putih.
    g.fillStyle = 'rgba(255,255,255,0.92)'
    rr(g, -8, -12, 16, 24, 6)
    g.fill()
    g.strokeStyle = '#90a4ae'
    g.lineWidth = 1.5
    rr(g, -8, -12, 16, 24, 6)
    g.stroke()
    g.fillStyle = '#29b6f6'
    g.fillRect(-3.5, -19, 7, 7)
    g.fillRect(-8, -1, 16, 6)
    g.fillStyle = '#37474f'
    g.beginPath()
    g.arc(-3, -7, 1.5, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(3, -7, 1.5, 0, Math.PI * 2)
    g.fill()
  } else {
    // Orang: badan warna khas + kepala.
    g.fillStyle = n.warna
    rr(g, -10, -4, 20, 16, 7)
    g.fill()
    if (n.nama === 'Kang Kantin') {
      g.fillStyle = '#ffffff'
      g.fillRect(-7, 0, 14, 11)
    }
    if (n.nama === 'Bu Sari') {
      g.fillStyle = '#fff59d'
      g.fillRect(4, 0, 9, 7)
    }
    g.fillStyle = '#ffd9b3'
    g.beginPath()
    g.arc(0, -13, 10, 0, Math.PI * 2)
    g.fill()
    if (n.nama === 'Pak Kebun') {
      // Topi lebar.
      g.fillStyle = '#8d6e63'
      g.beginPath()
      g.ellipse(0, -17, 14, 4, 0, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.arc(0, -19, 7, Math.PI, 0)
      g.fill()
    } else {
      g.fillStyle = '#4e342e'
      g.beginPath()
      g.arc(0, -14, 10, Math.PI, 0)
      g.fill()
    }
    g.fillStyle = '#212121'
    g.beginPath()
    g.arc(-3.5, -12, 1.4, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(3.5, -12, 1.4, 0, Math.PI * 2)
    g.fill()
  }
  // Label nama.
  g.font = 'bold 11px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'bottom'
  g.lineWidth = 3
  g.strokeStyle = 'rgba(0,0,0,0.65)'
  g.strokeText(n.nama, 0, -24)
  g.fillStyle = '#ffffff'
  g.fillText(n.nama, 0, -24)
  g.restore()
}

// ---------------------------------------------------------------- komponen ----

export function Jelajah({ onPlayChapter }: { onPlayChapter: (chapterId: ChapterId) => void }) {
  const { save, dispatch } = useCampaign()
  const [terkumpul, setTerkumpul] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [dialogNpc, setDialogNpc] = useState<NpcDunia | null>(null)
  const [dialogIdx, setDialogIdx] = useState(0)
  const [nearby, setNearby] = useState<NpcDunia | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticRef = useRef<HTMLCanvasElement | null>(null)
  const viewRef = useRef({ w: 0, h: 0 })
  const dprRef = useRef(1)
  const playerRef = useRef<PemainState>({
    x: DUNIA.spawn.x,
    y: DUNIA.spawn.y,
    arah: 'bawah',
    bergerak: false,
    fase: 0,
  })
  const npcsRef = useRef<NpcJalan[]>(
    NPCS.map((n) => ({
      ...n,
      x: n.x,
      y: n.y,
      homeX: n.x,
      homeY: n.y,
      sudut: Math.random() * Math.PI * 2,
      timer: 1 + Math.random() * 2,
      fase: Math.random() * Math.PI * 2,
    })),
  )
  const keysRef = useRef<Set<string>>(new Set())
  const joyRef = useRef({ aktif: false, id: null as number | null, vx: 0, vy: 0 })
  const tapRef = useRef<{ id: number; x: number; y: number; t: number } | null>(null)
  const sentuhRef = useRef(false)
  const trashRef = useRef<boolean[]>(DUNIA.sampah.map(() => false))
  const popsRef = useRef<{ x: number; y: number; t: number }[]>([])
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const dialogRef = useRef<NpcDunia | null>(null)
  const dialogIdxRef = useRef(0)
  const nearbyRef = useRef<string | null>(null)
  const zoneRef = useRef<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedRef = useRef(false)
  const saveRef = useRef(save)
  saveRef.current = save

  const showToast = (teks: string) => {
    setToast(teks)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 1600)
  }

  const bukaDialog = (npc: NpcDunia) => {
    klik()
    dialogRef.current = npc
    dialogIdxRef.current = 0
    setDialogNpc(npc)
    setDialogIdx(0)
    if (npc.nama === 'Magi') playMumble('Magi')
    else if (npc.nama === 'Pak Plastik') playMumble('Pak Plastik')
  }

  const tutupDialog = () => {
    dialogRef.current = null
    setDialogNpc(null)
    setDialogIdx(0)
  }

  const lanjutDialog = () => {
    const npc = dialogRef.current
    if (!npc) return
    const konten = DIALOG_NPC[npc.id]
    const total = 1 + (konten?.baris.length ?? 0)
    const next = Math.min(dialogIdxRef.current + 1, total - 1)
    dialogIdxRef.current = next
    setDialogIdx(next)
    klik()
  }

  const bukaDialogRef = useRef(bukaDialog)
  const tutupDialogRef = useRef(tutupDialog)
  const lanjutDialogRef = useRef(lanjutDialog)
  bukaDialogRef.current = bukaDialog
  tutupDialogRef.current = tutupDialog
  lanjutDialogRef.current = lanjutDialog

  const toggleBisukan = () => {
    const next = !save.muted
    dispatch({ type: 'SET_MUTED', muted: next })
    setSuaraMuted(next)
    if (!next) klik()
  }

  // Ukuran canvas mengikuti lebar layar (devicePixelRatio).
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const atur = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      dprRef.current = dpr
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      viewRef.current = { w, h }
    }
    atur()
    const ro = new ResizeObserver(atur)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  // prefers-reduced-motion: matikan goyangan dan NPC berkeliaran.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const onChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Loop utama: update + gambar + keyboard + jeda saat tab disembunyikan.
  useEffect(() => {
    staticRef.current = bangunStatis()

    const update = (dt: number) => {
      const p = playerRef.current
      const dialogTerbuka = dialogRef.current !== null
      let vx = 0
      let vy = 0
      const keys = keysRef.current
      if (keys.has('a') || keys.has('arrowleft')) vx -= 1
      if (keys.has('d') || keys.has('arrowright')) vx += 1
      if (keys.has('w') || keys.has('arrowup')) vy -= 1
      if (keys.has('s') || keys.has('arrowdown')) vy += 1
      if (joyRef.current.aktif) {
        vx += joyRef.current.vx
        vy += joyRef.current.vy
      }
      const panjang = Math.hypot(vx, vy)
      const bergerak = panjang > 0.01 && !dialogTerbuka
      if (bergerak) {
        vx /= Math.max(1, panjang)
        vy /= Math.max(1, panjang)
        const nx = p.x + vx * KECEPATAN * dt
        const ny = p.y + vy * KECEPATAN * dt
        // Pindah per sumbu supaya bisa geser di sepanjang dinding.
        if (!tabrakan(nx, p.y, RADIUS_PEMAIN)) p.x = nx
        if (!tabrakan(p.x, ny, RADIUS_PEMAIN)) p.y = ny
        p.fase += dt * 10
        p.arah =
          Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'kanan' : 'kiri') : vy > 0 ? 'bawah' : 'atas'
      }
      p.bergerak = bergerak

      // NPC berkeliaran (dijeda saat dialog terbuka / reduced motion).
      for (const n of npcsRef.current) {
        if (!n.gerak || reducedRef.current || dialogTerbuka) continue
        n.timer -= dt
        if (n.timer <= 0) {
          n.sudut = Math.random() * Math.PI * 2
          n.timer = 2 + Math.random() * 2.5
        }
        const nx = n.x + Math.cos(n.sudut) * 22 * dt
        const ny = n.y + Math.sin(n.sudut) * 22 * dt
        const radius = n.radiusGerak ?? 60
        if (Math.hypot(nx - n.homeX, ny - n.homeY) > radius) {
          n.sudut = Math.atan2(n.homeY - n.y, n.homeX - n.x)
          n.timer = 1
        } else if (!tabrakan(nx, ny, 12)) {
          n.x = nx
          n.y = ny
        } else {
          n.timer = 0
        }
        n.fase += dt * 6
      }

      // Pungut sampah (dijeda saat dialog terbuka).
      if (!dialogTerbuka) {
        for (let i = 0; i < DUNIA.sampah.length; i++) {
          if (trashRef.current[i]) continue
          const s = DUNIA.sampah[i]
          if (Math.hypot(s.x - p.x, s.y - p.y) < 26) {
            trashRef.current[i] = true
            popsRef.current.push({ x: s.x, y: s.y, t: 0 })
            dispatch({ type: 'EARN_COINS', amount: 5 })
            koin()
            setTerkumpul((n) => n + 1)
          }
        }
      }
      popsRef.current = popsRef.current.filter((pp) => (pp.t += dt) < 0.6)

      // NPC terdekat untuk tombol Bicara.
      let terdekat: NpcJalan | null = null
      let jarakTerdekat = JARAK_BICARA
      for (const n of npcsRef.current) {
        const d = Math.hypot(n.x - p.x, n.y - p.y)
        if (d < jarakTerdekat) {
          jarakTerdekat = d
          terdekat = n
        }
      }
      const idTerdekat = terdekat ? terdekat.id : null
      if (idTerdekat !== nearbyRef.current) {
        nearbyRef.current = idTerdekat
        setNearby(terdekat)
      }

      // Toast saat masuk zona baru.
      const zona = DUNIA.zona.find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h)
      const zonaId = zona ? zona.id : null
      if (zonaId !== zoneRef.current) {
        zoneRef.current = zonaId
        if (zona) {
          pindah()
          showToast(zona.nama)
        }
      }
    }

    const draw = (t: number) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      const view = viewRef.current
      if (!canvas || !ctx || view.w <= 0 || view.h <= 0) return
      const dpr = dprRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, view.w, view.h)
      const p = playerRef.current
      const camX = jepitKamera(p.x - view.w / 2, view.w, DUNIA.lebar)
      const camY = jepitKamera(p.y - view.h / 2, view.h, DUNIA.tinggi)
      ctx.save()
      ctx.translate(-camX, -camY)
      const statis = staticRef.current
      if (statis) {
        ctx.drawImage(statis, camX, camY, view.w, view.h, camX, camY, view.w, view.h)
      }
      // Zona bab yang masih terkunci tampil pudar.
      const saveSekarang = saveRef.current
      for (const z of DUNIA.zona) {
        if (z.chapterId && !selectChapterUnlocked(saveSekarang, z.chapterId)) {
          ctx.fillStyle = 'rgba(10,20,12,0.45)'
          rr(ctx, z.x, z.y, z.w, z.h, 14)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 13px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('Terkunci', z.x + z.w / 2, z.y + z.h / 2)
        }
      }
      // Sampah berkilau.
      const detik = t / 1000
      DUNIA.sampah.forEach((s, i) => {
        if (trashRef.current[i]) return
        const denyut = reducedRef.current ? 0.7 : 0.55 + 0.35 * Math.sin(detik * 3 + i * 1.3)
        ctx.globalAlpha = denyut
        ctx.fillStyle = '#ffd54a'
        ctx.beginPath()
        ctx.arc(s.x, s.y - 11, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        gambarSampah(ctx, s.x, s.y, i)
      })
      // Efek pop saat memungut.
      for (const pp of popsRef.current) {
        const k = pp.t / 0.6
        ctx.globalAlpha = Math.max(0, 1 - k)
        ctx.strokeStyle = '#ffd54a'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(pp.x, pp.y, 6 + k * 18, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 13px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('+5', pp.x, pp.y - 16 - k * 16)
        ctx.globalAlpha = 1
      }
      // NPC + pemain diurutkan sumbu Y supaya yang di depan menutupi yang di belakang.
      const dekatId = nearbyRef.current
      const reduced = reducedRef.current
      const aktor: { y: number; gambar: () => void }[] = []
      for (const n of npcsRef.current) {
        aktor.push({ y: n.y, gambar: () => gambarNpc(ctx, n, n.id === dekatId, reduced) })
      }
      aktor.push({ y: p.y, gambar: () => gambarPemain(ctx, p, reduced) })
      aktor.sort((a, b) => a.y - b.y)
      for (const a of aktor) a.gambar()
      ctx.restore()

      // Joystick (hanya tampil setelah sentuhan pertama, supaya tidak
      // mengganggu tampilan di laptop).
      if (sentuhRef.current) {
        const joy = joyRef.current
        const cx = 84
        const cy = view.h - 84
        ctx.globalAlpha = 0.16
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(cx, cy, JARI_JOYSTICK, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.4
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, JARI_JOYSTICK, 0, Math.PI * 2)
        ctx.stroke()
        if (joy.aktif) {
          ctx.globalAlpha = 0.6
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(cx + joy.vx * 34, cy + joy.vy * 34, 22, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }

    const frame = (t: number) => {
      const dt = Math.min(0.05, Math.max(0, (t - lastRef.current) / 1000))
      lastRef.current = t
      update(dt)
      draw(t)
      rafRef.current = requestAnimationFrame(frame)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const key = e.key.toLowerCase()
      if (key === 'escape') {
        tutupDialogRef.current()
        return
      }
      const diTombol = tag === 'BUTTON'
      if (key.startsWith('arrow')) {
        e.preventDefault()
        keysRef.current.add(key)
        return
      }
      if (key === ' ') {
        if (!diTombol) e.preventDefault()
        if (diTombol) return
        if (dialogRef.current) {
          lanjutDialogRef.current()
          return
        }
        const dekat = npcsRef.current.find((n) => n.id === nearbyRef.current)
        if (dekat) bukaDialogRef.current(dekat)
        return
      }
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keysRef.current.add(key)
        return
      }
      if (diTombol) return
      if (dialogRef.current) {
        if (key === 'e' || key === 'enter') lanjutDialogRef.current()
        return
      }
      if (key === 'e' || key === 'enter') {
        const dekat = npcsRef.current.find((n) => n.id === nearbyRef.current)
        if (dekat) bukaDialogRef.current(dekat)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    const onBlur = () => {
      keysRef.current.clear()
      joyRef.current = { aktif: false, id: null, vx: 0, vy: 0 }
    }
    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      } else {
        lastRef.current = performance.now()
        if (!rafRef.current) rafRef.current = requestAnimationFrame(frame)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // ---------------------------------------------------------- pointer ----

  const posisiPointer = (e: React.PointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') sentuhRef.current = true
    if (dialogRef.current) return
    if ((e.target as HTMLElement).closest('button')) return
    const pos = posisiPointer(e)
    const view = viewRef.current
    const jx = 84
    const jy = view.h - 84
    if (Math.hypot(pos.x - jx, pos.y - jy) < 80) {
      joyRef.current = { aktif: true, id: e.pointerId, vx: 0, vy: 0 }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    tapRef.current = { id: e.pointerId, x: pos.x, y: pos.y, t: performance.now() }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const joy = joyRef.current
    if (!joy.aktif || joy.id !== e.pointerId) return
    const pos = posisiPointer(e)
    const view = viewRef.current
    let dx = (pos.x - 84) / JARI_JOYSTICK
    let dy = (pos.y - (view.h - 84)) / JARI_JOYSTICK
    const panjang = Math.hypot(dx, dy)
    if (panjang > 1) {
      dx /= panjang
      dy /= panjang
    }
    joy.vx = dx
    joy.vy = dy
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const joy = joyRef.current
    if (joy.aktif && joy.id === e.pointerId) {
      joyRef.current = { aktif: false, id: null, vx: 0, vy: 0 }
      return
    }
    const tap = tapRef.current
    if (!tap || tap.id !== e.pointerId) return
    tapRef.current = null
    if (dialogRef.current) return
    const pos = posisiPointer(e)
    if (performance.now() - tap.t > 350 || Math.hypot(pos.x - tap.x, pos.y - tap.y) > 14) return
    // Ketuk NPC di canvas.
    const p = playerRef.current
    const view = viewRef.current
    const camX = jepitKamera(p.x - view.w / 2, view.w, DUNIA.lebar)
    const camY = jepitKamera(p.y - view.h / 2, view.h, DUNIA.tinggi)
    const wx = pos.x + camX
    const wy = pos.y + camY
    const npc = npcsRef.current.find((n) => Math.hypot(n.x - wx, n.y - wy) < 46)
    if (!npc) return
    if (Math.hypot(npc.x - p.x, npc.y - p.y) <= JARAK_BICARA) bukaDialog(npc)
    else showToast(`Dekati ${npc.nama} dulu untuk bicara`)
  }

  // ------------------------------------------------------------ render ----

  const kontenDialog = dialogNpc ? DIALOG_NPC[dialogNpc.id] : undefined
  const barisDialog = dialogNpc
    ? [kontenDialog?.sapaan ?? 'Halo!', ...(kontenDialog?.baris ?? ['Senang bertemu denganmu!'])]
    : []
  const babNpc: ChapterId | null = dialogNpc?.chapterId ?? null
  const babTerbuka = babNpc ? selectChapterUnlocked(save, babNpc) : false
  const diAkhir = dialogIdx >= barisDialog.length - 1

  return (
    <div className="aia-stack">
      <div className="aia-progress-row">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Coins aria-hidden="true" /> {save.coins} Koin Hijau
        </span>
        <span>
          Sampah dipungut {terkumpul}/{DUNIA.sampah.length}
        </span>
        <button
          type="button"
          className="aia-icon-btn"
          onClick={toggleBisukan}
          aria-label={save.muted ? 'Nyalakan suara' : 'Bisukan suara'}
          aria-pressed={save.muted}
        >
          {save.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
      </div>

      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          height: 'min(62vh, 520px)',
          minHeight: 360,
          borderRadius: 16,
          overflow: 'hidden',
          touchAction: 'none',
          background: '#7cb85c',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
          aria-label="Peta sekolah yang bisa dijelajahi"
        />

        {toast && (
          <div
            style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 4 }}
            role="status"
            aria-live="polite"
          >
            <span className="aia-chip">{toast}</span>
          </div>
        )}

        {nearby && !dialogNpc && (
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 4 }}
            onClick={() => bukaDialog(nearby)}
            aria-label={`Bicara dengan ${nearby.nama}`}
          >
            <MessageCircle aria-hidden="true" /> Bicara
          </button>
        )}

        {dialogNpc && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Bicara dengan ${dialogNpc.nama}`}
            style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 5 }}
          >
            <section className="aia-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span className="aia-kicker">{dialogNpc.peran}</span>
                  <h3 className="aia-section-title" style={{ margin: 0 }}>
                    {dialogNpc.nama}
                  </h3>
                </div>
                <button type="button" className="aia-icon-btn" onClick={tutupDialog} aria-label="Tutup dialog">
                  <X aria-hidden="true" />
                </button>
              </div>
              <p>{barisDialog[dialogIdx]}</p>
              {diAkhir ? (
                <>
                  {kontenDialog?.tips && <p className="aia-muted">{kontenDialog.tips}</p>}
                  <div className="aia-actions">
                    {babNpc && babTerbuka ? (
                      <button
                        type="button"
                        className="aia-btn aia-btn-primary"
                        onClick={() => {
                          klik()
                          onPlayChapter(babNpc)
                        }}
                      >
                        Main bab: {CHAPTERS[babNpc].judul}
                      </button>
                    ) : babNpc ? (
                      <p className="aia-muted">Selesaikan bab sebelumnya dulu untuk membuka bab ini.</p>
                    ) : null}
                    <button type="button" className="aia-btn aia-btn-ghost" onClick={tutupDialog}>
                      Tutup
                    </button>
                  </div>
                </>
              ) : (
                <div className="aia-actions">
                  <button type="button" className="aia-btn aia-btn-primary" onClick={lanjutDialog}>
                    Lanjut
                  </button>
                  <button type="button" className="aia-btn aia-btn-ghost" onClick={tutupDialog}>
                    Tutup
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <p className="aia-muted">
        Gerakkan tokoh dengan joystick kiri bawah atau tombol WASD/panah. Dekati NPC lalu ketuk "Bicara" atau tekan E.
        Pungut sampah yang berserakan untuk Koin Hijau.
      </p>
    </div>
  )
}
