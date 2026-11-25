// Sistem partikel terpadu kampanye "Apa itu Adiwiyata" (F1).
//
// Satu pool tetap (120 partikel + 12 angka melayang), TANPA alokasi per
// frame: semua slot dialokasikan sekali di buatPartikel() dan dipakai ulang
// secara round-robin. Gambar hanya bentuk sederhana (lingkaran, daun,
// bintang, cincin) — bukan gambar besar — supaya HP tidak ngelag.
//
// - Tier kecil: sampah dipungut (3-4 partikel + bunyi tick yang sudah ada).
// - Tier sedang: pilah benar / panen (8-12 partikel daun + cincin hijau +
//   angka melayang "+5 Koin Hijau" / "+Rp200").
// - Tier besar: misi selesai (25-30 partikel + pop + suara sukses yang
//   sudah ada). Di dunia canvas dipakai lewat feedback(); di layar misi
//   (DOM, tanpa canvas) dipakai komponen RayakanMisi yang sepadan.
// - TIDAK ADA partikel untuk kesalahan: salah hanya ditegur Magi 1 kalimat.
// - Partikel memakai koordinat DUNIA (bukan layar) sehingga mengikuti
//   kamera; yang di luar pandang kamera tidak digambar (culling).
// - prefers-reduced-motion: partikel dekoratif dimatikan; angka melayang
//   tetap tampil karena ia menyampaikan jumlah hadiah (informasi, bukan
//   hiasan).
// - Modul ini juga menampung atmosfer (V3): awan, daun melayang, dan
//   gradien langit/sinar matahari pagi.

export type TierFeedback = 'kecil' | 'sedang' | 'besar'

type BentukPartikel = 'lingkaran' | 'daun' | 'bintang' | 'cincin'

export interface Partikel {
  aktif: boolean
  x: number
  y: number
  vx: number
  vy: number
  /** Detik sejak spawn. */
  hidup: number
  /** Detik sampai partikel mati. */
  maksHidup: number
  ukuran: number
  warna: string
  bentuk: BentukPartikel
  /** Percepatan jatuh (px/detik^2); 0 = melayang lurus (daun). */
  gravitasi: number
  putar: number
  putarKecepatan: number
}

export interface PopAngka {
  aktif: boolean
  x: number
  y: number
  /** Detik sejak spawn. */
  t: number
  durasi: number
  teks: string
  warna: string
}

export interface SistemPartikel {
  partikel: Partikel[]
  pops: PopAngka[]
  /** Kursor round-robin pemakaian ulang slot partikel. */
  kursor: number
  /** Kursor round-robin pemakaian ulang slot angka melayang. */
  kursorPop: number
}

export const MAX_PARTIKEL = 120
const MAX_POP = 12

const WARNA_DAUN = ['#66bb6a', '#4e9a3d', '#8bc34a', '#aed581']
const WARNA_EMAS = '#ffd54a'

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

/** Alokasi sekali di awal sesi; setelah itu tidak ada alokasi baru. */
export function buatPartikel(): SistemPartikel {
  const partikel: Partikel[] = []
  for (let i = 0; i < MAX_PARTIKEL; i += 1) {
    partikel.push({
      aktif: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hidup: 0,
      maksHidup: 1,
      ukuran: 3,
      warna: '#ffffff',
      bentuk: 'lingkaran',
      gravitasi: 0,
      putar: 0,
      putarKecepatan: 0,
    })
  }
  const pops: PopAngka[] = []
  for (let i = 0; i < MAX_POP; i += 1) {
    pops.push({ aktif: false, x: 0, y: 0, t: 0, durasi: 1.1, teks: '', warna: '#ffffff' })
  }
  return { partikel, pops, kursor: 0, kursorPop: 0 }
}

