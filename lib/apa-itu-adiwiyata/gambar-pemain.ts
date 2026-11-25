// Gambar tokoh pemain di canvas — dipakai bersama oleh Jelajah (dunia
// sekolah) dan Rumah (peta rumah), supaya gambarnya tidak ditulis dua kali.
// Gender-aware: 'siswa' memakai celana panjang, 'siswi' memakai rok.
// null (belum memilih) dirender sebagai siswa — sama seperti default save
// lama yang dinormalisasi ke 'siswa' di loadSave.

import type { WarnaKostum } from './content/toko'
import type { JenisKelamin } from './types'

export type Arah = 'atas' | 'bawah' | 'kiri' | 'kanan'

export interface PemainState {
  x: number
  y: number
  arah: Arah
  bergerak: boolean
  fase: number
}

/** Bayangan alas: elips gelap transparan di bawah tokoh atau benda, supaya
 * terlihat "menapak" di tanah, bukan tempelan. Dipakai pemain, NPC, pohon,
 * meja, dan bak di semua peta. */
export function gambarBayangan(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  g.fill()
}

/** Persegi bersudut membulat (path saja, belum fill/stroke). */
export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rad, y)
  g.arcTo(x + w, y, x + w, y + h, rad)
  g.arcTo(x + w, y + h, x, y + h, rad)
  g.arcTo(x, y + h, x, y, rad)
  g.arcTo(x, y, x + w, y, rad)
  g.closePath()
}

export function gambarPemain(
  g: CanvasRenderingContext2D,
  p: PemainState,
  reduced: boolean,
  warna: WarnaKostum,
  jenisKelamin: JenisKelamin | null,
  /** Bila true (punya Pin Duta Adiwiyata): lingkaran glow hijau di
   * sekitar tokoh — digambar sebelum bayangan supaya tetap di belakang. */
  pinDuta = false,
  /** Kecepatan gerak pemain saat ini (unit dunia/detik, 0 bila diam).
   * Bayangan alas mengecil sedikit saat bergerak cepat, supaya tokoh
   * terasa menapak dan tidak melayang. */
  kecepatanGerak = 0,
) {
  const siswi = jenisKelamin === 'siswi'
  const bob = p.bergerak && !reduced ? Math.sin(p.fase) * 2 : 0
  if (pinDuta) {
    const grad = g.createRadialGradient(p.x, p.y, 4, p.x, p.y, 32)
    grad.addColorStop(0, 'rgba(102,187,106,0.5)')
    grad.addColorStop(1, 'rgba(102,187,106,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(p.x, p.y, 32, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(46,125,50,0.85)'
    g.lineWidth = 2
    g.beginPath()
    g.arc(p.x, p.y, 26, 0, Math.PI * 2)
    g.stroke()
  }
  // Bayangan alas: mengecil sampai ~15% pada kecepatan penuh (216 unit/detik
  // dengan Sepatu Eco-Runner), kembali penuh saat diam.
  const skalaBayang = 1 - 0.15 * Math.min(1, Math.max(0, kecepatanGerak) / 216)
  gambarBayangan(g, p.x, p.y + 13, 12 * skalaBayang, 4 * skalaBayang)
  g.save()
  g.translate(p.x, p.y + bob)
  const langkah = p.bergerak && !reduced ? Math.sin(p.fase) * 3 : 0
  // Bagian bawah seragam: celana panjang abu-abu gelap (siswa) atau rok
  // abu-abu trapesium (siswi, bergoyang sedikit saat berjalan) + sepatu.
  if (siswi) {
    const goyang = langkah * 0.3
    g.fillStyle = '#78909c'
    g.beginPath()
    g.moveTo(-8, 7)
    g.lineTo(8, 7)
    g.lineTo(11 + goyang, 16)
    g.lineTo(-11 + goyang, 16)
    g.closePath()
    g.fill()
    g.fillStyle = '#37474f'
    g.fillRect(-7, 15, 5, 2)
    g.fillRect(2, 15, 5, 2)
  } else {
    g.fillStyle = '#37474f'
    g.fillRect(-7, 8 + langkah * 0.3, 5, 8)
    g.fillRect(2, 8 - langkah * 0.3, 5, 8)
  }
  // Badan (warna baju/kerah mengikuti kostum yang dipakai).
  g.fillStyle = warna.baju
  rr(g, -10, -4, 20, 15, 6)
  g.fill()
  g.fillStyle = warna.kerah
  g.fillRect(-10, -4, 20, 4)
  g.fillStyle = warna.baju
  g.fillRect(-13, -2, 4, 10)
  g.fillRect(9, -2, 4, 10)
  // Dasi abu-abu + badge OSIS di dada (sama untuk siswa dan siswi).
  g.fillStyle = '#78909c'
  g.beginPath()
  g.moveTo(-2, 0)
  g.lineTo(2, 0)
  g.lineTo(2.5, 6)
  g.lineTo(0, 8.5)
  g.lineTo(-2.5, 6)
  g.closePath()
  g.fill()
  g.fillStyle = '#ffd54a'
  g.beginPath()
  g.arc(6, 4, 2, 0, Math.PI * 2)
  g.fill()
  // Kepala + rambut/topi (warna rambut mengikuti kostum Topi Magi).
  g.fillStyle = '#ffd9b3'
  g.beginPath()
  g.arc(0, -13, 10, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = warna.rambut
  g.beginPath()
  g.arc(0, -14, 10, Math.PI, 0)
  g.fill()
  // Rambut siswi lebih panjang: helai di kedua sisi kepala.
  if (siswi) {
    g.fillStyle = warna.rambut
    g.fillRect(-10, -17, 3.5, 13)
    g.fillRect(6.5, -17, 3.5, 13)
  }
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
