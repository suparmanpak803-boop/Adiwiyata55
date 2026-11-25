'use client'

// Peta "Rumah" — titik awal permainan. Interior rumah top-down di Canvas 2D
// (640x480), pola yang sama seperti Jelajah: joystick virtual (sentuh),
// WASD/panah (keyboard), klik peta (mouse, click-to-move), collision
// dinding/furnitur, interaksi Spasi/Enter/tombol Aksi, dan HUD yang sama.
// Tokoh pemain digambar dengan gambarPemain yang sama (gender-aware).
// Kasur = checkpoint (pulih + auto-save lewat provider), kulkas = minum
// gratis, Ibu = uang saku Rp5.000 + sarapan 1x per hari kalender lokal,
// pintu = berangkat ke sekolah.

import { useEffect, useRef, useState } from 'react'
import {
  Award,
  BedDouble,
  Coins,
  DoorOpen,
  MessageCircle,
  Refrigerator,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { hariIniLokal } from '@/lib/apa-itu-adiwiyata/content/hadiah-harian'
import { warnaKostum } from '@/lib/apa-itu-adiwiyata/content/toko'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { gambarBayangan, gambarPemain, rr, type PemainState } from '@/lib/apa-itu-adiwiyata/gambar-pemain'
import { buatKamera, perbaruiKamera } from '@/lib/apa-itu-adiwiyata/kamera'
import { AngkaAnimasi, HudStatus } from './hud-dunia'
import { duckMusik, klik, koin, pindah, setSuaraMuted, unduckMusik } from './suara'

const KECEPATAN = 160 // unit dunia per detik
const JARAK_INTERAKSI = 56
const RADIUS_PEMAIN = 14
const JARI_JOYSTICK = 52

const RUMAH = { lebar: 640, tinggi: 480, spawn: { x: 320, y: 400 } }

/** Dinding/furnitur yang tidak bisa dilewati (tepi + kasur + lemari +
 * kulkas + meja). Pintu tidak ada di sini: dinding bawah menahannya. */
const DINDING = [
  { x: 0, y: 0, w: 640, h: 12 },
  { x: 0, y: 468, w: 640, h: 12 },
  { x: 0, y: 0, w: 12, h: 480 },
  { x: 628, y: 0, w: 12, h: 480 },
  { x: 40, y: 48, w: 120, h: 72 }, // kasur
  { x: 200, y: 40, w: 84, h: 56 }, // lemari
  { x: 520, y: 40, w: 64, h: 84 }, // kulkas
  { x: 270, y: 210, w: 110, h: 72 }, // meja makan
]

type ObjekId = 'kasur' | 'kulkas' | 'meja' | 'ibu' | 'pintu'

interface ObjekRumah {
  id: ObjekId
  nama: string
  /** Titik interaksi (di luar furnitur, bisa dicapai pemain). */
  x: number
  y: number
  aksi: string
}

/** Titik interaksi tiap objek: kasur/kulkas di bawah furnitur, meja di
 * bawah meja, Ibu di posisinya, pintu di depan pintu. */
const OBJEK: ObjekRumah[] = [
  { id: 'kasur', nama: 'Kasur', x: 100, y: 144, aksi: 'Istirahat' },
  { id: 'kulkas', nama: 'Kulkas', x: 552, y: 148, aksi: 'Minum' },
  { id: 'meja', nama: 'Meja Makan', x: 325, y: 306, aksi: 'Lihat' },
  { id: 'ibu', nama: 'Ibu', x: 440, y: 250, aksi: 'Bicara' },
  { id: 'pintu', nama: 'Pintu', x: 320, y: 424, aksi: 'Berangkat ke Sekolah' },
]

const POSISI_IBU = { x: 440, y: 250 }

const DIALOG_MEJA = [
  'Di atas meja ada piring dan gelas yang sudah dicuci bersih.',
  'Meja makan selalu rapi sebelum kamu berangkat.',
]

const DIALOG_IBU_BELUM = [
  'Pagi! Sarapan dulu, uang sakumu sudah Ibu siapkan.',
  'Jangan lupa bawa tumbler dan bekalmu, ya.',
]

const DIALOG_IBU_SUDAH = [
  'Uang saku dan sarapan hari ini sudah kamu terima.',
  'Hati-hati di jalan, pulang sebelum gelap ya.',
]

/** Target click-to-move (mouse): titik dunia + objek yang dituju (bila ada). */
interface TujuanJalan {
  x: number
  y: number
  objekId?: ObjekId
  /** Detik pemain diam padahal sedang berjalan ke target (macet di dinding). */
  macet: number
  terakhirX: number
  terakhirY: number
}

function tabrakan(x: number, y: number, r: number): boolean {
  if (x < r || y < r || x > RUMAH.lebar - r || y > RUMAH.tinggi - r) return true
  for (const d of DINDING) {
    if (x + r > d.x && x - r < d.x + d.w && y + r > d.y && y - r < d.y + d.h) return true
  }
  return false
}

/** true bila lebar pandang canvas < 480px (HP sempit) — dipakai untuk
 * mengecilkan label interior supaya tidak bertumpuk. */
function pandangSempit(viewW: number): boolean {
  const w = viewW > 0 ? viewW : typeof window !== 'undefined' ? window.innerWidth : 1024
  return w < 480
}

/** Lapisan statis interior rumah (P2) — digambar SEKALI ke offscreen
 * canvas saat rumah dibuka, lalu tiap frame tinggal `drawImage`.
 *
 * STATIS (masuk prerender): lantai kayu, karpet, dinding + jendela, kasur,
 * lemari, kulkas, meja makan (+ bayangannya), pintu, dan Ibu — Ibu tidak
 * pernah berpindah tempat, jadi ia bagian dari latar, bukan aktor.
 * DINAMIS (tetap digambar tiap frame, TIDAK masuk prerender): pemain,
 * cincin sorot emas di objek terdekat, dan joystick virtual.
 * Satu-satunya isi statis yang bisa berubah adalah tanda "!" di atas Ibu
 * (`sudahDiberi` — hilang setelah uang saku hari ini diterima); lapisan
 * dibangun ulang bila nilai itu berubah (lihat efek di bawah). `sempit` =
 * lebar pandang < 480px: label objek diperkecil; dibangun ulang bila lebar
 * melewati ambang 480px (di atur()). */
function bangunStatis(sudahDiberi: boolean, sempit = false): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = RUMAH.lebar
  c.height = RUMAH.tinggi
  const g = c.getContext('2d')
  if (!g) return c

  // Lantai kayu.
  g.fillStyle = '#e8c890'
  g.fillRect(0, 0, RUMAH.lebar, RUMAH.tinggi)
  g.fillStyle = 'rgba(0,0,0,0.05)'
  for (let y = 32; y < RUMAH.tinggi; y += 32) g.fillRect(0, y, RUMAH.lebar, 2)

  // Karpet tengah.
  g.fillStyle = '#c96f4a'
  g.beginPath()
  g.ellipse(320, 360, 70, 30, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#a85438'
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(320, 360, 70, 30, 0, 0, Math.PI * 2)
  g.stroke()

  // Dinding tepi.
  for (const d of DINDING.slice(0, 4)) {
    g.fillStyle = '#bcaaa4'
    g.fillRect(d.x, d.y, d.w, d.h)
  }
  // Jendela di dinding atas.
  g.fillStyle = '#b3e5fc'
  g.fillRect(300, 6, 80, 30)
  g.strokeStyle = '#ffffff'
  g.lineWidth = 3
  g.strokeRect(300, 6, 80, 30)
  g.beginPath()
  g.moveTo(340, 6)
  g.lineTo(340, 36)
  g.moveTo(300, 21)
  g.lineTo(380, 21)
  g.stroke()

  const label = (teks: string, cx: number, cy: number) => {
    g.font = sempit ? 'bold 11px system-ui, sans-serif' : 'bold 12px system-ui, sans-serif'
    const lebarTeks = g.measureText(teks).width
    g.fillStyle = 'rgba(0,0,0,0.55)'
    rr(g, cx - lebarTeks / 2 - 8, cy - 11, lebarTeks + 16, 22, 11)
    g.fill()
    g.fillStyle = '#ffffff'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(teks, cx, cy + 1)
  }

  // Kasur: rangka + kasur + bantal + selimut.
  // Bayangan alas di bawah kasur supaya kasur "menapak" di lantai.
  gambarBayangan(g, 100, 122, 56, 5)
  g.fillStyle = '#8d6e63'
  rr(g, 40, 48, 120, 72, 8)
  g.fill()
  g.fillStyle = '#eceff1'
  rr(g, 48, 56, 104, 56, 6)
  g.fill()
  g.fillStyle = '#ffffff'
  rr(g, 52, 60, 30, 22, 6)
  g.fill()
  g.fillStyle = '#4d8a4f'
  rr(g, 48, 88, 104, 24, 6)
  g.fill()
  label('Kasur', 100, 136)

  // Lemari: badan + dua pintu + kenop.
  // Bayangan alas di bawah lemari.
  gambarBayangan(g, 242, 98, 42, 5)
  g.fillStyle = '#6d4c41'
  rr(g, 200, 40, 84, 56, 6)
  g.fill()
  g.strokeStyle = '#4e342e'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(242, 44)
  g.lineTo(242, 92)
  g.stroke()
  g.fillStyle = '#ffd54a'
  g.beginPath()
  g.arc(236, 68, 2.5, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.arc(248, 68, 2.5, 0, Math.PI * 2)
  g.fill()

  // Kulkas: badan + dua pintu + gagang.
  // Bayangan alas di bawah kulkas.
  gambarBayangan(g, 552, 126, 32, 4)
  g.fillStyle = '#cfd8dc'
  rr(g, 520, 40, 64, 84, 8)
  g.fill()
  g.strokeStyle = '#90a4ae'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(520, 76)
  g.lineTo(584, 76)
  g.stroke()
  rr(g, 520, 40, 64, 84, 8)
  g.stroke()
  g.fillStyle = '#78909c'
  g.fillRect(576, 48, 4, 16)
  g.fillRect(576, 84, 4, 16)
  label('Kulkas', 552, 140)

  // Meja makan: meja + piring.
  // Bayangan alas di bawah meja.
  gambarBayangan(g, 325, 284, 56, 7)
  g.fillStyle = '#8d6e63'
  rr(g, 270, 210, 110, 72, 10)
  g.fill()
  g.fillStyle = '#a1887f'
  g.fillRect(274, 214, 102, 10)
  g.fillStyle = '#ffffff'
  for (const [px, py] of [
    [300, 246],
    [350, 246],
  ] as const) {
    g.beginPath()
    g.arc(px, py, 9, 0, Math.PI * 2)
    g.fill()
  }
  label('Meja Makan', 325, 298)

  // Pintu di dinding bawah: daun pintu + kenop + label.
  g.fillStyle = '#6d4c41'
  g.fillRect(290, 440, 60, 40)
  g.strokeStyle = '#4e342e'
  g.lineWidth = 2
  g.strokeRect(290, 440, 60, 40)
  g.fillStyle = '#ffd54a'
  g.beginPath()
  g.arc(342, 460, 3, 0, Math.PI * 2)
  g.fill()
  label('Ke Sekolah', 320, 432)

  // Ibu: berdiri di samping meja (gaun + celemek + kepala).
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(POSISI_IBU.x, POSISI_IBU.y + 13, 12, 4, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#7b5ea7'
  g.beginPath()
  g.moveTo(POSISI_IBU.x - 10, POSISI_IBU.y + 14)
  g.lineTo(POSISI_IBU.x + 10, POSISI_IBU.y + 14)
  g.lineTo(POSISI_IBU.x + 7, POSISI_IBU.y - 4)
  g.lineTo(POSISI_IBU.x - 7, POSISI_IBU.y - 4)
  g.closePath()
  g.fill()
  g.fillStyle = '#ffffff'
  g.fillRect(POSISI_IBU.x - 6, POSISI_IBU.y + 2, 12, 10)
  g.fillStyle = '#ffd9b3'
  g.beginPath()
  g.arc(POSISI_IBU.x, POSISI_IBU.y - 13, 10, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#4e342e'
  g.beginPath()
  g.arc(POSISI_IBU.x, POSISI_IBU.y - 14, 10, Math.PI, 0)
  g.fill()
  g.fillStyle = '#212121'
  g.beginPath()
  g.arc(POSISI_IBU.x - 3.5, POSISI_IBU.y - 12, 1.4, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.arc(POSISI_IBU.x + 3.5, POSISI_IBU.y - 12, 1.4, 0, Math.PI * 2)
  g.fill()
  g.font = sempit ? 'bold 10px system-ui, sans-serif' : 'bold 11px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'bottom'
  g.lineWidth = 3
  g.strokeStyle = 'rgba(0,0,0,0.65)'
  g.strokeText('Ibu', POSISI_IBU.x, POSISI_IBU.y - 24)
  g.fillStyle = '#ffffff'
  g.fillText('Ibu', POSISI_IBU.x, POSISI_IBU.y - 24)
  // Tanda "!" bila uang saku hari ini belum diterima.
  if (!sudahDiberi) {
    g.fillStyle = '#ffd54a'
    g.beginPath()
    g.arc(POSISI_IBU.x, POSISI_IBU.y - 42, 9, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#8d6e00'
    g.lineWidth = 1.5
    g.stroke()
    g.fillStyle = '#4e342e'
    g.font = 'bold 12px system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('!', POSISI_IBU.x, POSISI_IBU.y - 42)
  }

  return c
}

export function Rumah({
  onBerangkat,
  onOpenPanduan,
  onKeKantin,
}: {
  /** Berangkat ke sekolah (pindah peta, lewat pintu). */
  onBerangkat: () => void
  /** Buka panduan Cara Bermain (overlay dari runner). */
  onOpenPanduan: () => void
  /** Jalan pintas ke Kantin dari peringatan Lapar/Haus rendah. */
  onKeKantin: () => void
}) {
  const { save, dispatch } = useCampaign()
  const [toast, setToast] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ id: ObjekId; baris: string[] } | null>(null)
  const [dialogIdx, setDialogIdx] = useState(0)
  const [dekat, setDekat] = useState<ObjekRumah | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticRef = useRef<HTMLCanvasElement | null>(null)
  /** Varian lebar terakhir yang dipakai lapisan statis (null = belum ada
   * lapisan): dipakai atur() untuk membangun ulang hanya bila lebar
   * melewati ambang 480px. */
  const sempitRef = useRef<boolean | null>(null)
  const viewRef = useRef({ w: 0, h: 0 })
  const dprRef = useRef(1)
  const playerRef = useRef<PemainState>({
    x: RUMAH.spawn.x,
    y: RUMAH.spawn.y,
    arah: 'atas',
    bergerak: false,
    fase: 0,
  })
  const keysRef = useRef<Set<string>>(new Set())
  const joyRef = useRef({ aktif: false, id: null as number | null, vx: 0, vy: 0 })
  const tapRef = useRef<{ id: number; x: number; y: number; t: number } | null>(null)
  const tujuanRef = useRef<TujuanJalan | null>(null)
  const coarseRef = useRef(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  /** Kamera halus (smoothing + deadzone + look-ahead); baru dibuat tiap
   * komponen dipasang, jadi frame pertama langsung hard-cut ke pemain. */
  const camRef = useRef(buatKamera())
  const dialogRef = useRef<{ id: ObjekId; baris: string[] } | null>(null)
  const dialogIdxRef = useRef(0)
  const dekatRef = useRef<ObjekId | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedRef = useRef(false)
  const saveRef = useRef(save)
  saveRef.current = save

  const hariIni = hariIniLokal()
  const sudahDiberi = (save.ibuTanggal ?? null) === hariIni

  const showToast = (teks: string) => {
    setToast(teks)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 1600)
  }

  const bukaDialog = (id: ObjekId, baris: string[]) => {
    klik()
    dialogRef.current = { id, baris }
    dialogIdxRef.current = 0
    setDialog({ id, baris })
    setDialogIdx(0)
  }

  const tutupDialog = () => {
    dialogRef.current = null
    setDialog(null)
    setDialogIdx(0)
  }

  const lanjutDialog = () => {
    const d = dialogRef.current
    if (!d) return
    const next = Math.min(dialogIdxRef.current + 1, d.baris.length - 1)
    dialogIdxRef.current = next
    setDialogIdx(next)
    klik()
  }

  /** Aksi tiap objek: kasur/kulkas/pintu langsung, meja/Ibu lewat dialog. */
  const jalankanAksi = (objek: ObjekRumah) => {
    if (dialogRef.current) return
    switch (objek.id) {
      case 'kasur':
        klik()
        dispatch({ type: 'PULIHKAN', lapar: 30, haus: 30 })
        showToast('Kamu istirahat sebentar. Lapar +30, Haus +30. Progres tersimpan.')
        break
      case 'kulkas':
        klik()
        dispatch({ type: 'PULIHKAN', haus: 30 })
        showToast('Kamu minum air dingin dari kulkas. Haus +30.')
        break
      case 'meja':
        bukaDialog('meja', DIALOG_MEJA)
        break
      case 'ibu':
        bukaDialog('ibu', sudahDiberi ? DIALOG_IBU_SUDAH : DIALOG_IBU_BELUM)
        break
      case 'pintu':
        pindah()
        onBerangkat()
        break
    }
  }

  /** Terima uang saku + sarapan dari Ibu (atomik 1x sehari di reducer). */
  const terimaUangSaku = () => {
    if (sudahDiberi) return
    koin()
    dispatch({ type: 'TERIMA_UANG_SAKU', hariIni })
    tutupDialog()
    showToast('Ibu memberimu Rp5.000 dan sarapan. Lapar +40.')
  }

  const jalankanAksiRef = useRef(jalankanAksi)
  const tutupDialogRef = useRef(tutupDialog)
  const lanjutDialogRef = useRef(lanjutDialog)
  jalankanAksiRef.current = jalankanAksi
  tutupDialogRef.current = tutupDialog
  lanjutDialogRef.current = lanjutDialog

  const toggleBisukan = () => {
    const next = !save.muted
    dispatch({ type: 'SET_MUTED', muted: next })
    setSuaraMuted(next)
    if (!next) klik()
  }

  // Ducking musik (A2): selagi dialog Ibu / meja terbuka, musik turun
  // −12 dB; kembali normal saat ditutup.
  const dialogTerbuka = dialog !== null
  useEffect(() => {
    if (!dialogTerbuka) return
    duckMusik()
    return () => unduckMusik()
  }, [dialogTerbuka])

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
      // Prerender (P2): label statis digambar dalam dua varian (sempit /
      // lega, ambang 480px). Bila lebar melewati ambang saat resize/rotasi,
      // bangun ulang sekali supaya label tidak tertahan di varian lama.
      const sempit = pandangSempit(w)
      if (staticRef.current && sempitRef.current !== null && sempit !== sempitRef.current) {
        staticRef.current = bangunStatis(saveRef.current.ibuTanggal === hariIniLokal(), sempit)
      }
      sempitRef.current = sempit
    }
    atur()
    const ro = new ResizeObserver(atur)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  // prefers-reduced-motion: matikan goyangan jalan.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const onChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Perangkat sentuh vs laptop: joystick hanya untuk pointer coarse,
  // hint keyboard hanya untuk pointer fine.
  useEffect(() => {
    const mqCoarse = window.matchMedia('(pointer: coarse)')
    const mqFine = window.matchMedia('(pointer: fine)')
    const perbarui = () => {
      coarseRef.current = mqCoarse.matches
      setIsDesktop(mqFine.matches)
    }
    perbarui()
    mqCoarse.addEventListener('change', perbarui)
    mqFine.addEventListener('change', perbarui)
    return () => {
      mqCoarse.removeEventListener('change', perbarui)
      mqFine.removeEventListener('change', perbarui)
    }
  }, [])

  // Lapisan statis digambar ulang bila status uang saku berubah (tanda "!").
  useEffect(() => {
    staticRef.current = bangunStatis(sudahDiberi, pandangSempit(viewRef.current.w))
    sempitRef.current = pandangSempit(viewRef.current.w)
  }, [sudahDiberi])

  // Loop utama: update + gambar + keyboard + jeda saat tab disembunyikan.
  useEffect(() => {
    staticRef.current = bangunStatis(saveRef.current.ibuTanggal === hariIniLokal(), pandangSempit(viewRef.current.w))
    sempitRef.current = pandangSempit(viewRef.current.w)

    const update = (dt: number) => {
      const p = playerRef.current
      const dialogTerbuka = dialogRef.current !== null
      if (dialogTerbuka) tujuanRef.current = null
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
      // Input manual membatalkan click-to-move; tanpa input manual, tokoh
      // berjalan sendiri menuju target klik (lalu menjalankan aksinya).
      if (Math.hypot(vx, vy) > 0.01) {
        tujuanRef.current = null
      } else if (tujuanRef.current && !dialogTerbuka) {
        const tujuan = tujuanRef.current
        const dx = tujuan.x - p.x
        const dy = tujuan.y - p.y
        const jarak = Math.hypot(dx, dy)
        if (jarak <= 10) {
          tujuanRef.current = null
          if (tujuan.objekId) {
            const objek = OBJEK.find((o) => o.id === tujuan.objekId)
            if (objek) jalankanAksiRef.current(objek)
          }
        } else {
          vx = dx / jarak
          vy = dy / jarak
        }
      }
      const panjang = Math.hypot(vx, vy)
      const bergerak = panjang > 0.01 && !dialogTerbuka
      if (bergerak) {
        vx /= Math.max(1, panjang)
        vy /= Math.max(1, panjang)
        // Sepatu Eco-Runner: kecepatan gerak +35% permanen. Hanya gerak
        // pemain yang dikali — animasi jalan (p.fase) tidak ikut berubah.
        const kecepatan = KECEPATAN * (saveRef.current.sepatuEco ? 1.35 : 1)
        const nx = p.x + vx * kecepatan * dt
        const ny = p.y + vy * kecepatan * dt
        // Pindah per sumbu supaya bisa geser di sepanjang dinding/furnitur.
        if (!tabrakan(nx, p.y, RADIUS_PEMAIN)) p.x = nx
        if (!tabrakan(p.x, ny, RADIUS_PEMAIN)) p.y = ny
        p.fase += dt * 10
        p.arah =
          Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'kanan' : 'kiri') : vy > 0 ? 'bawah' : 'atas'
      }
      p.bergerak = bergerak

      // Kamera halus: kejar pemain dengan smoothing eksponensial,
      // deadzone ±24px, dan look-ahead searah gerak (lihat kamera.ts).
      const gerak = bergerak ? { x: vx, y: vy } : { x: 0, y: 0 }
      const view = viewRef.current
      perbaruiKamera(camRef.current, p.x, p.y, view.w, view.h, RUMAH.lebar, RUMAH.tinggi, dt, gerak.x, gerak.y)

      // Click-to-move macet (mis. target di balik furnitur): batalkan supaya
      // tokoh tidak mendorong dinding selamanya.
      const tujuan = tujuanRef.current
      if (tujuan && bergerak) {
        const geser = Math.hypot(p.x - tujuan.terakhirX, p.y - tujuan.terakhirY)
        if (geser < 1) {
          tujuan.macet += dt
        } else {
          tujuan.macet = 0
          tujuan.terakhirX = p.x
          tujuan.terakhirY = p.y
        }
        if (tujuan.macet > 0.6) tujuanRef.current = null
      }

      // Objek terdekat untuk tombol Aksi.
      let terdekatObjek: ObjekRumah | null = null
      let jarakTerdekat = JARAK_INTERAKSI
      for (const o of OBJEK) {
        const d = Math.hypot(o.x - p.x, o.y - p.y)
        if (d < jarakTerdekat) {
          jarakTerdekat = d
          terdekatObjek = o
        }
      }
      const idTerdekat = terdekatObjek ? terdekatObjek.id : null
      if (idTerdekat !== dekatRef.current) {
        dekatRef.current = idTerdekat
        setDekat(terdekatObjek)
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
      // Kamera halus (diperbarui tiap frame di update).
      const camX = camRef.current.x
      const camY = camRef.current.y
      ctx.save()
      ctx.translate(-camX, -camY)
      const statis = staticRef.current
      if (statis) {
        ctx.drawImage(statis, camX, camY, view.w, view.h, camX, camY, view.w, view.h)
      }
      // Cincin sorot di objek terdekat.
      const sorotId = dekatRef.current
      if (sorotId) {
        const o = OBJEK.find((x) => x.id === sorotId)
        if (o) {
          ctx.strokeStyle = '#ffd54a'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(o.x, o.y, 24, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      void t
      gambarPemain(
        ctx,
        p,
        reducedRef.current,
        warnaKostum(saveRef.current.kostumDipakai),
        saveRef.current.jenisKelamin,
        saveRef.current.pinDuta,
        // Kecepatan gerak saat ini: bayangan mengecil sedikit saat cepat.
        p.bergerak ? KECEPATAN * (saveRef.current.sepatuEco ? 1.35 : 1) : 0,
      )
      ctx.restore()

      // Joystick virtual hanya untuk perangkat sentuh (pointer: coarse).
      if (coarseRef.current) {
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
        const objek = OBJEK.find((o) => o.id === dekatRef.current)
        if (objek) jalankanAksiRef.current(objek)
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
        const objek = OBJEK.find((o) => o.id === dekatRef.current)
        if (objek) jalankanAksiRef.current(objek)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    const onBlur = () => {
      keysRef.current.clear()
      joyRef.current = { aktif: false, id: null, vx: 0, vy: 0 }
      tujuanRef.current = null
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
    if (dialogRef.current) return
    if ((e.target as HTMLElement).closest('button')) return
    if (e.pointerType === 'mouse') tujuanRef.current = null
    const pos = posisiPointer(e)
    const view = viewRef.current
    const jx = 84
    const jy = view.h - 84
    if (e.pointerType === 'touch' && Math.hypot(pos.x - jx, pos.y - jy) < 80) {
      joyRef.current = { aktif: true, id: e.pointerId, vx: 0, vy: 0 }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    tapRef.current = { id: e.pointerId, x: pos.x, y: pos.y, t: performance.now() }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const joy = joyRef.current
    if (joy.aktif && joy.id === e.pointerId) {
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
      return
    }
    if (e.pointerType === 'mouse') {
      const canvas = canvasRef.current
      if (canvas) {
        const pos = posisiPointer(e)
        const camX = camRef.current.x
        const camY = camRef.current.y
        const wx = pos.x + camX
        const wy = pos.y + camY
        const diAtasInteraktif = OBJEK.some((o) => Math.hypot(o.x - wx, o.y - wy) < 40)
        canvas.style.cursor = diAtasInteraktif ? 'pointer' : 'default'
      }
    }
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
    const p = playerRef.current
    const camX = camRef.current.x
    const camY = camRef.current.y
    const wx = pos.x + camX
    const wy = pos.y + camY
    const objek = OBJEK.find((o) => Math.hypot(o.x - wx, o.y - wy) < 40)
    if (objek) {
      if (Math.hypot(objek.x - p.x, objek.y - p.y) <= 70) {
        jalankanAksi(objek)
      } else if (e.pointerType === 'mouse') {
        // Click-to-move: jalan mendekat, aksi berjalan otomatis saat sampai.
        tujuanRef.current = { x: objek.x, y: objek.y, objekId: objek.id, macet: 0, terakhirX: p.x, terakhirY: p.y }
      } else {
        showToast(`Dekati ${objek.nama} dulu`)
      }
      return
    }
    // Klik mouse di lantai kosong: click-to-move ke titik itu.
    if (e.pointerType === 'mouse') {
      tujuanRef.current = { x: wx, y: wy, macet: 0, terakhirX: p.x, terakhirY: p.y }
    }
  }

  // ------------------------------------------------------------ render ----

  const diAkhir = dialog ? dialogIdx >= dialog.baris.length - 1 : false
  const ikonAksi = (id: ObjekId) => {
    switch (id) {
      case 'kasur':
        return <BedDouble aria-hidden="true" />
      case 'kulkas':
        return <Refrigerator aria-hidden="true" />
      case 'meja':
        return <UtensilsCrossed aria-hidden="true" />
      case 'pintu':
        return <DoorOpen aria-hidden="true" />
      default:
        return <MessageCircle aria-hidden="true" />
    }
  }

  return (
    <div className="aia-stack">
      <div className="aia-hud">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Coins aria-hidden="true" /> <AngkaAnimasi nilai={save.coins} /> Koin Hijau
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Award aria-hidden="true" /> Skor Adiwiyata: <AngkaAnimasi nilai={save.skorAdiwiyata ?? 0} />
        </span>
        <span>Rumah</span>
        <button
          type="button"
          className="aia-icon-btn"
          onClick={onOpenPanduan}
          aria-label="Cara bermain"
          style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}
        >
          <span aria-hidden="true">?</span>
        </button>
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

      <HudStatus
        lapar={save.lapar ?? 100}
        haus={save.haus ?? 100}
        uang={save.uang ?? 0}
        koinDaun={save.koinDaun ?? 0}
        onKeKantin={onKeKantin}
      />

      {isDesktop && (
        <p className="aia-muted" style={{ margin: 0, fontSize: 12 }}>
          Keyboard: WASD / panah gerak · E bicara · Spasi lanjut dialog · Esc tutup · Klik peta untuk berjalan
        </p>
      )}

      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          height: 'min(62vh, 480px)',
          minHeight: 360,
          borderRadius: 16,
          overflow: 'hidden',
          touchAction: 'none',
          background: '#e8c890',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
          aria-label="Interior rumah yang bisa dijelajahi"
        />

        {toast && (
          <div
            style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 4, maxWidth: 'calc(100% - 24px)' }}
            role="status"
            aria-live="polite"
          >
            <span className="aia-chip aia-chip-wrap">{toast}</span>
          </div>
        )}

        {dekat && !dialog && (
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 4 }}
            onClick={() => jalankanAksi(dekat)}
            aria-label={`${dekat.aksi} — ${dekat.nama}`}
          >
            {ikonAksi(dekat.id)} {dekat.aksi}
          </button>
        )}

        {dialog && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={dialog.id === 'ibu' ? 'Bicara dengan Ibu' : dialog.id === 'meja' ? 'Meja Makan' : 'Rumah'}
            style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 5 }}
          >
            <section className="aia-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span className="aia-kicker">{dialog.id === 'ibu' ? 'Di rumah' : 'Rumah'}</span>
                  <h3 className="aia-section-title" style={{ margin: 0 }}>
                    {dialog.id === 'ibu' ? 'Ibu' : 'Meja Makan'}
                  </h3>
                </div>
                <button type="button" className="aia-icon-btn" onClick={tutupDialog} aria-label="Tutup dialog">
                  <X aria-hidden="true" />
                </button>
              </div>
              <p>{dialog.baris[dialogIdx]}</p>
              {diAkhir ? (
                <div className="aia-actions">
                  {dialog.id === 'ibu' && !sudahDiberi && (
                    <button type="button" className="aia-btn aia-btn-primary" onClick={terimaUangSaku}>
                      Terima uang saku + sarapan
                    </button>
                  )}
                  {dialog.id === 'ibu' && !sudahDiberi && (
                    <p className="aia-muted" style={{ margin: 0 }}>
                      Uang saku Rp5.000 + sarapan (Lapar +40), 1x sehari.
                    </p>
                  )}
                  <button type="button" className="aia-btn aia-btn-ghost" onClick={tutupDialog}>
                    Tutup
                  </button>
                </div>
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
        {isDesktop
          ? 'Gerakkan tokoh dengan tombol WASD/panah, atau klik peta untuk berjalan ke titik itu. Dekati objek lalu tekan E untuk berinteraksi.'
          : 'Gerakkan tokoh dengan joystick kiri bawah atau tombol WASD/panah. Dekati objek lalu ketuk tombol Aksi.'}{' '}
        Kasur untuk istirahat (Lapar +30, Haus +30), kulkas untuk minum (Haus +30), dan Ibu memberimu uang saku
        Rp5.000 + sarapan 1x sehari. Pintu di bawah membawamu berangkat ke sekolah.
      </p>
    </div>
  )
}