/** Kosongkan semua partikel + angka (dipakai saat pindah peta). */
export function resetPartikel(sis: SistemPartikel): void {
  for (const p of sis.partikel) p.aktif = false
  for (const pp of sis.pops) pp.aktif = false
  sis.kursor = 0
  sis.kursorPop = 0
}

/** Ambil satu slot kosong (round-robin); bila pool penuh, slot tertua
 * dipakai ulang — tidak pernah alokasi baru. */
function ambilSlot(sis: SistemPartikel): Partikel {
  for (let n = 0; n < MAX_PARTIKEL; n += 1) {
    sis.kursor = (sis.kursor + 1) % MAX_PARTIKEL
    const p = sis.partikel[sis.kursor]
    if (!p.aktif) return p
  }
  sis.kursor = (sis.kursor + 1) % MAX_PARTIKEL
  return sis.partikel[sis.kursor]
}

interface OpsiSpawn {
  bentuk: BentukPartikel
  warna: string
  ukuran: number
  vx: number
  vy: number
  maksHidup: number
  gravitasi: number
  putarKecepatan?: number
}

function spawn(sis: SistemPartikel, x: number, y: number, o: OpsiSpawn): void {
  const p = ambilSlot(sis)
  p.aktif = true
  p.x = x
  p.y = y
  p.vx = o.vx
  p.vy = o.vy
  p.hidup = 0
  p.maksHidup = o.maksHidup
  p.ukuran = o.ukuran
  p.warna = o.warna
  p.bentuk = o.bentuk
  p.gravitasi = o.gravitasi
  p.putar = Math.random() * Math.PI * 2
  p.putarKecepatan = o.putarKecepatan ?? 0
}

/** Satu angka melayang ("+5 Koin Hijau"): naik, fade, ease-out. */
export function popAngka(sis: SistemPartikel, x: number, y: number, teks: string, warna = '#ffffff'): void {
  let slot = sis.pops[sis.kursorPop]
  if (slot.aktif) {
    // Cari slot kosong dulu supaya angka yang sedang tampil tidak tertimpa.
    let ketemu = false
    for (let n = 0; n < MAX_POP; n += 1) {
      sis.kursorPop = (sis.kursorPop + 1) % MAX_POP
      if (!sis.pops[sis.kursorPop].aktif) {
        slot = sis.pops[sis.kursorPop]
        ketemu = true
        break
      }
    }
    if (!ketemu) {
      sis.kursorPop = (sis.kursorPop + 1) % MAX_POP
      slot = sis.pops[sis.kursorPop]
    }
  } else {
    sis.kursorPop = (sis.kursorPop + 1) % MAX_POP
  }
  slot.aktif = true
  slot.x = x
  slot.y = y
  slot.t = 0
  slot.durasi = 1.1
  slot.teks = teks
  slot.warna = warna
}

/**
 * Umpan balik per tier di satu titik dunia (x, y koordinat dunia).
 * `teksPop` = baris angka hadiah yang melayang (mis. ["+5 Koin Hijau",
 * "+Rp200"]); tiap baris digeser 18px ke bawah supaya tidak bertumpuk.
 * `reduced` = prefers-reduced-motion: partikel dekoratif dilewati, angka
 * tetap tampil. TIDAK PERNAH dipanggil untuk kesalahan.
 */
