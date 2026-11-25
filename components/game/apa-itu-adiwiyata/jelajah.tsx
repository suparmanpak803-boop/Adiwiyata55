'use client'

// Explorer "Jelajah" — peta sekolah top-down di Canvas 2D.
// Tokoh siswa chibi berjalan dengan joystick virtual (sentuh, hanya di
// perangkat sentuh), WASD/panah (keyboard), atau klik peta (mouse,
// click-to-move), bicara dengan NPC, dan memungut sampah yang berserakan.
// Dialog dan HUD memakai DOM supaya terbaca pembaca layar.
// Data peta (PETA, NPCS) dan dialog NPC (DIALOG_NPC) dibuat agen lain
// mengikuti kontrak di lib/apa-itu-adiwiyata/content/peta.ts dan content/npc.ts.

import { useEffect, useRef, useState } from 'react'
import { Award, Banknote, Coins, DoorOpen, Flag, Laugh, MessageCircle, Smile, Store, Trash2, Volume2, VolumeX, X } from 'lucide-react'
import { CHAPTERS, CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { TUGAS } from '@/lib/apa-itu-adiwiyata/tugas'
import { BAK, HADIAH_PILAH_KOIN, HADIAH_PILAH_UANG, NAMA_BAK, warnaTombolBak } from '@/lib/apa-itu-adiwiyata/content/bak'
import { HADIAH_BANK_KOIN, HADIAH_BANK_UANG, hitungSetoran } from '@/lib/apa-itu-adiwiyata/content/bank-sampah'
import { jumlahTugasSelesai, LOKASI_PEMBERI, misiSaatIni, pemberiMisi } from '@/lib/apa-itu-adiwiyata/misi'
import { selectChapterUnlocked, useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { kunciCerita, PILIHAN_CERITA } from '@/lib/apa-itu-adiwiyata/content/cerita'
import { dialogDenganIngatan, sapaanProgres } from '@/lib/apa-itu-adiwiyata/content/npc'
import { warnaKostum } from '@/lib/apa-itu-adiwiyata/content/toko'
import { gambarBayangan, gambarPemain, rr, type PemainState } from '@/lib/apa-itu-adiwiyata/gambar-pemain'
import { buatKamera, offsetPusat, perbaruiKamera, resetKamera } from '@/lib/apa-itu-adiwiyata/kamera'
import {
  buatAwan,
  buatPartikel,
  feedback,
  gambarAwan,
  gambarLangitPagi,
  gambarPartikel,
  perbaruiAwan,
  perbaruiPartikel,
  resetPartikel,
  spawnDaun,
} from '@/lib/apa-itu-adiwiyata/partikel'
import { AngkaAnimasi, HudStatus } from './hud-dunia'
import { type NpcDunia } from '@/lib/apa-itu-adiwiyata/dunia'
import { PETA, cariTitik, type PetaDunia, type PetaId, type PortalPeta } from '@/lib/apa-itu-adiwiyata/content/peta'
import {
  beriMakanMaggot,
  NAMA_TANAMAN,
  panenKasgot,
  panenTanaman,
  siramTanaman,
  type Maggot,
  type PetakKebun,
} from '@/lib/apa-itu-adiwiyata/dunia-hidup'
import { hasProgress } from '@/lib/apa-itu-adiwiyata/storage'
import type { ChapterId, TongSampah, TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { PilihanCerita } from './pilihan-cerita'
import { benar, duckMusik, hentikanAmbience, klik, koin, langkah, maggot as sfxMaggot, mulaiAmbience, panen, pindah, playMumble, salah, setSuaraMuted, siram, unduckMusik } from './suara'

const KECEPATAN = 160 // unit dunia per detik
const JARAK_BICARA = 56
const RADIUS_PEMAIN = 14
const JARI_JOYSTICK = 52

/** Target click-to-move (mouse): titik dunia + NPC yang dituju (bila ada). */
interface TujuanJalan {
  x: number
  y: number
  npcId?: string
  /** Detik pemain diam padahal sedang berjalan ke target (macet di dinding). */
  macet: number
  terakhirX: number
  terakhirY: number
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

function tabrakan(peta: PetaDunia, x: number, y: number, r: number): boolean {
  if (x < r || y < r || x > peta.lebar - r || y > peta.tinggi - r) return true
  for (const d of peta.dinding) {
    if (x + r > d.x && x - r < d.x + d.w && y + r > d.y && y - r < d.y + d.h) return true
  }
  return false
}

function posisiPohon(peta: PetaDunia, benih: number): { x: number; y: number; r: number }[] {
  const acak = mulberry32(benih)
  const pohon: { x: number; y: number; r: number }[] = []
  const kandidat: { x: number; y: number }[] = []
  for (let x = 50; x < peta.lebar - 40; x += 120) {
    kandidat.push({ x: x + acak() * 50, y: 34 + acak() * 16 })
    kandidat.push({ x: x + acak() * 50, y: peta.tinggi - 34 - acak() * 16 })
  }
  for (let y = 120; y < peta.tinggi - 100; y += 170) {
    kandidat.push({ x: 34 + acak() * 16, y })
    kandidat.push({ x: peta.lebar - 34 - acak() * 16, y })
  }
  for (const k of kandidat) {
    const diZona = peta.zona.some(
      (z) => k.x > z.x - 26 && k.x < z.x + z.w + 26 && k.y > z.y - 26 && k.y < z.y + z.h + 26,
    )
    const diDinding = peta.dinding.some(
      (d) => k.x > d.x - 26 && k.x < d.x + d.w + 26 && k.y > d.y - 26 && k.y < d.y + d.h + 26,
    )
    const dekatSpawn = Math.hypot(k.x - peta.spawn.x, k.y - peta.spawn.y) < 110
    if (!diZona && !diDinding && !dekatSpawn) pohon.push({ ...k, r: 16 + acak() * 8 })
  }
  return pohon
}

/** true bila lebar pandang canvas < 480px (HP sempit) — dipakai untuk
 * mengecilkan / menyembunyikan label canvas supaya tidak bertumpuk. */
function pandangSempit(viewW: number): boolean {
  const w = viewW > 0 ? viewW : typeof window !== 'undefined' ? window.innerWidth : 1024
  return w < 480
}

/** Lapisan statis satu peta (P2) — digambar SEKALI ke offscreen canvas
 * saat peta dibuka, lalu tiap frame tinggal `drawImage` (lihat draw()).
 *
 * STATIS (masuk prerender): rumput, jalan, zona, dinding/bangunan, portal,
 * pohon hias (+ bayangannya), Panel Surya bila sudah dibeli
 * (`panelSurya` — panel biru di atap zona Panel Surya, Taman), dan pohon
 * hasil tanam (`pohonDitanam` — C-41, hanya di Taman, maks 8 posisi).
 * DINAMIS (tetap digambar tiap frame, TIDAK masuk prerender): pemain, NPC,
 * sampah liar (+ kilau berdenyut), petak kebun + kotak maggot (tahap/lapar
 * berubah), Tempat Pilah / Bank Sampah / Booth Eco-Shop (sorot emas saat
 * pemain dekat), overlay zona "Terkunci" (ikut status buka bab), tint waktu
 * (ikut jam nyata), awan + daun (bergerak), langit pagi, partikel + angka
 * melayang.
 *
 * `sempit` = lebar pandang < 480px: label zona dekoratif (tanpa misi)
 * disembunyikan supaya peta terasa lega, label lain diperkecil.
 * Prerender dibangun ulang bila isi statis berubah: pindah peta, Panel
 * Surya baru dibeli (dirty-flag di update(), via panelStatisRef), pohon
 * baru ditanam (dirty-flag yang sama, via pohonStatisRef), atau
 * lebar pandang melewati ambang 480px (di atur()). */
function bangunStatis(peta: PetaDunia, sempit = false, panelSurya = false, pohonDitanam = 0): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = peta.lebar
  c.height = peta.tinggi
  const g = c.getContext('2d')
  if (!g) return c

  // Rumput + petak halus.
  g.fillStyle = '#7cb85c'
  g.fillRect(0, 0, peta.lebar, peta.tinggi)
  const petak = 60
  g.fillStyle = 'rgba(255,255,255,0.05)'
  for (let y = 0; y < peta.tinggi; y += petak) {
    for (let x = 0; x < peta.lebar; x += petak) {
      if ((x / petak + y / petak) % 2 === 0) g.fillRect(x, y, petak, petak)
    }
  }

  // Jalan tanah utama (nanti tertutup zona/bangunan bila bersilangan).
  g.fillStyle = 'rgba(217,196,154,0.55)'
  g.fillRect(0, peta.tinggi / 2 - 26, peta.lebar, 52)
  g.fillRect(peta.lebar / 2 - 26, 0, 52, peta.tinggi)

  // Zona: area berwarna + label. Di layar sempit, label zona dekoratif
  // (tanpa misi, mis. Plaza / Teras / Taman & Toilet / Pos Data)
  // disembunyikan — warnanya tetap terlihat, hanya teksnya yang hilang.
  for (const z of peta.zona) {
    g.globalAlpha = 0.35
    g.fillStyle = z.warna
    rr(g, z.x, z.y, z.w, z.h, 14)
    g.fill()
    g.globalAlpha = 1
    g.strokeStyle = z.warna
    g.lineWidth = 3
    rr(g, z.x, z.y, z.w, z.h, 14)
    g.stroke()
    if (sempit && !z.chapterId) continue
    g.font = sempit ? 'bold 12px system-ui, sans-serif' : 'bold 14px system-ui, sans-serif'
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
  for (const d of peta.dinding) {
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

  // Panel Surya (statis setelah dibeli): panel biru di atap gedung zona
  // Panel Surya (Taman), di atas dinding deret panel. Masuk prerender
  // supaya tidak digambar ulang tiap frame; dibangun ulang bila
  // `panelSurya` berubah (lihat panelStatisRef). Di peta selain Taman
  // titik 'panel-surya' tidak ada, jadi tidak terjadi apa-apa.
  if (panelSurya) {
    const panel = cariTitik(peta, 'panel-surya')
    if (panel) gambarPanelSurya(g, panel)
  }

  // Portal: rect putus-putus + label. Jalan Pulang (tujuan 'rumah') tetap
  // berwarna tanah; portal antar peta berwarna kuning. Label ditaruh di
  // dalam rect bila muat, kalau tidak di samping rect (portal di tepi).
  for (const portal of peta.portal) {
    const jalanPulang = portal.tujuan === 'rumah'
    g.fillStyle = jalanPulang ? '#d9c49a' : 'rgba(255,213,74,0.35)'
    rr(g, portal.x, portal.y, portal.w, portal.h, 8)
    g.fill()
    g.strokeStyle = jalanPulang ? '#8d6e63' : '#8d6e00'
    g.lineWidth = 2
    g.setLineDash([6, 4])
    rr(g, portal.x, portal.y, portal.w, portal.h, 8)
    g.stroke()
    g.setLineDash([])
    g.font = sempit ? 'bold 10px system-ui, sans-serif' : 'bold 11px system-ui, sans-serif'
    const lebarLabel = g.measureText(portal.label).width
    const cyLabel = portal.y + portal.h / 2
    let lx = portal.x + portal.w / 2
    let align: CanvasTextAlign = 'center'
    if (portal.w < lebarLabel + 16) {
      if (portal.x < 60) {
        lx = portal.x + portal.w + 6
        align = 'left'
      } else if (portal.x + portal.w > peta.lebar - 60) {
        lx = portal.x - 6
        align = 'right'
      }
    }
    const x0Label =
      align === 'center' ? lx - lebarLabel / 2 - 8 : align === 'left' ? lx : lx - lebarLabel - 16
    g.fillStyle = 'rgba(0,0,0,0.55)'
    rr(g, x0Label, cyLabel - 11, lebarLabel + 16, 22, 11)
    g.fill()
    g.fillStyle = '#ffffff'
    g.textAlign = align
    g.textBaseline = 'middle'
    g.fillText(portal.label, align === 'center' ? lx : align === 'left' ? lx + 8 : lx - 8, cyLabel + 1)
  }

  // Pohon hias di tepi peta (benih dari id peta supaya tiap peta beda).
  const benihPohon = 20261124 + [...peta.id].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  for (const t of posisiPohon(peta, benihPohon)) {
    gambarPohon(g, t.x, t.y, t.r)
  }

  // C-41: pohon hasil tanam (TANAM_POHON) — hanya di Taman, di zona
  // Pohon, maks 8 posisi (POHON_DITANAM_POSISI). Bila pemain menanam
  // lebih dari 8, hanya 8 pertama yang digambar; jumlah lengkapnya
  // tetap terlihat di Profil dan Toko. R3 (Gelombang 3): pohon yang
  // ditanam lebih dulu digambar lebih besar (22 → 15) — pohon terlihat
  // membesar menurut urutan tanam, bukan seragam.
  if (peta.id === 'taman' && pohonDitanam > 0) {
    const jumlah = Math.min(pohonDitanam, POHON_DITANAM_POSISI.length)
    for (let i = 0; i < jumlah; i += 1) {
      const t = POHON_DITANAM_POSISI[i]
      gambarPohon(g, t.x, t.y, 22 - i)
    }
  }

  return c
}

/**
 * Satu pohon (batang + tajuk 3 lingkaran + bayangan alas). Dipakai pohon
 * hias di tepi peta dan pohon hasil tanam di Taman.
 */
function gambarPohon(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  // Bayangan alas di bawah pohon supaya pohon "menapak" di rumput.
  gambarBayangan(g, x, y + 16, r * 0.9, r * 0.28)
  g.fillStyle = '#6d4c41'
  g.fillRect(x - 3, y + 4, 6, 12)
  g.fillStyle = '#4e9a3d'
  g.beginPath()
  g.arc(x - 6, y - 4, r * 0.7, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.arc(x + 7, y - 2, r * 0.7, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#5cb85c'
  g.beginPath()
  g.arc(x, y - 10, r * 0.75, 0, Math.PI * 2)
  g.fill()
}

/**
 * C-41: posisi pohon hasil tanam di Taman (zona Pohon: x 60–340,
 * y 240–420). Dipilih supaya TIDAK menutupi jalur atau portal/NPC:
 * - di bawah jalan horizontal (y 214–266) dan di kiri jalan vertikal
 *   (x 334–386) — tajuk tidak menyentuh jalan;
 * - ≥38 unit dari Kak Raka (200,330), dari pohon hias sudut zona, dan
 *   dari spawn (360,420); portal Kembali ada di (572,70), jauh.
 * Aktor (pemain/NPC) digambar di atas lapisan statis, jadi kalaupun
 * pemain berjalan di dekat pohon, tokohnya tetap terlihat.
 */
const POHON_DITANAM_POSISI: { x: number; y: number }[] = [
  { x: 110, y: 290 },
  { x: 160, y: 290 },
  { x: 250, y: 290 },
  { x: 300, y: 290 },
  { x: 110, y: 385 },
  { x: 150, y: 385 },
  { x: 230, y: 385 },
  { x: 270, y: 385 },
]

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

// ------------------------------------------------------- Dunia Hidup ----

/** Satu petak kebun: bedeng tanah + tanaman sesuai tahap + label nama. */
function gambarPetak(g: CanvasRenderingContext2D, petak: PetakKebun, pos: { x: number; y: number }, kecil = false) {
  const cx = pos.x
  const cy = pos.y - 2
  // Bayangan alas di bawah bedeng.
  gambarBayangan(g, pos.x, pos.y + 12, 22, 5)
  // Bedeng tanah.
  g.fillStyle = '#8b5a2b'
  rr(g, pos.x - 20, pos.y - 10, 40, 22, 6)
  g.fill()
  g.strokeStyle = '#6d4c41'
  g.lineWidth = 2
  rr(g, pos.x - 20, pos.y - 10, 40, 22, 6)
  g.stroke()
  // Tanaman: hijau bila segar, cokelat bila layu.
  const daun = petak.layu ? '#a1887f' : '#4e9a3d'
  const daunTerang = petak.layu ? '#8d6e63' : '#66bb6a'
  if (petak.tahap === 0) {
    // Benih: titik-titik di tanah.
    g.fillStyle = petak.layu ? '#8d6e63' : '#5d4037'
    for (const dx of [-8, 0, 8]) {
      g.beginPath()
      g.arc(cx + dx, cy + 4, 2.5, 0, Math.PI * 2)
      g.fill()
    }
  } else if (petak.tahap === 1) {
    // Tunas: 2 daun kecil.
    g.fillStyle = daunTerang
    g.beginPath()
    g.ellipse(cx - 4, cy, 4, 6, -0.5, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(cx + 4, cy, 4, 6, 0.5, 0, Math.PI * 2)
    g.fill()
  } else if (petak.tahap === 2) {
    // Semak hijau.
    g.fillStyle = daun
    g.beginPath()
    g.arc(cx - 6, cy, 6, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(cx + 6, cy, 6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = daunTerang
    g.beginPath()
    g.arc(cx, cy - 5, 7, 0, Math.PI * 2)
    g.fill()
  } else {
    // Berbunga: batang + bunga kuning.
    g.strokeStyle = daun
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(cx, cy + 6)
    g.lineTo(cx, cy - 8)
    g.stroke()
    g.fillStyle = daunTerang
    g.beginPath()
    g.ellipse(cx - 5, cy + 2, 4, 3, -0.6, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(cx + 5, cy + 2, 4, 3, 0.6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffd54a'
    for (const [fx, fy] of [
      [-6, -8],
      [6, -8],
      [0, -13],
    ] as const) {
      g.beginPath()
      g.arc(cx + fx, cy + fy, 3.5, 0, Math.PI * 2)
      g.fill()
    }
  }
  // Tanda layu: tetes air di atas tanaman (tanda butuh disiram).
  if (petak.layu) {
    g.fillStyle = '#29b6f6'
    g.beginPath()
    g.moveTo(cx, cy - 22)
    g.quadraticCurveTo(cx + 5, cy - 14, cx, cy - 11)
    g.quadraticCurveTo(cx - 5, cy - 14, cx, cy - 22)
    g.fill()
  }
  // Label nama tanaman di bawah petak.
  const nama = NAMA_TANAMAN[petak.jenis]
  g.font = kecil ? 'bold 10px system-ui, sans-serif' : 'bold 11px system-ui, sans-serif'
  const lebarTeks = g.measureText(nama).width
  g.fillStyle = 'rgba(0,0,0,0.55)'
  rr(g, cx - lebarTeks / 2 - 7, pos.y + 16, lebarTeks + 14, 18, 9)
  g.fill()
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(nama, cx, pos.y + 25)
}

/** Kotak maggot: kotak cokelat + larva + bar lapar + "!" bila sangat lapar. */
function gambarKotakMaggot(g: CanvasRenderingContext2D, maggot: Maggot, pos: { x: number; y: number }) {
  // Bayangan alas di bawah kotak.
  gambarBayangan(g, pos.x, pos.y + 14, 22, 5)
  // Kotak.
  g.fillStyle = '#8d6e63'
  rr(g, pos.x - 20, pos.y - 12, 40, 26, 5)
  g.fill()
  g.strokeStyle = '#6d4c41'
  g.lineWidth = 2
  rr(g, pos.x - 20, pos.y - 12, 40, 26, 5)
  g.stroke()
  g.fillStyle = '#a1887f'
  g.fillRect(pos.x - 16, pos.y - 9, 32, 4)
  // Larva hijau sebanyak tahap+1.
  const jumlah = maggot.tahap + 1
  for (let i = 0; i < jumlah; i += 1) {
    const lx = pos.x - 10 + i * 10
    g.fillStyle = '#8bc34a'
    g.beginPath()
    g.ellipse(lx, pos.y + 5, 5, 3.5, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#212121'
    g.beginPath()
    g.arc(lx + 2, pos.y + 4, 1, 0, Math.PI * 2)
    g.fill()
  }
  // Bar lapar di atas kotak: hijau -> kuning -> merah.
  const warnaBar = maggot.lapar < 50 ? '#66bb6a' : maggot.lapar < 75 ? '#ffb300' : '#e53935'
  g.fillStyle = 'rgba(0,0,0,0.55)'
  rr(g, pos.x - 18, pos.y - 22, 36, 6, 3)
  g.fill()
  g.fillStyle = warnaBar
  const lebarIsi = Math.max(0, Math.min(1, maggot.lapar / 100)) * 32
  if (lebarIsi > 0) {
    rr(g, pos.x - 16, pos.y - 20, lebarIsi, 2, 1)
    g.fill()
  }
  // Ikon "!" bila sangat lapar.
  if (maggot.lapar >= 75) {
    g.fillStyle = '#ffd54a'
    g.beginPath()
    g.arc(pos.x + 22, pos.y - 24, 8, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#8d6e00'
    g.lineWidth = 1.5
    g.stroke()
    g.fillStyle = '#4e342e'
    g.font = 'bold 11px system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('!', pos.x + 22, pos.y - 24)
  }
}

/** Tempat Sampah Terpilah: papan nama + 5 bak warna-warni (sistem SMAN 55).
 * Digambar tiap frame di draw() supaya bisa disorot saat pemain dekat. */
function gambarTempatPilah(g: CanvasRenderingContext2D, disorot: boolean, pos: { x: number; y: number }, kecil = false) {
  const cx = pos.x
  const cy = pos.y
  const lebarBak = 32
  const gap = 6
  const total = BAK.length * lebarBak + (BAK.length - 1) * gap
  const x0 = cx - total / 2
  // Papan nama di atas barisan bak.
  g.font = kecil ? 'bold 11px system-ui, sans-serif' : 'bold 12px system-ui, sans-serif'
  const label = 'Tempat Sampah Terpilah'
  const lw = g.measureText(label).width
  g.fillStyle = 'rgba(0,0,0,0.55)'
  rr(g, cx - lw / 2 - 10, cy - 46, lw + 20, 22, 11)
  g.fill()
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(label, cx, cy - 35)
  // Sorot emas bila pemain dekat (tanda bisa dibuka).
  if (disorot) {
    g.strokeStyle = '#ffd54a'
    g.lineWidth = 3
    g.setLineDash([8, 5])
    rr(g, x0 - 8, cy - 52, total + 16, 88, 12)
    g.stroke()
    g.setLineDash([])
  }
  // 5 bak + singkatan di bawah tiap bak.
  let x = x0
  for (const bak of BAK) {
    // Bayangan alas di bawah tiap bak supaya bak "menapak".
    gambarBayangan(g, x + lebarBak / 2, cy + 15, 14, 4)
    g.fillStyle = bak.warna
    rr(g, x, cy - 16, lebarBak, 30, 5)
    g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.35)'
    g.lineWidth = 2
    rr(g, x, cy - 16, lebarBak, 30, 5)
    g.stroke()
    // Tutup bak.
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(x + 2, cy - 16, lebarBak - 4, 6)
    g.font = 'bold 9px system-ui, sans-serif'
    g.fillStyle = '#ffffff'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(bak.singkatan, x + lebarBak / 2, cy + 24)
    x += lebarBak + gap
  }
}

/** Bank Sampah di Kebun: meja hijau berlabel "Bank Sampah" + koin di atasnya.
 * Digambar tiap frame di draw() supaya bisa disorot saat pemain dekat
 * (pola yang sama dengan gambarTempatPilah). Meja 96x30 di titik
 * 'bank-sampah' registry (PETA.kebun). */
function gambarBankSampah(g: CanvasRenderingContext2D, disorot: boolean, pos: { x: number; y: number }, kecil = false) {
  const cx = pos.x
  const cy = pos.y
  const w = 96
  const h = 30
  // Sorot emas bila pemain dekat (tanda bisa dibuka).
  if (disorot) {
    g.strokeStyle = '#ffd54a'
    g.lineWidth = 3
    g.setLineDash([8, 5])
    rr(g, cx - w / 2 - 8, cy - h / 2 - 14, w + 16, h + 28, 12)
    g.stroke()
    g.setLineDash([])
  }
  // Koin di atas meja.
  g.fillStyle = '#ffd54a'
  g.strokeStyle = '#8d6e00'
  g.lineWidth = 1.5
  for (const dx of [-18, 18]) {
    g.beginPath()
    g.arc(cx + dx, cy - h / 2 - 4, 7, 0, Math.PI * 2)
    g.fill()
    g.stroke()
  }
  // Bayangan alas di bawah meja.
  gambarBayangan(g, cx, cy + h / 2 + 3, w / 2, 7)
  // Meja hijau + label.
  g.fillStyle = '#43a047'
  rr(g, cx - w / 2, cy - h / 2, w, h, 6)
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = 2
  rr(g, cx - w / 2, cy - h / 2, w, h, 6)
  g.stroke()
  g.fillStyle = '#ffffff'
  g.font = kecil ? 'bold 11px system-ui, sans-serif' : 'bold 12px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('Bank Sampah', cx, cy + 1)
}

/** Booth Eco-Shop di Kebun: stan hijau berlabel "Eco-Shop" di celah
 * antara kedua bedeng. Digambar tiap frame di draw() supaya bisa disorot
 * saat pemain dekat (pola yang sama dengan gambarBankSampah). Stan
 * 96x24 di titik 'eco-shop' registry (PETA.kebun). */
function gambarBoothEco(g: CanvasRenderingContext2D, disorot: boolean, pos: { x: number; y: number }, kecil = false) {
  const cx = pos.x
  const cy = pos.y
  const w = 96
  const h = 24
  // Sorot emas bila pemain dekat (tanda bisa dibuka).
  if (disorot) {
    g.strokeStyle = '#ffd54a'
    g.lineWidth = 3
    g.setLineDash([8, 5])
    rr(g, cx - w / 2 - 8, cy - h / 2 - 12, w + 16, h + 24, 12)
    g.stroke()
    g.setLineDash([])
  }
  // Atap bergaris hijau-putih di atas stan.
  g.fillStyle = '#2e7d32'
  rr(g, cx - w / 2, cy - h / 2 - 10, w, 10, 5)
  g.fill()
  g.fillStyle = '#ffffff'
  for (const dx of [-36, -12, 12, 36]) {
    g.fillRect(cx + dx - 6, cy - h / 2 - 10, 12, 10)
  }
  // Bayangan alas di bawah stan.
  gambarBayangan(g, cx, cy + h / 2 + 3, w / 2, 6)
  // Stan hijau + label.
  g.fillStyle = '#66bb6a'
  rr(g, cx - w / 2, cy - h / 2, w, h, 6)
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = 2
  rr(g, cx - w / 2, cy - h / 2, w, h, 6)
  g.stroke()
  g.fillStyle = '#ffffff'
  g.font = kecil ? 'bold 11px system-ui, sans-serif' : 'bold 12px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('Eco-Shop', cx, cy + 1)
}

/** Panel Surya di atap gedung zona Panel Surya (peta Taman): deret panel
 * biru dengan garis grid. Digambar ke LAPISAN STATIS (bangunStatis) bila
 * pemain sudah membeli Panel Surya di Eco-Shop — bukan tiap frame di
 * draw(). `pos` = titik 'panel-surya' registry (sudut strip panel,
 * 168x20 di atas dinding deret panel). */
function gambarPanelSurya(g: CanvasRenderingContext2D, pos: { x: number; y: number }) {
  const x = pos.x
  const y = pos.y
  const w = 168
  const h = 20
  g.fillStyle = '#1e88e5'
  rr(g, x, y, w, h, 4)
  g.fill()
  g.strokeStyle = '#0d47a1'
  g.lineWidth = 1.5
  rr(g, x, y, w, h, 4)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    g.beginPath()
    g.moveTo(x + (w / 4) * i, y + 2)
    g.lineTo(x + (w / 4) * i, y + h - 2)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(x + 2, y + h / 2)
  g.lineTo(x + w - 2, y + h / 2)
  g.stroke()
}

/** Warna tint waktu nyata: pagi hangat, siang netral, sore jingga, malam biru gelap. */
function warnaTintWaktu(): string {
  const jam = new Date().getHours()
  if (jam >= 5 && jam < 10) return 'rgba(255,214,120,0.10)'
  if (jam >= 10 && jam < 15) return 'rgba(255,255,255,0.02)'
  if (jam >= 15 && jam < 18) return 'rgba(255,140,60,0.12)'
  return 'rgba(20,40,90,0.18)'
}

function gambarNpc(g: CanvasRenderingContext2D, n: NpcJalan, disorot: boolean, reduced: boolean, adaMisi = false, kecil = false, senyum = false) {
  const bob = reduced ? 0 : Math.sin(n.fase) * 1.5
  gambarBayangan(g, n.x, n.y + 13, 12, 4)
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
  // R7: NPC yang sedang diajak bicara tersenyum — mulut melengkung di
  // bawah mata (posisi mulut mengikuti bentuk tokoh: Magi di y 4, Pak
  // Plastik di y -2, manusia di y -7).
  if (senyum) {
    const mulutY = n.nama === 'Magi' ? 4 : n.nama === 'Pak Plastik' ? -2 : -7
    g.strokeStyle = '#212121'
    g.lineWidth = 1.5
    g.beginPath()
    g.arc(0, mulutY, 4, Math.PI * 0.15, Math.PI * 0.85)
    g.stroke()
  }
  // Label nama.
  g.font = kecil ? 'bold 10px system-ui, sans-serif' : 'bold 11px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'bottom'
  g.lineWidth = 3
  g.strokeStyle = 'rgba(0,0,0,0.65)'
  g.strokeText(n.nama, 0, -24)
  g.fillStyle = '#ffffff'
  g.fillText(n.nama, 0, -24)
  // Tanda "!" di atas NPC yang punya misi tersedia.
  if (adaMisi) {
    g.fillStyle = '#ffd54a'
    g.beginPath()
    g.arc(0, -42, 9, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#8d6e00'
    g.lineWidth = 1.5
    g.stroke()
    g.fillStyle = '#4e342e'
    g.font = kecil ? 'bold 11px system-ui, sans-serif' : 'bold 12px system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('!', 0, -42)
  }
  g.restore()
}

// ---------------------------------------------------------------- komponen ----

export function Jelajah({
  petaId,
  masuk,
  onPindahPeta,
  onPlayChapter,
  onPlayTugas,
  onPlayTangkap,
  onPlayKuis,
  onOpenMisi,
  onOpenPanduan,
  onOpenToko,
  onOpenEcoShop,
  onPulang,
}: {
  /** Peta canvas yang sedang dibuka (bukan 'rumah'). */
  petaId: PetaId
  /** Titik masuk di peta ini (dari portal tujuan); null = spawn peta. */
  masuk: { x: number; y: number } | null
  /** Pindah ke peta lain lewat portal (tujuan + titik masuknya). */
  onPindahPeta: (peta: PetaId, masuk: { x: number; y: number }) => void
  onPlayChapter: (chapterId: ChapterId) => void
  onPlayTugas: (tugasId: TugasKaderId) => void
  /** Buka game arkade Tangkap Sampah (lewat NPC Kak Yoga). */
  onPlayTangkap: () => void
  /** Buka game arkade Kuis Adiwiyata (lewat NPC Kak Dara). */
  onPlayKuis: () => void
  onOpenMisi: () => void
  /** Buka panduan Cara Bermain (overlay dari runner). */
  onOpenPanduan: () => void
  /** Buka Toko Kantin (lewat dialog Kang Kantin / Mbak Dewi). */
  onOpenToko: () => void
  /** Buka Toko Kantin langsung di seksi Eco-Shop (lewat Booth Eco-Shop
   * di Kebun). */
  onOpenEcoShop: () => void
  /** Kembali ke Rumah lewat portal Jalan Pulang. */
  onPulang: () => void
}) {
  const { save, dispatch } = useCampaign()
  /** Peta aktif dari registry; petaRef dipakai loop utama (efek []) supaya
   * selalu membaca peta terbaru tanpa memasang ulang loop. */
  const peta = PETA[petaId]
  const petaRef = useRef(peta)
  petaRef.current = peta
  /** Titik interaksi di peta ini (undefined bila peta tidak punya titik
   * itu — mis. 'pilah' hanya ada di Gerbang). Dipakai handler pointer
   * (render segar); loop utama memakai cariTitik(petaRef.current, ...). */
  const pilahPos = cariTitik(peta, 'pilah')
  const bankPos = cariTitik(peta, 'bank-sampah')
  const ecoPos = cariTitik(peta, 'eco-shop')
  const kotakPos = cariTitik(peta, 'kotak-maggot')
  const misiAktif = misiSaatIni(save)
  const pemberiAktif = misiAktif ? pemberiMisi(misiAktif) : undefined
  const kaderSelesai = jumlahTugasSelesai(save)
  const [toast, setToast] = useState<string | null>(null)
  const [dialogNpc, setDialogNpc] = useState<NpcDunia | null>(null)
  const [dialogIdx, setDialogIdx] = useState(0)
  const [nearby, setNearby] = useState<NpcDunia | null>(null)
  /** Portal yang sedang diinjak pemain (null bila tidak ada) — tombol
   * pindah tampil. Portal eksplisit, bukan jalan-masuk otomatis. */
  const [dekatPortal, setDekatPortal] = useState<PortalPeta | null>(null)
  /** Dialog pilah di Tempat Sampah Terpilah (bukan dialog NPC). */
  const [dialogPilah, setDialogPilah] = useState(false)
  /** Jenis sampah yang dipilih di dialog pilah (null = belum pilih). */
  const [jenisDipilih, setJenisDipilih] = useState<TongSampah | null>(null)
  /** Umpan balik Magi 1 kalimat setelah pilah benar/salah (null = belum ada). */
  const [pesanPilah, setPesanPilah] = useState<{ jenis: 'benar' | 'salah'; teks: string } | null>(null)
  /** true bila pemain berdiri dekat Tempat Sampah Terpilah. */
  const [dekatPilah, setDekatPilah] = useState(false)
  /** Dialog Bank Sampah di Kebun (bukan dialog NPC). */
  const [dialogBank, setDialogBank] = useState(false)
  /** true bila pemain berdiri dekat Bank Sampah. */
  const [dekatBank, setDekatBank] = useState(false)
  /** true bila pemain berdiri dekat Booth Eco-Shop di Kebun. */
  const [dekatEco, setDekatEco] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticRef = useRef<HTMLCanvasElement | null>(null)
  /** Nilai `panelSurya` yang dipakai saat lapisan statis terakhir dibangun
   * (dirty-flag P2): bila save berubah, update() membangun ulang statis
   * sekali supaya panel baru langsung muncul tanpa pindah peta. */
  const panelStatisRef = useRef(false)
  /** Jumlah pohon ditanam yang dipakai saat lapisan statis terakhir
   * dibangun (dirty-flag C-41): bila save berubah, update() membangun
   * ulang statis sekali supaya pohon baru langsung muncul di Taman. */
  const pohonStatisRef = useRef(0)
  /** Varian lebar terakhir yang dipakai lapisan statis (null = belum ada
   * lapisan): dipakai atur() untuk membangun ulang hanya bila lebar
   * melewati ambang 480px. */
  const sempitRef = useRef<boolean | null>(null)
  const viewRef = useRef({ w: 0, h: 0 })
  const dprRef = useRef(1)
  const playerRef = useRef<PemainState>({
    x: peta.spawn.x,
    y: peta.spawn.y,
    arah: 'bawah',
    bergerak: false,
    fase: 0,
  })
  const npcsRef = useRef<NpcJalan[]>(
    peta.npc.map((n) => ({
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
  /** Target click-to-move (mouse); null bila tidak sedang berjalan otomatis. */
  const tujuanRef = useRef<TujuanJalan | null>(null)
  /** true bila perangkat punya pointer kasar (layar sentuh) — joystick. */
  const coarseRef = useRef(false)
  /** true bila perangkat punya pointer halus (mouse laptop/desktop) — hint keyboard. */
  const [isDesktop, setIsDesktop] = useState(false)
  /** true bila laptop/desktop berlayar lebar — canvas dunia boleh lebih tinggi. */
  const [isDesktopLebar, setIsDesktopLebar] = useState(false)
  const trashRef = useRef<boolean[]>(peta.sampah.map(() => false))
  const popsRef = useRef<{ x: number; y: number; t: number; teks: string }[]>([])
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  /** Kamera halus (smoothing + deadzone + look-ahead); di-reset (hard-cut)
   * tiap pindah peta supaya tidak "terbang" menyeberang peta. */
  const camRef = useRef(buatKamera())
  /** Sistem partikel terpadu (F1): pool tetap, dipakai ulang tiap hadiah. */
  const partikelRef = useRef(buatPartikel())
  /** Awan peta aktif (V3): dibuat ulang tiap pindah peta. */
  const awanRef = useRef(buatAwan(peta.id, peta.lebar, peta.tinggi))
  /** Timer spawn daun melayang (V3): ~1 daun per 1,1 detik di peta luar. */
  const daunTimerRef = useRef(0)
  /** Jarak tempuh sejak langkah kaki terakhir (R10): tiap ~34 unit dunia
   * satu bunyi langkah, kiri-kanan bergantian. */
  const jarakLangkahRef = useRef(0)
  const kakiKiriRef = useRef(false)
  const dialogRef = useRef<NpcDunia | null>(null)
  const dialogIdxRef = useRef(0)
  const nearbyRef = useRef<string | null>(null)
  /** Portal yang sedang diinjak (cermin state dekatPortal). */
  const portalRef = useRef<PortalPeta | null>(null)
  /** true bila dialog pilah terbuka (cermin state dialogPilah) — dipakai
   * loop utama untuk menjeda gerak seperti dialog NPC. */
  const pilahRef = useRef(false)
  /** true bila pemain berdiri dekat Tempat Sampah Terpilah (cermin dekatPilah). */
  const pilahDekatRef = useRef(false)
  /** true bila dialog Bank Sampah terbuka (cermin state dialogBank) — dipakai
   * loop utama untuk menjeda gerak seperti dialog NPC. */
  const bankRef = useRef(false)
  /** true bila pemain berdiri dekat Bank Sampah (cermin dekatBank). */
  const bankDekatRef = useRef(false)
  /** true bila pemain berdiri dekat Booth Eco-Shop (cermin dekatEco). */
  const ecoDekatRef = useRef(false)
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

  /** Buka dialog pilah (dipakai tombol, keyboard, dan ketuk bak). */
  const bukaPilah = () => {
    klik()
    pilahRef.current = true
    setJenisDipilih(null)
    setPesanPilah(null)
    setDialogPilah(true)
  }

  const tutupPilah = () => {
    pilahRef.current = false
    setDialogPilah(false)
    setJenisDipilih(null)
    setPesanPilah(null)
  }

  /** Buka dialog Bank Sampah (dipakai tombol, keyboard, dan ketuk meja). */
  const bukaBank = () => {
    klik()
    bankRef.current = true
    setDialogBank(true)
  }

  const tutupBank = () => {
    bankRef.current = false
    setDialogBank(false)
  }

  /** Buka Toko Kantin langsung di seksi Eco-Shop (lewat Booth Eco-Shop
   * di Kebun). Tidak ada dialog — langsung ke layar toko. */
  const bukaEco = () => {
    klik()
    onOpenEcoShop()
  }

  /** Jalan pintas "Ke Kantin" dari peringatan Lapar/Haus rendah: bila
   * sudah di peta Kantin, langsung buka Toko Kantin; bila di peta lain,
   * pindah ke peta Kantin (titik masuk portal gerbang). Bukan hukuman. */
  const keKantin = () => {
    klik()
    if (petaId === 'kantin') {
      onOpenToko()
    } else {
      onPindahPeta('kantin', { ...PETA.kantin.spawn })
    }
  }

  /** Setor semua sampah yang dibawa: satu aksi reducer atomik
   * SETOR_BANK_SAMPAH (hitung total -> tambah uang + koin -> kosongkan
   * inventaris); inventaris kosong -> tidak terjadi apa-apa. */
  const setorBank = () => {
    const ringkasan = hitungSetoran(saveRef.current.sampahDibawa ?? {})
    if (ringkasan.jumlah <= 0) return
    dispatch({ type: 'SETOR_BANK_SAMPAH' })
    benar()
    koin()
    // Tier sedang: daun + cincin hijau + angka hadiah di posisi pemain.
    feedback(
      partikelRef.current,
      'sedang',
      playerRef.current.x,
      playerRef.current.y - 20,
      [`+Rp${ringkasan.uang.toLocaleString('id-ID')}`, `+${ringkasan.koin} Koin Hijau`],
      { reduced: reducedRef.current },
    )
    tutupBank()
    showToast(
      `Kamu menyetor ${ringkasan.jumlah} sampah: +Rp${ringkasan.uang.toLocaleString('id-ID')} + ${ringkasan.koin} Koin Hijau`,
    )
  }

  /** Pilah jenis yang dipilih ke bak: benar -> hadiah (reducer atomik
   * PILAH_SAMPAH), salah -> Magi 1 kalimat, tanpa hukuman, bisa coba lagi. */
  const pilahKeBak = (bak: TongSampah) => {
    const jenis = jenisDipilih
    if (!jenis) return
    const jumlah = saveRef.current.sampahDibawa?.[jenis] ?? 0
    if (jumlah <= 0) {
      setJenisDipilih(null)
      return
    }
    if (bak === jenis) {
      dispatch({ type: 'PILAH_SAMPAH', jenis, bak })
      benar()
      koin()
      // Tier sedang: daun + cincin hijau + angka hadiah di posisi pemain.
      feedback(
        partikelRef.current,
        'sedang',
        playerRef.current.x,
        playerRef.current.y - 20,
        [
          `+${jumlah * HADIAH_PILAH_KOIN} Koin Hijau`,
          `+Rp${(jumlah * HADIAH_PILAH_UANG).toLocaleString('id-ID')}`,
        ],
        { reduced: reducedRef.current },
      )
      setPesanPilah({
        jenis: 'benar',
        teks: `Benar! ${jumlah} sampah ${NAMA_BAK[jenis]} jadi +${jumlah * HADIAH_PILAH_KOIN} Koin Hijau dan +Rp${(jumlah * HADIAH_PILAH_UANG).toLocaleString('id-ID')}.`,
      })
      setJenisDipilih(null)
    } else {
      salah()
      setPesanPilah({ jenis: 'salah', teks: `Itu masuk bak ${NAMA_BAK[jenis]}, coba lagi ya!` })
    }
  }

  const lanjutDialog = () => {
    const npc = dialogRef.current
    if (!npc) return
    // Pakai dialog dengan ingatan supaya jumlah baris cocok dengan yang
    // dirender (Magi / Pak Plastik bisa punya baris tambahan).
    const konten = dialogDenganIngatan(npc.id, saveRef.current.pakPlastik)
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
  const bukaPilahRef = useRef(bukaPilah)
  const tutupPilahRef = useRef(tutupPilah)
  bukaPilahRef.current = bukaPilah
  tutupPilahRef.current = tutupPilah
  const bukaBankRef = useRef(bukaBank)
  const tutupBankRef = useRef(tutupBank)
  bukaBankRef.current = bukaBank
  tutupBankRef.current = tutupBank
  const bukaEcoRef = useRef(bukaEco)
  bukaEcoRef.current = bukaEco

  /** Pindah lewat portal (dipakai tombol, keyboard, dan ketuk): portal ke
   * Rumah memanggil onPulang, portal antar peta memanggil onPindahPeta
   * dengan titik masuk peta tujuan. */
  const pindahPortal = (portal: PortalPeta) => {
    klik()
    if (portal.tujuan === 'rumah') {
      onPulang()
      return
    }
    onPindahPeta(portal.tujuan, { x: portal.masukX, y: portal.masukY })
  }
  const pindahPortalRef = useRef(pindahPortal)
  pindahPortalRef.current = pindahPortal

  const toggleBisukan = () => {
    const next = !save.muted
    dispatch({ type: 'SET_MUTED', muted: next })
    setSuaraMuted(next)
    if (!next) klik()
  }

  // Ducking musik (A2): selagi dialog apa pun terbuka di dunia (NPC,
  // pilah, Bank Sampah), musik turun −12 dB; kembali normal saat semua
  // tertutup. Refcount di suara.ts menjaga bila dialog lain juga ducking.
  const dialogTerbuka = dialogNpc !== null || dialogPilah || dialogBank
  useEffect(() => {
    if (!dialogTerbuka) return
    duckMusik()
    return () => unduckMusik()
  }, [dialogTerbuka])

  // Ambience per peta (R10): Kantin ramai, Kebun/Taman/Gerbang burung,
  // Pos Maggot berdengung pelan. Berhenti saat pindah peta / keluar dunia
  // (cleanup). Rumah hening — tidak ada ambience di sana.
  useEffect(() => {
    mulaiAmbience(petaId)
    return () => hentikanAmbience()
  }, [petaId])

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
      // Perubahan lebar di dalam satu varian tidak membangun ulang.
      const sempit = pandangSempit(w)
      if (staticRef.current && sempitRef.current !== null && sempit !== sempitRef.current) {
        staticRef.current = bangunStatis(
          petaRef.current,
          sempit,
          saveRef.current.panelSurya,
          saveRef.current.pohonDitanam ?? 0,
        )
        panelStatisRef.current = saveRef.current.panelSurya
        pohonStatisRef.current = saveRef.current.pohonDitanam ?? 0
      }
      sempitRef.current = sempit
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

  // Perangkat sentuh vs laptop: joystick hanya untuk pointer coarse,
  // hint keyboard hanya untuk pointer fine. Listener supaya berubah saat
  // perangkat (mis. layar sentuh) dipasang/dilepas.
  useEffect(() => {
    const mqCoarse = window.matchMedia('(pointer: coarse)')
    const mqFine = window.matchMedia('(pointer: fine)')
    const mqLebar = window.matchMedia('(min-width: 1024px)')
    const perbarui = () => {
      coarseRef.current = mqCoarse.matches
      setIsDesktop(mqFine.matches)
      setIsDesktopLebar(mqFine.matches && mqLebar.matches)
    }
    perbarui()
    mqCoarse.addEventListener('change', perbarui)
    mqFine.addEventListener('change', perbarui)
    mqLebar.addEventListener('change', perbarui)
    return () => {
      mqCoarse.removeEventListener('change', perbarui)
      mqFine.removeEventListener('change', perbarui)
      mqLebar.removeEventListener('change', perbarui)
    }
  }, [])

  // Ganti peta: reset posisi pemain ke titik masuk portal (atau spawn),
  // bangun ulang NPC + sampah + gambar statis peta yang baru, dan tutup
  // semua dialog supaya tidak ada dialog peta lama yang tertinggal.
  useEffect(() => {
    const titik = masuk ?? peta.spawn
    playerRef.current = { x: titik.x, y: titik.y, arah: 'bawah', bergerak: false, fase: 0 }
    npcsRef.current = peta.npc.map((n) => ({
      ...n,
      homeX: n.x,
      homeY: n.y,
      sudut: Math.random() * Math.PI * 2,
      timer: 1 + Math.random() * 2,
      fase: Math.random() * Math.PI * 2,
    }))
    trashRef.current = peta.sampah.map(() => false)
    popsRef.current = []
    tujuanRef.current = null
    nearbyRef.current = null
    setNearby(null)
    portalRef.current = null
    setDekatPortal(null)
    pilahDekatRef.current = false
    setDekatPilah(false)
    bankDekatRef.current = false
    setDekatBank(false)
    ecoDekatRef.current = false
    setDekatEco(false)
    zoneRef.current = null
    dialogRef.current = null
    setDialogNpc(null)
    setDialogIdx(0)
    pilahRef.current = false
    setDialogPilah(false)
    bankRef.current = false
    setDialogBank(false)
    // Pindah peta: kamera hard-cut ke posisi baru (tanpa smoothing).
    resetKamera(camRef.current)
    // Pindah peta: partikel + angka lama dibuang, awan dibuat baru.
    resetPartikel(partikelRef.current)
    awanRef.current = buatAwan(peta.id, peta.lebar, peta.tinggi)
    daunTimerRef.current = 0
    staticRef.current = bangunStatis(
      peta,
      pandangSempit(viewRef.current.w),
      saveRef.current.panelSurya,
      saveRef.current.pohonDitanam ?? 0,
    )
    panelStatisRef.current = saveRef.current.panelSurya
    pohonStatisRef.current = saveRef.current.pohonDitanam ?? 0
    sempitRef.current = pandangSempit(viewRef.current.w)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petaId, masuk])

  // Loop utama: update + gambar + keyboard + jeda saat tab disembunyikan.
  useEffect(() => {
    staticRef.current = bangunStatis(
      petaRef.current,
      pandangSempit(viewRef.current.w),
      saveRef.current.panelSurya,
      saveRef.current.pohonDitanam ?? 0,
    )
    panelStatisRef.current = saveRef.current.panelSurya
    pohonStatisRef.current = saveRef.current.pohonDitanam ?? 0
    sempitRef.current = pandangSempit(viewRef.current.w)

    const update = (dt: number) => {
      const p = playerRef.current
      const peta = petaRef.current
      // Prerender (P2) — invalidasi Panel Surya & pohon ditanam: pembelian
      // Panel Surya (BELI_ECO di Eco-Shop, Kebun) mengubah save.panelSurya
      // dari false ke true, dan TANAM_POHON menambah save.pohonDitanam.
      // Bila peta Taman sedang terbuka, lapisan statis dibangun ulang
      // SEKALI di frame ini supaya panel biru / pohon baru langsung muncul
      // — pemain tidak perlu pindah peta dulu. Di peta lain pun aman:
      // bangunStatis hanya menggambar panel/pohon bila titiknya ada
      // (hanya Taman). Dua banding per frame; tidak ada alokasi.
      if (
        panelStatisRef.current !== saveRef.current.panelSurya ||
        pohonStatisRef.current !== (saveRef.current.pohonDitanam ?? 0)
      ) {
        panelStatisRef.current = saveRef.current.panelSurya
        pohonStatisRef.current = saveRef.current.pohonDitanam ?? 0
        staticRef.current = bangunStatis(
          peta,
          pandangSempit(viewRef.current.w),
          saveRef.current.panelSurya,
          saveRef.current.pohonDitanam ?? 0,
        )
        sempitRef.current = pandangSempit(viewRef.current.w)
      }
      const dialogTerbuka = dialogRef.current !== null || pilahRef.current || bankRef.current
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
      // berjalan sendiri menuju target klik (NPC diikuti bila ia berpindah).
      if (Math.hypot(vx, vy) > 0.01) {
        tujuanRef.current = null
      } else if (tujuanRef.current && !dialogTerbuka) {
        const tujuan = tujuanRef.current
        let tx = tujuan.x
        let ty = tujuan.y
        let npcTarget: NpcJalan | undefined
        if (tujuan.npcId) {
          npcTarget = npcsRef.current.find((n) => n.id === tujuan.npcId)
          if (!npcTarget) {
            tujuanRef.current = null
          } else {
            tx = npcTarget.x
            ty = npcTarget.y
          }
        }
        if (tujuanRef.current) {
          const dx = tx - p.x
          const dy = ty - p.y
          const jarak = Math.hypot(dx, dy)
          const ambang = npcTarget ? JARAK_BICARA - 6 : 10
          if (jarak <= ambang) {
            tujuanRef.current = null
            if (npcTarget) bukaDialogRef.current(npcTarget)
          } else {
            vx = dx / jarak
            vy = dy / jarak
          }
        }
      }
      const panjang = Math.hypot(vx, vy)
      const bergerak = panjang > 0.01 && !dialogTerbuka
      if (bergerak) {
        vx /= Math.max(1, panjang)
        vy /= Math.max(1, panjang)
        // Sepatu Eco-Runner: kecepatan gerak +35% permanen. Hanya gerak
        // pemain yang dikali — animasi jalan (p.fase) dan timer misi tidak
        // ikut berubah.
        const kecepatan = KECEPATAN * (saveRef.current.sepatuEco ? 1.35 : 1)
        const xLama = p.x
        const yLama = p.y
        const nx = p.x + vx * kecepatan * dt
        const ny = p.y + vy * kecepatan * dt
        // Pindah per sumbu supaya bisa geser di sepanjang dinding.
        if (!tabrakan(peta, nx, p.y, RADIUS_PEMAIN)) p.x = nx
        if (!tabrakan(peta, p.x, ny, RADIUS_PEMAIN)) p.y = ny
        // R10: SFX langkah kaki — satu bunyi tiap ~34 unit dunia yang
        // benar-benar ditempuh (bukan saat mendorong dinding), kaki
        // kiri-kanan bergantian. Melewati jalur SFX biasa (mute/volume
        // pemain dihormati, diam saat tab tersembunyi).
        jarakLangkahRef.current += Math.hypot(p.x - xLama, p.y - yLama)
        if (jarakLangkahRef.current >= 34) {
          jarakLangkahRef.current -= 34
          kakiKiriRef.current = !kakiKiriRef.current
          langkah(kakiKiriRef.current)
        }
        p.fase += dt * 10
        p.arah =
          Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'kanan' : 'kiri') : vy > 0 ? 'bawah' : 'atas'
      }
      p.bergerak = bergerak

      // Kamera halus: kejar pemain dengan smoothing eksponensial,
      // deadzone ±24px, dan look-ahead searah gerak (lihat kamera.ts).
      const gerak = bergerak ? { x: vx, y: vy } : { x: 0, y: 0 }
      const view = viewRef.current
      perbaruiKamera(camRef.current, p.x, p.y, view.w, view.h, peta.lebar, peta.tinggi, dt, gerak.x, gerak.y)

      // Partikel (F1): majukan tiap frame; atmosfer (V3) hanya di peta
      // luar dan dimatikan saat prefers-reduced-motion.
      perbaruiPartikel(partikelRef.current, dt)
      if (peta.luarRuang && !reducedRef.current) {
        perbaruiAwan(awanRef.current, peta.lebar, dt)
        daunTimerRef.current += dt
        if (daunTimerRef.current >= 1.1) {
          daunTimerRef.current = 0
          // Daun jatuh dari atas jendela pandang yang terlihat (koordinat
          // dunia): bila peta lebih kecil dari pandang, jendela itu mulai
          // dari -offsetPusat, bukan dari kamera.
          spawnDaun(
            partikelRef.current,
            camRef.current.x - offsetPusat(view.w, peta.lebar),
            camRef.current.y - offsetPusat(view.h, peta.tinggi),
            view.w,
          )
        }
      }

      // Click-to-move macet (mis. target di balik dinding): batalkan supaya
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
        if (tujuan.macet > 0.6) {
          const npcMacet = tujuan.npcId
            ? npcsRef.current.find((n) => n.id === tujuan.npcId)
            : undefined
          tujuanRef.current = null
          if (npcMacet) showToast(`Terhalang — dekati ${npcMacet.nama} dulu untuk bicara`)
        }
      }

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
        } else if (!tabrakan(peta, nx, ny, 12)) {
          n.x = nx
          n.y = ny
        } else {
          n.timer = 0
        }
        n.fase += dt * 6
      }

      // Pungut sampah liar dengan berjalan mendekat (dijeda saat dialog
      // terbuka). Hanya titik yang tampil (indeks < sampahLiar, belum
      // dipungut sesi ini) yang bisa dipungut; sampah masuk inventaris
      // `sampahDibawa` (PUNGUT_SAMPAH, sampahLiar tetap -1 seperti dulu)
      // dan baru jadi koin setelah dipilah di Tempat Sampah Terpilah.
      if (!dialogTerbuka) {
        const dunia = saveRef.current.dunia
        for (let i = 0; i < peta.sampah.length; i++) {
          const s = peta.sampah[i]
          // idx global lintas peta: hanya sampah ke-i (i < sampahLiar) yang tampil.
          if (s.idx >= dunia.sampahLiar || trashRef.current[i]) continue
          if (Math.hypot(s.x - p.x, s.y - p.y) < 26) {
            trashRef.current[i] = true
            popsRef.current.push({ x: s.x, y: s.y, t: 0, teks: s.nama })
            // Tier kecil: 3-4 partikel di titik sampah (tanpa angka —
            // nama sampah sudah tampil lewat pop yang sudah ada).
            feedback(partikelRef.current, 'kecil', s.x, s.y, [], { reduced: reducedRef.current })
            dispatch({ type: 'PUNGUT_SAMPAH', jenis: s.jenis })
            klik()
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

      // Portal: pemain di dalam rect portal (dilonggarkan 10 unit) ->
      // tombol pindah tampil. Sengaja BUKAN jalan-masuk otomatis: pemain
      // yang mampir ke Gerbang tidak boleh langsung terlempar pulang.
      const portal =
        peta.portal.find(
          (pp) =>
            p.x >= pp.x - 10 &&
            p.x <= pp.x + pp.w + 10 &&
            p.y >= pp.y - 10 &&
            p.y <= pp.y + pp.h + 10,
        ) ?? null
      if (portal?.id !== portalRef.current?.id) {
        portalRef.current = portal
        setDekatPortal(portal)
      }

      // Tempat Sampah Terpilah (hanya di Gerbang): pemain dalam radius 70
      // dari pusat bak -> tombol "Pilah Sampah" tampil.
      const pilah = cariTitik(peta, 'pilah')
      const diPilah = pilah ? Math.hypot(p.x - pilah.x, p.y - pilah.y) <= 70 : false
      if (diPilah !== pilahDekatRef.current) {
        pilahDekatRef.current = diPilah
        setDekatPilah(diPilah)
      }

      // Bank Sampah di Kebun: pemain dalam radius 70 dari meja
      // -> tombol "Setor Sampah" tampil.
      const bank = cariTitik(peta, 'bank-sampah')
      const diBank = bank ? Math.hypot(p.x - bank.x, p.y - bank.y) <= 70 : false
      if (diBank !== bankDekatRef.current) {
        bankDekatRef.current = diBank
        setDekatBank(diBank)
      }

      // Booth Eco-Shop di Kebun: pemain dalam radius 70 dari stan
      // -> tombol "Eco-Shop" tampil.
      const eco = cariTitik(peta, 'eco-shop')
      const diEco = eco ? Math.hypot(p.x - eco.x, p.y - eco.y) <= 70 : false
      if (diEco !== ecoDekatRef.current) {
        ecoDekatRef.current = diEco
        setDekatEco(diEco)
      }

      // Toast saat masuk zona baru.
      const zona = peta.zona.find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h)
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
      const peta = petaRef.current
      // Kamera halus (diperbarui tiap frame di update); frame pertama
      // setelah pindah peta sudah hard-cut lewat resetKamera.
      const camX = camRef.current.x
      const camY = camRef.current.y
      // K-1: bila pandang lebih lebar/tinggi dari peta, kamera dijepit ke 0
      // (kamera.ts) dan peta dipusatkan lewat offset ini — bukan lewat
      // kamera negatif. Latar digambar di koordinat dunia (0,0) di dalam
      // translate yang sama dengan aktor, jadi keduanya selalu sejajar.
      // Jendela dunia yang terlihat: [camX-offX, camX-offX+view.w].
      const offX = offsetPusat(view.w, peta.lebar)
      const offY = offsetPusat(view.h, peta.tinggi)
      const jendelaX = camX - offX
      const jendelaY = camY - offY
      ctx.save()
      ctx.translate(offX - camX, offY - camY)
      const statis = staticRef.current
      if (statis) {
        ctx.drawImage(statis, 0, 0)
      }
      // Atmosfer (V3): awan bergerak pelan di atas tanah, di bawah aktor.
      // Hanya di peta luar; di dalam (Kantin) langit tidak ada.
      if (peta.luarRuang) {
        gambarAwan(ctx, awanRef.current, jendelaX, jendelaY, view.w, view.h)
      }
      // Zona bab yang masih terkunci tampil pudar.
      const saveSekarang = saveRef.current
      for (const z of peta.zona) {
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
      // Sampah liar berkilau: hanya N titik pertama yang tampil, N =
      // save.dunia.sampahLiar, dan yang sudah dipungut sesi ini disembunyikan.
      const dunia = saveRef.current.dunia
      const detik = t / 1000
      peta.sampah.forEach((s, i) => {
        if (s.idx >= dunia.sampahLiar || trashRef.current[i]) return
        const denyut = reducedRef.current ? 0.7 : 0.55 + 0.35 * Math.sin(detik * 3 + i * 1.3)
        ctx.globalAlpha = denyut
        ctx.fillStyle = '#ffd54a'
        ctx.beginPath()
        ctx.arc(s.x, s.y - 11, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        gambarSampah(ctx, s.x, s.y, i)
      })
      // R2: panduan pemula — pemain baru di Gerbang diarahkan ke sampah
      // liar terdekat dengan panah emas yang memantul lembut (tanpa
      // reduced motion: panah diam). Tampil hanya bila belum ada progres
      // apa pun (hasProgress false — hilang begitu sampah pertama
      // dipungut, karena sampahLiar lalu ≠ 3).
      if (peta.id === 'gerbang' && !hasProgress(saveRef.current)) {
        let target: { x: number; y: number } | null = null
        let jarakTarget = Infinity
        for (let i = 0; i < peta.sampah.length; i++) {
          const s = peta.sampah[i]
          if (s.idx >= dunia.sampahLiar || trashRef.current[i]) continue
          const d = Math.hypot(s.x - p.x, s.y - p.y)
          if (d < jarakTarget) {
            jarakTarget = d
            target = s
          }
        }
        if (target) {
          const pantul = reducedRef.current ? 0 : Math.sin(detik * 4) * 4
          const ay = target.y - 30 + pantul
          ctx.fillStyle = '#ffd54a'
          ctx.strokeStyle = '#8d6e00'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(target.x, ay + 12)
          ctx.lineTo(target.x - 8, ay - 2)
          ctx.lineTo(target.x + 8, ay - 2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(target.x, ay - 2)
          ctx.lineTo(target.x, ay - 14)
          ctx.stroke()
        }
      }
      // Efek pop saat memungut: nama sampah yang masuk tas.
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
        ctx.fillText(pp.teks, pp.x, pp.y - 16 - k * 16)
        ctx.globalAlpha = 1
      }
      // Dunia Hidup: 3 petak kebun (hanya di Kebun) + kotak maggot (hanya
      // di Pos Maggot), digambar sebelum tint. Di layar sempit label
      // diperkecil supaya tidak bertumpuk.
      const sempit = view.w < 480
      if (peta.id === 'kebun') {
        for (const petak of dunia.petak) {
          const posPetak = cariTitik(peta, petak.id)
          if (posPetak) gambarPetak(ctx, petak, posPetak, sempit)
        }
      }
      const kotakMaggot = cariTitik(peta, 'kotak-maggot')
      if (kotakMaggot) gambarKotakMaggot(ctx, dunia.maggot, kotakMaggot)
      // Tempat Sampah Terpilah: 5 bak di Plaza Gerbang.
      const pilah = cariTitik(peta, 'pilah')
      if (pilah) gambarTempatPilah(ctx, pilahDekatRef.current, pilah, sempit)
      // Bank Sampah: meja setor di Kebun.
      const bank = cariTitik(peta, 'bank-sampah')
      if (bank) gambarBankSampah(ctx, bankDekatRef.current, bank, sempit)
      // Booth Eco-Shop: stan di Kebun.
      const eco = cariTitik(peta, 'eco-shop')
      if (eco) gambarBoothEco(ctx, ecoDekatRef.current, eco, sempit)
      // Panel Surya TIDAK digambar di sini lagi: panel biru sudah masuk
      // lapisan statis (bangunStatis) bila sudah dibeli, dan dibangun ulang
      // sekali saat save.panelSurya berubah (dirty-flag di update()).
      // Tint waktu nyata: satu fillRect transparan setelah dunia digambar,
      // sebelum aktor digambar. Statis, jadi aman untuk reduced motion.
      ctx.fillStyle = warnaTintWaktu()
      ctx.fillRect(jendelaX, jendelaY, view.w, view.h)
      // NPC + pemain diurutkan sumbu Y supaya yang di depan menutupi yang di belakang.
      const dekatId = nearbyRef.current
      const reduced = reducedRef.current
      const aktor: { y: number; gambar: () => void }[] = []
      for (const n of npcsRef.current) {
        // Tanda "!" untuk NPC yang punya misi tersedia: bab utama (terbuka
        // dan belum selesai) atau Misi Kader (selalu tersedia, belum selesai).
        const adaMisiBab =
          n.chapterId !== null &&
          selectChapterUnlocked(saveSekarang, n.chapterId) &&
          !saveSekarang.chapters[n.chapterId].done
        const adaMisiTugas = n.tugasId !== undefined && !saveSekarang.tugas[n.tugasId].done
        const adaMisi = adaMisiBab || adaMisiTugas
        aktor.push({ y: n.y, gambar: () => gambarNpc(ctx, n, n.id === dekatId, reduced, adaMisi, sempit, n.id === dialogRef.current?.id) })
      }
      aktor.push({
        y: p.y,
        gambar: () =>
          gambarPemain(
            ctx,
            p,
            reduced,
            warnaKostum(saveSekarang.kostumDipakai),
            saveSekarang.jenisKelamin,
            saveSekarang.pinDuta,
            // Kecepatan gerak saat ini: bayangan mengecil sedikit saat cepat.
            p.bergerak ? KECEPATAN * (saveSekarang.sepatuEco ? 1.35 : 1) : 0,
          ),
      })
      aktor.sort((a, b) => a.y - b.y)
      for (const a of aktor) a.gambar()
      // Partikel + angka melayang (F1): koordinat dunia, di atas aktor,
      // mengikuti kamera (sudah di dalam translate ke koordinat dunia).
      gambarPartikel(ctx, partikelRef.current, jendelaX, jendelaY, view.w, view.h)
      ctx.restore()

      // Langit pagi + sinar matahari (V3): overlay ruang layar yang SANGAT
      // tipis (alpha maks 0,10), hanya di peta luar.
      if (peta.luarRuang) {
        gambarLangitPagi(ctx, view.w, view.h)
      }

      // Joystick virtual hanya untuk perangkat sentuh (pointer: coarse);
      // di laptop (pointer: fine) tidak digambar sama sekali.
      // C-5: saat tombol portal tampil di kiri bawah, joystick digeser
      // ke atas (pusat 164px dari bawah, bukan 84px) supaya lingkaran
      // joystick tidak tertutup tombol portal.
      if (coarseRef.current) {
        const joy = joyRef.current
        const cx = 84
        const cy = view.h - (portalRef.current ? 164 : 84)
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
        if (bankRef.current) tutupBankRef.current()
        else if (pilahRef.current) tutupPilahRef.current()
        else tutupDialogRef.current()
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
        if (pilahRef.current) return
        if (bankRef.current) return
        const dekat = npcsRef.current.find((n) => n.id === nearbyRef.current)
        if (dekat) bukaDialogRef.current(dekat)
        else if (pilahDekatRef.current) bukaPilahRef.current()
        else if (bankDekatRef.current) bukaBankRef.current()
        else if (ecoDekatRef.current) bukaEcoRef.current()
        else if (portalRef.current) pindahPortalRef.current(portalRef.current)
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
      if (pilahRef.current) return
      if (bankRef.current) return
      if (key === 'e' || key === 'enter') {
        const dekat = npcsRef.current.find((n) => n.id === nearbyRef.current)
        if (dekat) bukaDialogRef.current(dekat)
        else if (pilahDekatRef.current) bukaPilahRef.current()
        else if (bankDekatRef.current) bukaBankRef.current()
        else if (ecoDekatRef.current) bukaEcoRef.current()
        else if (portalRef.current) pindahPortalRef.current(portalRef.current)
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
    if (dialogRef.current || pilahRef.current || bankRef.current) return
    if ((e.target as HTMLElement).closest('button')) return
    // C-23: klik kanan bukan perintah jalan — abaikan (menu konteks
    // browser tetap bisa dibuka; hanya tombol kiri/sentuh yang jalan).
    if (e.button === 2) return
    // Klik mouse membatalkan click-to-move yang sedang berjalan; klik baru
    // (tap) akan menetapkan target baru di onPointerUp.
    if (e.pointerType === 'mouse') tujuanRef.current = null
    const pos = posisiPointer(e)
    const view = viewRef.current
    const jx = 84
    // C-5: pusat joystick ikut naik saat tombol portal tampil.
    const jy = view.h - (portalRef.current ? 164 : 84)
    // Joystick hanya untuk sentuhan: klik mouse di pojok kiri bawah tidak
    // boleh mengaktifkan joystick yang tak terlihat.
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
      // C-5: pusat joystick ikut naik saat tombol portal tampil.
      const joyY = view.h - (portalRef.current ? 164 : 84)
      let dx = (pos.x - 84) / JARI_JOYSTICK
      let dy = (pos.y - joyY) / JARI_JOYSTICK
      const panjang = Math.hypot(dx, dy)
      if (panjang > 1) {
        dx /= panjang
        dy /= panjang
      }
      joy.vx = dx
      joy.vy = dy
      return
    }
    // Kursor pointer saat mouse hover di atas objek interaktif (NPC, sampah
    // liar, petak kebun, kotak maggot); default di tanah kosong.
    if (e.pointerType === 'mouse') {
      const canvas = canvasRef.current
      if (canvas) {
        const pos = posisiPointer(e)
        const camX = camRef.current.x
        const camY = camRef.current.y
        // Ketukan layar -> koordinat dunia: kurangi offset pemusatan
        // (K-1) lalu tambah kamera.
        const wx = pos.x - offsetPusat(viewRef.current.w, peta.lebar) + camX
        const wy = pos.y - offsetPusat(viewRef.current.h, peta.tinggi) + camY
        const dunia = saveRef.current.dunia
        const pilah = cariTitik(peta, 'pilah')
        const bank = cariTitik(peta, 'bank-sampah')
        const eco = cariTitik(peta, 'eco-shop')
        const kotak = cariTitik(peta, 'kotak-maggot')
        const diAtasInteraktif =
          npcsRef.current.some((n) => Math.hypot(n.x - wx, n.y - wy) < 46) ||
          peta.portal.some((pp) => Math.hypot(pp.x + pp.w / 2 - wx, pp.y + pp.h / 2 - wy) < 46) ||
          (pilah ? Math.hypot(pilah.x - wx, pilah.y - wy) < 70 : false) ||
          (bank ? Math.hypot(bank.x - wx, bank.y - wy) < 46 : false) ||
          (eco ? Math.hypot(eco.x - wx, eco.y - wy) < 46 : false) ||
          peta.sampah.some(
            (s, i) =>
              s.idx < dunia.sampahLiar && !trashRef.current[i] && Math.hypot(s.x - wx, s.y - wy) < 30,
          ) ||
          dunia.petak.some((pp) => {
            const q = cariTitik(peta, pp.id)
            return q ? Math.hypot(q.x - wx, q.y - wy) < 30 : false
          }) ||
          (kotak ? Math.hypot(kotak.x - wx, kotak.y - wy) < 30 : false)
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
    if (dialogRef.current || pilahRef.current || bankRef.current) return
    const pos = posisiPointer(e)
    if (performance.now() - tap.t > 350 || Math.hypot(pos.x - tap.x, pos.y - tap.y) > 14) return
    // Ketuk NPC di canvas.
    const p = playerRef.current
    const camX = camRef.current.x
    const camY = camRef.current.y
    // Ketukan layar -> koordinat dunia: kurangi offset pemusatan (K-1).
    const wx = pos.x - offsetPusat(viewRef.current.w, peta.lebar) + camX
    const wy = pos.y - offsetPusat(viewRef.current.h, peta.tinggi) + camY
    const npc = npcsRef.current.find((n) => Math.hypot(n.x - wx, n.y - wy) < 46)
    if (npc) {
      if (Math.hypot(npc.x - p.x, npc.y - p.y) <= JARAK_BICARA) bukaDialog(npc)
      else if (e.pointerType === 'mouse') {
        // Click-to-move: jalan mendekat, dialog terbuka otomatis saat sampai.
        tujuanRef.current = { x: npc.x, y: npc.y, npcId: npc.id, macet: 0, terakhirX: p.x, terakhirY: p.y }
      } else showToast(`Dekati ${npc.nama} dulu untuk bicara`)
      return
    }

    // Portal: ketuk untuk pindah bila sudah dekat; klik mouse dari jauh
    // berjalan mendekat dulu (tombol pindah muncul saat sampai).
    const portal = peta.portal.find((pp) => {
      const pcx = pp.x + pp.w / 2
      const pcy = pp.y + pp.h / 2
      return Math.hypot(pcx - wx, pcy - wy) < 46
    })
    if (portal) {
      const portalCx = portal.x + portal.w / 2
      const portalCy = portal.y + portal.h / 2
      if (Math.hypot(portalCx - p.x, portalCy - p.y) <= 70) {
        pindahPortal(portal)
      } else if (e.pointerType === 'mouse') {
        tujuanRef.current = { x: portalCx, y: portalCy, macet: 0, terakhirX: p.x, terakhirY: p.y }
      } else {
        showToast(`Dekati ${portal.label} dulu`)
      }
      return
    }

    // --- Perawatan Dunia Hidup (ketuk sederhana, bukan gestur) ---
    // Ketuk hanya berlaku bila pemain dalam jarak 70 unit dunia dari objek.
    const dunia = save.dunia
    const sekarang = Date.now()
    const dekatObjek = (x: number, y: number) => Math.hypot(x - p.x, y - p.y) <= 70

    // Tempat Sampah Terpilah (hanya di Gerbang): ketuk untuk membuka dialog pilah.
    if (
      pilahPos &&
      wx >= pilahPos.x - 110 &&
      wx <= pilahPos.x + 110 &&
      wy >= pilahPos.y - 56 &&
      wy <= pilahPos.y + 36
    ) {
      if (!dekatObjek(pilahPos.x, pilahPos.y)) {
        if (e.pointerType === 'mouse') {
          // Click-to-move: jalan mendekat dulu, lalu ketuk lagi untuk membuka.
          tujuanRef.current = { x: pilahPos.x, y: pilahPos.y + 46, macet: 0, terakhirX: p.x, terakhirY: p.y }
        } else {
          showToast('Dekati Tempat Sampah Terpilah dulu untuk memilah')
        }
        return
      }
      bukaPilah()
      return
    }

    // Bank Sampah di Kebun: ketuk meja untuk membuka dialog setor.
    // Rect persis meja (x492-588, y85-115): jauh dari petak-2 (bedeng
    // x280-320, y140-162) — ketukan di bedeng petak tetap merawat petak.
    if (
      bankPos &&
      wx >= bankPos.x - 48 &&
      wx <= bankPos.x + 48 &&
      wy >= bankPos.y - 15 &&
      wy <= bankPos.y + 15
    ) {
      if (!dekatObjek(bankPos.x, bankPos.y)) {
        if (e.pointerType === 'mouse') {
          // Click-to-move: jalan mendekat dulu, lalu ketuk lagi untuk membuka.
          tujuanRef.current = { x: bankPos.x, y: bankPos.y + 46, macet: 0, terakhirX: p.x, terakhirY: p.y }
        } else {
          showToast('Dekati Bank Sampah dulu untuk menyetor')
        }
        return
      }
      bukaBank()
      return
    }

    // Booth Eco-Shop di Kebun: ketuk stan untuk membuka Toko Kantin di
    // seksi Eco-Shop. Rect persis stan (x492-588, y185-215): di luar
    // tap-radius petak dan rect Bank Sampah (y85-115).
    if (
      ecoPos &&
      wx >= ecoPos.x - 48 &&
      wx <= ecoPos.x + 48 &&
      wy >= ecoPos.y - 15 &&
      wy <= ecoPos.y + 15
    ) {
      if (!dekatObjek(ecoPos.x, ecoPos.y)) {
        if (e.pointerType === 'mouse') {
          // Click-to-move: jalan mendekat dulu, lalu ketuk lagi untuk membuka.
          tujuanRef.current = { x: ecoPos.x, y: ecoPos.y + 64, macet: 0, terakhirX: p.x, terakhirY: p.y }
        } else {
          showToast('Dekati Booth Eco-Shop dulu untuk berbelanja')
        }
        return
      }
      bukaEco()
      return
    }

    // Petak kebun: tahap 3 dipanen, selain itu disiram.
    for (const petak of dunia.petak) {
      const posPetak = cariTitik(peta, petak.id)
      if (!posPetak) continue
      if (Math.hypot(posPetak.x - wx, posPetak.y - wy) >= 30) continue
      if (!dekatObjek(posPetak.x, posPetak.y)) {
        showToast(`Dekati petak ${NAMA_TANAMAN[petak.jenis]} dulu untuk merawatnya`)
        return
      }
      if (petak.tahap === 3) {
        const hasil = panenTanaman(dunia, petak.id, sekarang)
        if (hasil.koin === 0) {
          showToast(hasil.pesan)
          return
        }
        showToast(hasil.pesan)
        panen()
        koin()
        // Tier sedang: daun + cincin hijau + angka hadiah di petak.
        feedback(partikelRef.current, 'sedang', posPetak.x, posPetak.y - 10, [`+${hasil.koin} Koin Hijau`], {
          reduced: reducedRef.current,
        })
        dispatch({ type: 'PERAWATAN_DUNIA', aksi: 'panen', petakId: petak.id, sekarang })
      } else {
        const hasil = siramTanaman(dunia, petak.id, sekarang)
        showToast(hasil.pesan)
        // K-5: siram ulang di hari yang sama tidak mengubah apa pun dan
        // tidak berkoin — cukup toast, tanpa angka hadiah dan tanpa dispatch.
        if (hasil.koin === 0) return
        siram()
        // Tier kecil: percik hijau + angka hadiah di petak.
        feedback(partikelRef.current, 'kecil', posPetak.x, posPetak.y - 10, [`+${hasil.koin} Koin Hijau`], {
          reduced: reducedRef.current,
        })
        dispatch({ type: 'PERAWATAN_DUNIA', aksi: 'siram', petakId: petak.id, sekarang })
      }
      return
    }

    // Kotak maggot: tahap 2 panen kasgot, selain itu beri makan.
    if (kotakPos && Math.hypot(kotakPos.x - wx, kotakPos.y - wy) < 30) {
      if (!dekatObjek(kotakPos.x, kotakPos.y)) {
        showToast('Dekati kotak maggot dulu untuk merawat Magi')
        return
      }
      if (dunia.maggot.tahap === 2) {
        // Target otomatis: petak tahap terendah yang tidak layu dan belum tahap 3.
        const target = [...dunia.petak]
          .filter((pp) => !pp.layu && pp.tahap < 3)
          .sort((a, b) => a.tahap - b.tahap)[0]
        if (!target) {
          showToast('Semua petak sudah berbunga atau sedang layu, kasgot belum bisa dipakai.')
          return
        }
        const hasil = panenKasgot(dunia, target.id, sekarang)
        showToast(hasil.pesan)
        // K-5: panen kasgot kedua di hari yang sama tetap memanen (maggot
        // kembali kecil, petak tetap tumbuh) tapi tanpa koin — jadi tetap
        // di-dispatch supaya perubahan dunianya tersimpan, hanya angka
        // hadiah + suara panen yang dilewati bila koin 0.
        if (hasil.koin > 0) {
          panen()
          // Tier sedang: daun + cincin hijau + angka hadiah di kotak maggot.
          feedback(partikelRef.current, 'sedang', kotakPos.x, kotakPos.y - 10, [`+${hasil.koin} Koin Hijau`], {
            reduced: reducedRef.current,
          })
        }
        dispatch({ type: 'PERAWATAN_DUNIA', aksi: 'panenKasgot', petakId: target.id, sekarang })
      } else {
        const hasil = beriMakanMaggot(dunia, sekarang)
        showToast(hasil.pesan)
        sfxMaggot()
        // K-5: pemberian kedua dan seterusnya di hari yang sama tetap
        // memberi makan (lapar turun, Magi tumbuh) tapi tanpa koin —
        // angka hadiah hanya tampil bila ada koin.
        if (hasil.koin > 0) {
          // Tier kecil: percik hijau + angka hadiah di kotak maggot.
          feedback(partikelRef.current, 'kecil', kotakPos.x, kotakPos.y - 10, [`+${hasil.koin} Koin Hijau`], {
            reduced: reducedRef.current,
          })
        }
        dispatch({ type: 'PERAWATAN_DUNIA', aksi: 'beriMakan', sekarang })
      }
      return
    }

    // Sampah liar: ketuk untuk memungut (sama seperti berjalan mendekat).
    for (let i = 0; i < peta.sampah.length; i++) {
      const s = peta.sampah[i]
      if (s.idx >= dunia.sampahLiar || trashRef.current[i]) continue
      if (Math.hypot(s.x - wx, s.y - wy) >= 30) continue
      if (!dekatObjek(s.x, s.y)) {
        if (e.pointerType === 'mouse') {
          // Click-to-move: pungut otomatis begitu sampai (radius 26 di update).
          tujuanRef.current = { x: s.x, y: s.y, macet: 0, terakhirX: p.x, terakhirY: p.y }
        } else {
          showToast('Dekati sampahnya dulu untuk memungutnya')
        }
        return
      }
      trashRef.current[i] = true
      popsRef.current.push({ x: s.x, y: s.y, t: 0, teks: s.nama })
      // Tier kecil: 3-4 partikel di titik sampah (tanpa angka — nama
      // sampah sudah tampil lewat pop yang sudah ada).
      feedback(partikelRef.current, 'kecil', s.x, s.y, [], { reduced: reducedRef.current })
      klik()
      dispatch({ type: 'PUNGUT_SAMPAH', jenis: s.jenis })
      return
    }

  // Klik mouse di tanah kosong: click-to-move ke titik itu.
  if (e.pointerType === 'mouse') {
    tujuanRef.current = { x: wx, y: wy, macet: 0, terakhirX: p.x, terakhirY: p.y }
  }
}

  // ------------------------------------------------------------ render ----

  const kontenDialog = dialogNpc ? dialogDenganIngatan(dialogNpc.id, save.pakPlastik) : undefined
  // R7: sapaan berubah mengikuti progres (sapaanProgres) — 1 kalimat,
  // memakai data progres yang sudah ada; tanpa sapaan progres, pakai
  // sapaan asli dialog (jumlah baris tetap, lanjutDialog tidak berubah).
  const barisDialog = dialogNpc
    ? [
        sapaanProgres(dialogNpc.id, save) ?? kontenDialog?.sapaan ?? 'Halo!',
        ...(kontenDialog?.baris ?? ['Senang bertemu denganmu!']),
      ]
    : []
  const babNpc: ChapterId | null = dialogNpc?.chapterId ?? null
  const babTerbuka = babNpc ? selectChapterUnlocked(save, babNpc) : false
  const babSelesai = babNpc ? save.chapters[babNpc].done : false
  const tugasNpc: TugasKaderId | null = dialogNpc?.tugasId ?? null
  const tugasNpcSelesai = tugasNpc ? save.tugas[tugasNpc].done : false
  /** Ekspresi NPC di dialog (R7): misi selesai = tertawa senang, selain
   * itu tersenyum — ikon + label, bukan warna saja. */
  const ekspresiDialog =
    (babNpc && babSelesai) || (tugasNpc && tugasNpcSelesai)
      ? { Ikon: Laugh, label: 'tertawa senang' }
      : { Ikon: Smile, label: 'tersenyum' }
  /** R2: panduan pemula — hanya pemain baru di Gerbang, tanpa dialog
   * terbuka. Hilang otomatis begitu ada progres (sampah pertama dipungut). */
  const pemainBaru = !hasProgress(save)
  const tampilkanPanduan = petaId === 'gerbang' && pemainBaru && !dialogNpc && !dialogPilah && !dialogBank
  const diAkhir = dialogIdx >= barisDialog.length - 1
  // Titik pilihan 1 (Cerita Bercabang): hanya untuk NPC pemberi misi UTAMA
  // yang misinya terbuka, dan hanya bila pilihan titik-1 belum pernah dibuat.
  // Pilihan tersimpan di save.cerita, jadi menutup / membuka dialog lain
  // otomatis mereset tampilannya tanpa state lokal.
  const titikPilihan1 = babNpc && !tugasNpc ? PILIHAN_CERITA[babNpc][0] : null
  const kunciPilihan1 = titikPilihan1 && babNpc ? kunciCerita(babNpc, titikPilihan1.id) : null
  const sudahPilih1 = kunciPilihan1 ? save.cerita?.[kunciPilihan1] !== undefined : false
  const tampilkanPilihan1 = diAkhir && !!titikPilihan1 && babTerbuka && !sudahPilih1
  /** Jumlah sampah liar yang dibawa (semua jenis) — tampil di HUD. */
  const totalDibawa = Object.values(save.sampahDibawa ?? {}).reduce((a, b) => a + b, 0)
  /** Ringkasan setor Bank Sampah dari inventaris saat ini. */
  const ringkasanBank = hitungSetoran(save.sampahDibawa ?? {})

  return (
    <div className="aia-stack">
      <div className="aia-hud">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Coins aria-hidden="true" /> <AngkaAnimasi nilai={save.coins} /> Koin Hijau
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Award aria-hidden="true" /> Skor Adiwiyata: <AngkaAnimasi nilai={save.skorAdiwiyata ?? 0} />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Trash2 aria-hidden="true" /> {totalDibawa} sampah dibawa
        </span>
        <span>
          Sampah liar: {save.dunia.sampahLiar}
        </span>
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
        onKeKantin={keKantin}
      />

      {misiAktif && pemberiAktif ? (
        <div className="aia-hud">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 220px' }}>
            <Flag aria-hidden="true" /> Misi {CHAPTER_ORDER.indexOf(misiAktif) + 1}/6: {CHAPTERS[misiAktif].judul} — temui{' '}
            {pemberiAktif.nama} di {LOKASI_PEMBERI[pemberiAktif.id] ?? 'sekolah'}
          </span>
          <button type="button" className="aia-btn aia-btn-ghost" onClick={onOpenMisi}>
            Lihat semua misi
          </button>
        </div>
      ) : kaderSelesai < 8 ? (
        <div className="aia-hud">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 220px' }}>
            <Flag aria-hidden="true" /> Misi Tambahan: {kaderSelesai}/8 selesai — temui pemberi Misi Tambahan di dunia
          </span>
          <button type="button" className="aia-btn aia-btn-ghost" onClick={onOpenMisi}>
            Lihat semua misi
          </button>
        </div>
      ) : (
        <p className="aia-muted" style={{ margin: 0 }}>
          Semua misi selesai! Kamu Pahlawan Adiwiyata!
        </p>
      )}

      {isDesktop && (
        <p className="aia-muted" style={{ margin: 0, fontSize: 12 }}>
          Keyboard: WASD / panah gerak · E bicara, pilah, atau setor · Spasi lanjut dialog · Esc tutup · Klik peta untuk berjalan
        </p>
      )}

      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          // Desktop lebar: area main lebih tinggi (dunia 960x640, jadi
          // 640px menampilkan penuh tinggi dunia); HP tetap seperti semula.
          height: isDesktopLebar ? 'min(72vh, 640px)' : 'min(62vh, 520px)',
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

        <div
          style={{ position: 'absolute', top: 12, left: 12, zIndex: 4 }}
          aria-label={`Peta ${peta.nama}`}
        >
          <span className="aia-chip">{peta.nama}</span>
        </div>

        {tampilkanPanduan && (
          <div className="aia-panduan-pemula" role="status">
            Magi: pungut sampah itu, lalu pilah ke 5 bak di dekat gerbang!
          </div>
        )}

        {toast && (
          <div
            // C-6: toast diturunkan ke top 56 supaya tidak menumpuk chip
            // nama peta (top 12, kiri) di layar sempit.
            style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 4, maxWidth: 'calc(100% - 24px)' }}
            role="status"
            aria-live="polite"
          >
            <span className="aia-chip aia-chip-wrap">{toast}</span>
          </div>
        )}

        {(nearby || dekatPilah || dekatBank || dekatEco) && !dialogNpc && !dialogPilah && !dialogBank && (
          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              zIndex: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            {nearby && (
              <button
                type="button"
                className="aia-btn aia-btn-primary"
                onClick={() => bukaDialog(nearby)}
                aria-label={`Bicara dengan ${nearby.nama}`}
              >
                <MessageCircle aria-hidden="true" /> Bicara
              </button>
            )}
            {dekatPilah && (
              <button
                type="button"
                className="aia-btn aia-btn-primary"
                onClick={bukaPilah}
                aria-label="Buka Tempat Sampah Terpilah"
              >
                <Trash2 aria-hidden="true" /> Pilah Sampah
              </button>
            )}
            {dekatBank && (
              <button
                type="button"
                className="aia-btn aia-btn-primary"
                onClick={bukaBank}
                aria-label="Buka Bank Sampah"
              >
                <Banknote aria-hidden="true" /> Setor Sampah
              </button>
            )}
            {dekatEco && (
              <button
                type="button"
                className="aia-btn aia-btn-primary"
                onClick={bukaEco}
                aria-label="Buka Booth Eco-Shop"
              >
                <Store aria-hidden="true" /> Eco-Shop
              </button>
            )}
          </div>
        )}

        {dekatPortal && !dialogNpc && !dialogPilah && !dialogBank && (
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 4 }}
            onClick={() => pindahPortal(dekatPortal)}
            aria-label={dekatPortal.tujuan === 'rumah' ? 'Pulang ke rumah' : `Pindah ke ${dekatPortal.label}`}
          >
            <DoorOpen aria-hidden="true" /> {dekatPortal.label}
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
                  <h3 className="aia-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {dialogNpc.nama}
                    <span
                      role="img"
                      aria-label={`${dialogNpc.nama} ${ekspresiDialog.label}`}
                      title={ekspresiDialog.label}
                      style={{ display: 'inline-flex', color: 'var(--green)' }}
                    >
                      <ekspresiDialog.Ikon aria-hidden="true" style={{ width: 20, height: 20 }} />
                    </span>
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
                  {tampilkanPilihan1 && titikPilihan1 && kunciPilihan1 && (
                    <PilihanCerita
                      titik={titikPilihan1}
                      onSelesai={(opsi) => {
                        dispatch({
                          type: 'PILIH_CERITA',
                          kunci: kunciPilihan1,
                          opsi: opsi.id,
                          pakPlastik: opsi.pakPlastik,
                        })
                      }}
                    />
                  )}
                  <div className="aia-actions">
                    {tugasNpc ? (
                      <button
                        type="button"
                        className="aia-btn aia-btn-aksi"
                        onClick={() => {
                          klik()
                          onPlayTugas(tugasNpc)
                        }}
                      >
                        {tugasNpcSelesai ? 'Main lagi' : 'Mulai misi'}: {TUGAS[tugasNpc].judul}
                      </button>
                    ) : babNpc && babTerbuka && !tampilkanPilihan1 ? (
                      <button
                        type="button"
                        className="aia-btn aia-btn-aksi"
                        onClick={() => {
                          klik()
                          onPlayChapter(babNpc)
                        }}
                      >
                        {babSelesai ? 'Main lagi' : 'Mulai misi'}: {CHAPTERS[babNpc].judul}
                      </button>
                    ) : babNpc ? (
                      <p className="aia-muted">Selesaikan bab sebelumnya dulu untuk membuka bab ini.</p>
                    ) : dialogNpc.aktivitas === 'tangkap-sampah' ? (
                      <button
                        type="button"
                        className="aia-btn aia-btn-aksi"
                        onClick={() => {
                          klik()
                          onPlayTangkap()
                        }}
                      >
                        Main Tangkap Sampah
                      </button>
                    ) : dialogNpc.aktivitas === 'kuis-adiwiyata' ? (
                      <button
                        type="button"
                        className="aia-btn aia-btn-aksi"
                        onClick={() => {
                          klik()
                          onPlayKuis()
                        }}
                      >
                        Main Kuis Adiwiyata
                      </button>
                    ) : null}
                    {(dialogNpc.id === 'kang-kantin' || dialogNpc.id === 'npc-kantin-hijau') && (
                      <button
                        type="button"
                        className="aia-btn"
                        onClick={() => {
                          klik()
                          onOpenToko()
                        }}
                      >
                        <Store aria-hidden="true" /> Buka Kantin
                      </button>
                    )}
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
        {dialogPilah && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tempat Sampah Terpilah"
            style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 5 }}
          >
            <section className="aia-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span className="aia-kicker">Pilah 5 Bak</span>
                  <h3 className="aia-section-title" style={{ margin: 0 }}>
                    Tempat Sampah Terpilah
                  </h3>
                </div>
                <button type="button" className="aia-icon-btn" onClick={tutupPilah} aria-label="Tutup dialog pilah">
                  <X aria-hidden="true" />
                </button>
              </div>
              {totalDibawa === 0 ? (
                <p>
                  Kamu belum membawa sampah. Pungut sampah liar di sekitar sekolah dulu, lalu bawa ke sini untuk
                  dipilah.
                </p>
              ) : (
                <>
                  <p className="aia-muted">
                    Magi: pilih sampah yang kamu bawa, lalu ketuk bak yang benar.
                  </p>
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                    role="group"
                    aria-label="Sampah yang dibawa"
                  >
                    {BAK.filter((b) => (save.sampahDibawa?.[b.id] ?? 0) > 0).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="aia-btn"
                        aria-pressed={jenisDipilih === b.id}
                        style={
                          jenisDipilih === b.id
                            ? { outline: '3px solid var(--green)', outlineOffset: 2 }
                            : undefined
                        }
                        onClick={() => {
                          klik()
                          setJenisDipilih(b.id)
                          setPesanPilah(null)
                        }}
                      >
                        {b.nama} ×{save.sampahDibawa?.[b.id] ?? 0}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 12 }}
                  >
                    {BAK.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        disabled={!jenisDipilih}
                        aria-label={`Bak ${b.nama}`}
                        onClick={() => pilahKeBak(b.id)}
                        style={{
                          minHeight: 56,
                          padding: '10px 4px',
                          border: '1px solid var(--line)',
                          borderRadius: 12,
                          // C-2: latar tombol memakai versi gelap warna bak
                          // (warnaTombolBak) supaya teks putih ≥4,5:1;
                          // warna sistem SMAN 55 di content/bak.ts tidak diubah.
                          background: warnaTombolBak(b.id),
                          color: b.teks,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: jenisDipilih ? 'pointer' : 'default',
                          opacity: jenisDipilih ? 1 : 0.55,
                        }}
                      >
                        {b.nama}
                      </button>
                    ))}
                  </div>
                  <p className="aia-muted" style={{ marginBottom: 0 }}>
                    Bak benar: +5 Koin Hijau dan +Rp200 per sampah. Salah bak tidak apa-apa — coba lagi.
                  </p>
                </>
              )}
              {pesanPilah && (
                <p
                  role="status"
                  aria-live="polite"
                  // C-1: warna lewat kelas (mode gelap memakai merah/hijau
                  // terang) supaya kontras ≥4,5:1 di kedua mode.
                  className={pesanPilah.jenis === 'benar' ? 'aia-pesan-benar' : 'aia-pesan-salah'}
                >
                  {pesanPilah.teks}
                </p>
              )}
              <div className="aia-actions">
                <button type="button" className="aia-btn aia-btn-ghost" onClick={tutupPilah}>
                  Tutup
                </button>
              </div>
            </section>
          </div>
        )}
        {dialogBank && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bank Sampah"
            style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 5 }}
          >
            <section className="aia-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span className="aia-kicker">Kebun</span>
                  <h3 className="aia-section-title" style={{ margin: 0 }}>
                    Bank Sampah
                  </h3>
                </div>
                <button type="button" className="aia-icon-btn" onClick={tutupBank} aria-label="Tutup dialog Bank Sampah">
                  <X aria-hidden="true" />
                </button>
              </div>
              {totalDibawa === 0 ? (
                <p>
                  Kamu belum membawa sampah. Pungut dulu sampah liar di sekitar sekolah, lalu setor ke sini.
                </p>
              ) : (
                <>
                  <p>
                    Kamu membawa {totalDibawa} sampah. Setor semuanya sekaligus — setiap sampah jadi +Rp
                    {HADIAH_BANK_UANG.toLocaleString('id-ID')} dan +{HADIAH_BANK_KOIN} Koin Hijau. Total: +Rp
                    {ringkasanBank.uang.toLocaleString('id-ID')} dan +{ringkasanBank.koin} Koin Hijau.
                  </p>
                  <p className="aia-muted">
                    Magi: sampah yang disetor di sini ditimbang lalu dibeli, jadi dapat uang dan Koin Hijau.
                  </p>
                </>
              )}
              <div className="aia-actions">
                {totalDibawa > 0 && (
                  <button type="button" className="aia-btn aia-btn-aksi" onClick={setorBank}>
                    Setor semua sampah ({totalDibawa})
                  </button>
                )}
                <button type="button" className="aia-btn aia-btn-ghost" onClick={tutupBank}>
                  Tutup
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <p className="aia-muted">
        {isDesktop
          ? 'Gerakkan tokoh dengan tombol WASD/panah, atau klik peta untuk berjalan ke titik itu. Dekati NPC lalu klik NPC-nya atau tekan E untuk bicara.'
          : 'Gerakkan tokoh dengan joystick kiri bawah atau tombol WASD/panah. Dekati NPC lalu ketuk "Bicara" atau tekan E.'}{' '}
        NPC dengan tanda ! punya misi untukmu. Pindah peta lewat portal di tepi peta (Kantin, Kebun, Pos Maggot,
        Taman) — tombolnya muncul saat kamu berdiri di portal. Ketuk petak kebun untuk menyiram atau memanen, ketuk kotak maggot untuk
        memberi makan Magi, dan pungut sampah liar yang berserakan, lalu pilah di Tempat Sampah Terpilah di Gerbang
        atau setor sekaligus ke Bank Sampah di Kebun untuk Koin Hijau dan uang. Booth Eco-Shop di Kebun
        menjual Sepatu Eco-Runner, Pin Duta, dan Panel Surya pakai Koin Hijau. Mau main santai? Temui Kak Yoga di Gerbang untuk Tangkap Sampah,
        atau Kak Dara di Gerbang untuk Kuis Adiwiyata. Jalan Pulang di bawah Gerbang membawamu kembali ke rumah.
      </p>
    </div>
  )
}