export function feedback(
  sis: SistemPartikel,
  tier: TierFeedback,
  x: number,
  y: number,
  teksPop: string[] = [],
  opts: { reduced?: boolean } = {},
): void {
  if (!opts.reduced) {
    if (tier === 'kecil') {
      for (let i = 0; i < 4; i += 1) {
        const sudut = Math.random() * Math.PI * 2
        const cepat = 24 + Math.random() * 36
        spawn(sis, x, y, {
          bentuk: i % 2 === 0 ? 'lingkaran' : 'bintang',
          warna: i % 2 === 0 ? WARNA_EMAS : WARNA_DAUN[i % WARNA_DAUN.length],
          ukuran: 2.5 + Math.random() * 2,
          vx: Math.cos(sudut) * cepat,
          vy: Math.sin(sudut) * cepat - 18,
          maksHidup: 0.4 + Math.random() * 0.2,
          gravitasi: 60,
        })
      }
    } else if (tier === 'sedang') {
      // Cincin hijau mengembang (flash lembut) + 10 daun beterbangan.
      spawn(sis, x, y, {
        bentuk: 'cincin',
        warna: '#81c784',
        ukuran: 6,
        vx: 0,
        vy: 0,
        maksHidup: 0.45,
        gravitasi: 0,
      })
      for (let i = 0; i < 10; i += 1) {
        const sudut = Math.random() * Math.PI * 2
        const cepat = 30 + Math.random() * 55
        spawn(sis, x, y, {
          bentuk: 'daun',
          warna: WARNA_DAUN[i % WARNA_DAUN.length],
          ukuran: 3.5 + Math.random() * 2.5,
          vx: Math.cos(sudut) * cepat,
          vy: Math.sin(sudut) * cepat - 30,
          maksHidup: 0.6 + Math.random() * 0.35,
          gravitasi: 90,
          putarKecepatan: (Math.random() - 0.5) * 10,
        })
      }
    } else {
      // Besar: 2 cincin + 16 daun + 12 bintang emas.
      for (const r of [6, 10]) {
        spawn(sis, x, y, {
          bentuk: 'cincin',
          warna: r === 6 ? '#81c784' : WARNA_EMAS,
          ukuran: r,
          vx: 0,
          vy: 0,
          maksHidup: 0.6,
          gravitasi: 0,
        })
      }
      for (let i = 0; i < 16; i += 1) {
        const sudut = Math.random() * Math.PI * 2
        const cepat = 40 + Math.random() * 90
        spawn(sis, x, y, {
          bentuk: 'daun',
          warna: WARNA_DAUN[i % WARNA_DAUN.length],
          ukuran: 3.5 + Math.random() * 3,
          vx: Math.cos(sudut) * cepat,
          vy: Math.sin(sudut) * cepat - 40,
          maksHidup: 0.8 + Math.random() * 0.5,
          gravitasi: 110,
          putarKecepatan: (Math.random() - 0.5) * 12,
        })
      }
      for (let i = 0; i < 12; i += 1) {
        const sudut = Math.random() * Math.PI * 2
        const cepat = 50 + Math.random() * 80
        spawn(sis, x, y, {
          bentuk: 'bintang',
          warna: WARNA_EMAS,
          ukuran: 3 + Math.random() * 2.5,
          vx: Math.cos(sudut) * cepat,
          vy: Math.sin(sudut) * cepat - 50,
          maksHidup: 0.7 + Math.random() * 0.4,
          gravitasi: 120,
          putarKecepatan: (Math.random() - 0.5) * 8,
        })
      }
    }
  }
  teksPop.forEach((teks, i) => {
    popAngka(sis, x, y - 18 + i * 18, teks, i === 0 ? '#ffffff' : '#ffe082')
  })
}

/** Majukan semua partikel + angka satu frame (dt detik). */
export function perbaruiPartikel(sis: SistemPartikel, dt: number): void {
  for (const p of sis.partikel) {
    if (!p.aktif) continue
    p.hidup += dt
    if (p.hidup >= p.maksHidup) {
      p.aktif = false
      continue
    }
    p.vy += p.gravitasi * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.putar += p.putarKecepatan * dt
  }
  for (const pp of sis.pops) {
    if (!pp.aktif) continue
    pp.t += dt
    if (pp.t >= pp.durasi) pp.aktif = false
  }
}

/**
 * Gambar partikel + angka melayang. Dipanggil di dalam blok canvas yang
 * sudah di-translate ke koordinat dunia (translate(-camX, -camY)), jadi
 * partikel mengikuti kamera. Culling ke pandang kamera + margin 40px.
 */
export function gambarPartikel(
  g: CanvasRenderingContext2D,
  sis: SistemPartikel,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  const x0 = camX - 40
  const x1 = camX + viewW + 40
  const y0 = camY - 40
  const y1 = camY + viewH + 40
  for (const p of sis.partikel) {
    if (!p.aktif) continue
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue
    const k = p.hidup / p.maksHidup
    g.globalAlpha = Math.max(0, 1 - k)
    if (p.bentuk === 'lingkaran') {
      g.fillStyle = p.warna
      g.beginPath()
      g.arc(p.x, p.y, p.ukuran, 0, Math.PI * 2)
      g.fill()
    } else if (p.bentuk === 'daun') {
      g.save()
      g.translate(p.x, p.y)
      g.rotate(p.putar)
      g.fillStyle = p.warna
      g.beginPath()
      g.ellipse(0, 0, p.ukuran, p.ukuran * 0.55, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    } else if (p.bentuk === 'bintang') {
      // Bintang 4 sudut (dua segitiga silang) — murah, tanpa path rumit.
      g.save()
      g.translate(p.x, p.y)
      g.rotate(p.putar)
      g.fillStyle = p.warna
      const u = p.ukuran
      g.beginPath()
      g.moveTo(0, -u)
      g.lineTo(u * 0.35, -u * 0.35)
      g.lineTo(u, 0)
      g.lineTo(u * 0.35, u * 0.35)
      g.lineTo(0, u)
      g.lineTo(-u * 0.35, u * 0.35)
      g.lineTo(-u, 0)
      g.lineTo(-u * 0.35, -u * 0.35)
      g.closePath()
      g.fill()
      g.restore()
    } else {
      // Cincin: mengembang + memudar (flash lembut).
      g.strokeStyle = p.warna
      g.lineWidth = 2.5
      g.beginPath()
      g.arc(p.x, p.y, p.ukuran + k * 26, 0, Math.PI * 2)
      g.stroke()
    }
  }
  g.globalAlpha = 1
  // Angka melayang: naik dengan ease-out, lalu fade.
  g.font = 'bold 13px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (const pp of sis.pops) {
    if (!pp.aktif) continue
    if (pp.x < x0 || pp.x > x1 || pp.y < y0 || pp.y > y1) continue
    const k = pp.t / pp.durasi
    const eased = 1 - Math.pow(1 - k, 3)
    const yy = pp.y - eased * 34
    g.globalAlpha = Math.max(0, 1 - k * k)
    g.lineWidth = 3
    g.strokeStyle = 'rgba(0,0,0,0.65)'
    g.strokeText(pp.teks, pp.x, yy)
    g.fillStyle = pp.warna
    g.fillText(pp.teks, pp.x, yy)
  }
  g.globalAlpha = 1
}

// ---------------------------------------------------------------- atmosfer ----

export interface Awan {
  x: number
  y: number
  skala: number
  /** px/detik ke kanan. */
  cepat: number
}

/** 3 awan per peta luar, posisi deterministik dari id peta. */
export function buatAwan(petaId: string, lebar: number, tinggi: number): Awan[] {
  const benih = 20261125 + [...petaId].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  const acak = mulberry32(benih)
  const awan: Awan[] = []
  for (let i = 0; i < 3; i += 1) {
    awan.push({
      x: 60 + acak() * (lebar - 120),
      y: 50 + acak() * (tinggi * 0.45),
      skala: 0.8 + acak() * 0.7,
      cepat: 4 + acak() * 5,
    })
  }
  return awan
}

/** Geser awan pelan ke kanan; yang keluar tepi kanan muncul lagi dari kiri. */
export function perbaruiAwan(awan: Awan[], lebar: number, dt: number): void {
  for (const a of awan) {
    a.x += a.cepat * dt
    if (a.x - 90 * a.skala > lebar) a.x = -90 * a.skala
  }
}

/** Awan putih lembut (alpha 0,12) di atas tanah, di bawah aktor — seperti
 * bayangan awan yang lewat. Koordinat dunia, culling ke pandang kamera. */
export function gambarAwan(
  g: CanvasRenderingContext2D,
  awan: Awan[],
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  g.fillStyle = '#ffffff'
  for (const a of awan) {
    if (a.x + 90 * a.skala < camX || a.x - 90 * a.skala > camX + viewW) continue
    if (a.y + 30 * a.skala < camY || a.y - 30 * a.skala > camY + viewH) continue
    g.globalAlpha = 0.12
    const s = a.skala
    g.beginPath()
    g.ellipse(a.x, a.y, 46 * s, 16 * s, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(a.x - 26 * s, a.y + 6 * s, 28 * s, 12 * s, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(a.x + 28 * s, a.y + 6 * s, 30 * s, 12 * s, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

/**
 * Satu daun jatuh pelan dari atas pandang kamera (dipanggil berkala,
 * ~1 daun per 1,1 detik, hanya di peta luar). Memakai slot pool yang sama
 * dengan feedback — bila pool penuh, daun tertua dipakai ulang.
 */
export function spawnDaun(
  sis: SistemPartikel,
  camX: number,
  camY: number,
  viewW: number,
): void {
  const x = camX + 20 + Math.random() * Math.max(1, viewW - 40)
  spawn(sis, x, camY - 12, {
    bentuk: 'daun',
    warna: WARNA_DAUN[Math.floor(Math.random() * WARNA_DAUN.length)],
    ukuran: 3.5 + Math.random() * 2.5,
    vx: (Math.random() - 0.5) * 16,
    vy: 12 + Math.random() * 8,
    maksHidup: 7 + Math.random() * 2,
    gravitasi: 0,
    putarKecepatan: (Math.random() - 0.5) * 3,
  })
}

/** Kekuatan sinar matahari menurut jam: pagi penuh, siang setengah, sore
 * hangat, malam 0 (tidak ada matahari). */
export function intensitasMatahari(jam = new Date().getHours()): number {
  if (jam >= 5 && jam < 10) return 1
  if (jam >= 10 && jam < 15) return 0.5
  if (jam >= 15 && jam < 18) return 0.7
  return 0
}

/**
 * Gradien langit pagi + sinar matahari (SANGAT tipis, alpha maks 0,10).
 * Ruang LAYAR (dipanggil setelah ctx.restore(), tanpa translate kamera):
 * gradien hangat dari atas memudar ke bawah + glow radial di pojok kanan
 * atas. Tidak menutupi permainan dan tidak menambah objek tabrakan.
 */
export function gambarLangitPagi(
  g: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  jam = new Date().getHours(),
): void {
  const intensitas = intensitasMatahari(jam)
  if (intensitas <= 0 || viewW <= 0 || viewH <= 0) return
  const sore = jam >= 15 && jam < 18
  const warnaLangit = sore ? '255,170,90' : '255,240,190'
  const langit = g.createLinearGradient(0, 0, 0, viewH * 0.45)
  langit.addColorStop(0, `rgba(${warnaLangit},${(0.1 * intensitas).toFixed(3)})`)
  langit.addColorStop(1, `rgba(${warnaLangit},0)`)
  g.fillStyle = langit
  g.fillRect(0, 0, viewW, viewH * 0.45)
  // Sinar: glow radial lembut dari pojok kanan atas.
  const r = Math.max(viewW, viewH) * 0.55
  const sinar = g.createRadialGradient(viewW * 0.82, -40, 0, viewW * 0.82, -40, r)
  sinar.addColorStop(0, `rgba(255,243,196,${(0.09 * intensitas).toFixed(3)})`)
  sinar.addColorStop(1, 'rgba(255,243,196,0)')
  g.fillStyle = sinar
  g.fillRect(0, 0, viewW, viewH)
}
