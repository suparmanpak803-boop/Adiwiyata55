// Registry peta mode "Jelajah" kampanye "Apa itu Adiwiyata".
//
// Dulu satu peta 960x640 yang sumpek; kini dipecah jadi 5 peta sekolah
// (plus Rumah yang sudah terpisah sebagai komponen rumah.tsx):
// gerbang (hub), kantin, kebun, maggot, taman. Tiap peta lega, maks 6 NPC,
// dan dihubungkan portal EKSPLISIT (tombol/E/ketuk) — bukan jalan-masuk
// otomatis — seperti portal "Jalan Pulang" yang sudah ada.
//
// ATURAN (dibaca agen UI sebelum memakai file ini):
// - ID NPC, chapterId, tugasId, dan aktivitas TIDAK BOLEH BERUBAH — hanya
//   peta + koordinat yang berubah dari dunia lama. Total tetap 18 NPC dan
//   12 sampah liar (nama + jenis bak tetap).
// - `sampah[].idx` adalah indeks GLOBAL 0..11 lintas peta (diisi otomatis
//   di bawah): sampah ke-i tampil bila `i < save.dunia.sampahLiar`, sama
//   seperti dulu — jadi jumlah sampah yang terlihat di semua peta tetap
//   sama dengan `sampahLiar`, bukan per peta.
// - `titikInteraksi` adalah sumber tunggal titik interaksi: pilah (5 bak),
//   bank-sampah, eco-shop, petak-1..3, kotak-maggot, panel-surya.
//   lib/dunia-hidup.ts (POSISI_PETAK / POSISI_KOTAK_MAGGOT) mengambil
//   nilainya dari sini — jangan ada dua sumber kebenaran.
// - Portal: { label, x, y, w, h, tujuan, masukX, masukY }. `masukX/Y`
//   adalah titik pemain muncul di peta tujuan. Portal dengan tujuan
//   'rumah' ditangani khusus (kembali ke komponen Rumah, bukan peta canvas).
// - Zona dengan chapterId dipakai pemicu misi / overlay "Terkunci" (cek
//   pemakaian z.chapterId): chapterId tiap zona tetap menempel pada zona
//   yang sama seperti di dunia lama. Zona yang hanya label tanpa interaksi
//   (Perpustakaan) dihapus — NPC-nya (Kak Raka) pindah ke Taman dan label
//   lokasinya diperbarui di misi.ts / tugas.ts. Plaza tetap ada sebagai
//   zona di Gerbang.
import type { ChapterId, TongSampah, TugasKaderId } from '../types'

export interface ZonaDunia {
  id: string
  nama: string
  chapterId: ChapterId | null
  x: number
  y: number
  w: number
  h: number
  warna: string
}

export interface Dinding {
  x: number
  y: number
  w: number
  h: number
}

export interface NpcDunia {
  id: string
  nama: string
  peran: string
  chapterId: ChapterId | null
  /** Misi yang diberikan NPC ini (bila ada); NPC bab utama tidak punya. */
  tugasId?: TugasKaderId
  /** Game arkade yang dibuka NPC ini (khusus penjaga Tangkap Sampah / Kuis). */
  aktivitas?: 'tangkap-sampah' | 'kuis-adiwiyata'
  /** Peta tempat NPC ini berdiri. */
  petaId: PetaId
  x: number
  y: number
  warna: string
  gerak: boolean
  radiusGerak?: number
}

export interface SampahJatuh {
  /** Indeks global 0..11 lintas peta (diisi otomatis, bukan ditulis manual). */
  idx: number
  x: number
  y: number
  /** Nama yang tampil saat dipungut. */
  nama: string
  /** Jenis baknya (sistem 5 bak SMAN 55). */
  jenis: TongSampah
}

/** Portal antar peta. Interaksi EKSPLISIT (tombol/E/ketuk), bukan
 * jalan-masuk otomatis. */
export interface PortalPeta {
  id: string
  /** Label tombol + label di canvas, mis. "Ke Kantin". */
  label: string
  x: number
  y: number
  w: number
  h: number
  /** Peta tujuan; 'rumah' = kembali ke komponen Rumah. */
  tujuan: PetaId | 'rumah'
  /** Titik pemain muncul di peta tujuan (diabaikan bila tujuan 'rumah'). */
  masukX: number
  masukY: number
}

export type IdTitikInteraksi =
  | 'pilah'
  | 'bank-sampah'
  | 'eco-shop'
  | 'petak-1'
  | 'petak-2'
  | 'petak-3'
  | 'kotak-maggot'
  | 'panel-surya'

export interface TitikInteraksi {
  id: IdTitikInteraksi
  x: number
  y: number
}

/** Id peta canvas (bukan 'rumah': Rumah dirender komponen rumah.tsx). */
export type PetaId = 'gerbang' | 'kantin' | 'kebun' | 'maggot' | 'taman'

export interface PetaDunia {
  id: PetaId
  nama: string
  lebar: number
  tinggi: number
  /** true bila peta ini ruang luar (halaman sekolah): ada langit pagi,
   * awan, dan daun melayang (V3). Kantin dianggap dalam ruang (gedung
   * beratap); Rumah tidak memakai registry ini dan tidak punya atmosfer. */
  luarRuang: boolean
  /** Titik muncul bila masuk tanpa titik portal (mis. dari Rumah). */
  spawn: { x: number; y: number }
  zona: ZonaDunia[]
  dinding: Dinding[]
  npc: NpcDunia[]
  sampah: SampahJatuh[]
  portal: PortalPeta[]
  titikInteraksi: TitikInteraksi[]
}

/** Dinding tepi (12 unit) untuk peta selebar `lebar` dan setinggi `tinggi`. */
function dindingTepi(lebar: number, tinggi: number): Dinding[] {
  return [
    { x: 0, y: 0, w: lebar, h: 12 },
    { x: 0, y: tinggi - 12, w: lebar, h: 12 },
    { x: 0, y: 0, w: 12, h: tinggi },
    { x: lebar - 12, y: 0, w: 12, h: tinggi },
  ]
}

/** Portal "Kembali ke Gerbang" di tepi kiri peta (dipakai semua peta
 * kecuali gerbang). `masuk` = titik muncul di peta Gerbang, dekat portal
 * asal supaya pemain tidak tersesat. */
function portalKembali(masukX: number, masukY: number): PortalPeta {
  return {
    id: 'ke-gerbang',
    label: 'Kembali ke Gerbang',
    x: 12,
    y: 200,
    w: 48,
    h: 64,
    tujuan: 'gerbang',
    masukX,
    masukY,
  }
}

/** Tambah `petaId` ke daftar NPC tanpa mengulang di tiap entri. */
function npcDi(petaId: PetaId, daftar: Omit<NpcDunia, 'petaId'>[]): NpcDunia[] {
  return daftar.map((n) => ({ ...n, petaId }))
}

/** Entri sampah tanpa `idx` (diisi otomatis setelah PETA dibuat). */
function sampahTanpaIdx(daftar: Omit<SampahJatuh, 'idx'>[]): SampahJatuh[] {
  return daftar.map((s) => ({ ...s, idx: -1 }))
}

export const PETA_ORDER: PetaId[] = ['gerbang', 'kantin', 'kebun', 'maggot', 'taman']

export const PETA: Record<PetaId, PetaDunia> = {
  gerbang: {
    id: 'gerbang',
    nama: 'Gerbang',
    lebar: 720,
    tinggi: 480,
    luarRuang: true,
    spawn: { x: 360, y: 420 },
    zona: [
      { id: 'gerbang', nama: 'Gerbang', chapterId: 'gerbang', x: 240, y: 360, w: 240, h: 100, warna: '#f4d35e' },
      { id: 'plaza', nama: 'Plaza', chapterId: null, x: 180, y: 180, w: 360, h: 140, warna: '#f9a825' },
    ],
    dinding: [
      ...dindingTepi(720, 480),
      // Gerbang: dua tiang pagar dengan celah di tengah (jalur ke Plaza).
      { x: 240, y: 360, w: 90, h: 16 },
      { x: 390, y: 360, w: 90, h: 16 },
      // Pohon hias di empat sudut (bukan di koridor).
      { x: 60, y: 60, w: 24, h: 24 },
      { x: 636, y: 60, w: 24, h: 24 },
      { x: 60, y: 396, w: 24, h: 24 },
      { x: 636, y: 396, w: 24, h: 24 },
    ],
    npc: npcDi('gerbang', [
      {
        id: 'pak-plastik',
        nama: 'Pak Plastik',
        peran: 'Pengacau lucu',
        chapterId: 'gerbang',
        x: 280,
        y: 412,
        warna: '#f5f5f5',
        gerak: true,
        radiusGerak: 40,
      },
      {
        id: 'bu-sari',
        nama: 'Bu Sari',
        peran: 'Guru & Tim Inspeksi',
        chapterId: 'biodiversitas',
        x: 600,
        y: 400,
        warna: '#7b5ea7',
        gerak: false,
      },
      {
        id: 'dimas',
        nama: 'Dimas',
        peran: 'Siswa',
        chapterId: null,
        x: 360,
        y: 250,
        warna: '#c0392b',
        gerak: true,
        radiusGerak: 50,
      },
      {
        id: 'npc-jejaring-hijau',
        nama: 'Pak Jaka',
        peran: 'Jejaring Hijau',
        chapterId: null,
        tugasId: 'jejaring-hijau',
        x: 180,
        y: 400,
        warna: '#546e7a',
        gerak: false,
      },
      {
        id: 'npc-tangkap-sampah',
        nama: 'Kak Yoga',
        peran: 'Penjaga Arena Tangkap Sampah',
        chapterId: null,
        aktivitas: 'tangkap-sampah',
        x: 650,
        y: 440,
        warna: '#ff7043',
        gerak: false,
      },
      {
        id: 'npc-kuis',
        nama: 'Kak Dara',
        peran: 'Penjaga Kuis Adiwiyata',
        chapterId: null,
        aktivitas: 'kuis-adiwiyata',
        x: 110,
        y: 300,
        warna: '#6a1b9a',
        gerak: false,
      },
    ]),
    sampah: sampahTanpaIdx([
      { x: 480, y: 280, nama: 'Daun kering', jenis: 'organik' },
      { x: 220, y: 140, nama: 'Botol plastik', jenis: 'anorganik' },
      { x: 520, y: 140, nama: 'Koran bekas', jenis: 'kertas' },
    ]),
    portal: [
      { id: 'ke-kantin', label: 'Ke Kantin', x: 12, y: 200, w: 48, h: 64, tujuan: 'kantin', masukX: 80, masukY: 232 },
      { id: 'ke-kebun', label: 'Ke Kebun', x: 120, y: 12, w: 64, h: 36, tujuan: 'kebun', masukX: 90, masukY: 232 },
      { id: 'ke-taman', label: 'Ke Taman', x: 540, y: 12, w: 64, h: 36, tujuan: 'taman', masukX: 90, masukY: 232 },
      { id: 'ke-maggot', label: 'Ke Pos Maggot', x: 660, y: 200, w: 48, h: 64, tujuan: 'maggot', masukX: 90, masukY: 232 },
      { id: 'jalan-pulang', label: 'Jalan Pulang', x: 320, y: 440, w: 80, h: 28, tujuan: 'rumah', masukX: 360, masukY: 420 },
    ],
    titikInteraksi: [{ id: 'pilah', x: 360, y: 320 }],
  },
  kantin: {
    id: 'kantin',
    nama: 'Kantin',
    lebar: 640,
    tinggi: 480,
    luarRuang: false,
    spawn: { x: 320, y: 400 },
    zona: [
      { id: 'kantin', nama: 'Kantin', chapterId: 'kantin', x: 80, y: 60, w: 480, h: 220, warna: '#ee964b' },
      { id: 'teras', nama: 'Teras Kantin', chapterId: null, x: 80, y: 300, w: 480, h: 100, warna: '#f9d976' },
    ],
    dinding: [
      ...dindingTepi(640, 480),
      { x: 120, y: 90, w: 160, h: 90 }, // gedung kantin
      { x: 360, y: 100, w: 120, h: 40 }, // meja-kursi 1
      { x: 360, y: 180, w: 120, h: 40 }, // meja-kursi 2
    ],
    npc: npcDi('kantin', [
      {
        id: 'kang-kantin',
        nama: 'Kang Kantin',
        peran: 'Penjaga Kantin',
        chapterId: 'kantin',
        x: 200,
        y: 220,
        warna: '#e67e22',
        gerak: false,
      },
      {
        id: 'npc-kantin-hijau',
        nama: 'Mbak Dewi',
        peran: 'Kantin Hijau',
        chapterId: null,
        tugasId: 'kantin-hijau',
        x: 420,
        y: 240,
        warna: '#d81b60',
        gerak: false,
      },
    ]),
    sampah: sampahTanpaIdx([
      { x: 450, y: 340, nama: 'Sisa buah', jenis: 'organik' },
      { x: 150, y: 350, nama: 'Kardus', jenis: 'kertas' },
    ]),
    portal: [portalKembali(80, 232)],
    titikInteraksi: [],
  },
  kebun: {
    id: 'kebun',
    nama: 'Kebun',
    lebar: 720,
    tinggi: 480,
    luarRuang: true,
    spawn: { x: 360, y: 400 },
    zona: [
      { id: 'kebun', nama: 'Kebun', chapterId: 'kompos', x: 60, y: 40, w: 300, h: 180, warna: '#6a994e' },
      { id: 'bank-sampah', nama: 'Bank Sampah', chapterId: null, x: 420, y: 40, w: 240, h: 120, warna: '#43a047' },
    ],
    dinding: [
      ...dindingTepi(720, 480),
      { x: 90, y: 70, w: 120, h: 40 }, // bedeng kebun 1
      { x: 90, y: 130, w: 120, h: 40 }, // bedeng kebun 2
      { x: 60, y: 400, w: 24, h: 24 }, // pohon hias
      { x: 660, y: 400, w: 24, h: 24 }, // pohon hias
    ],
    npc: npcDi('kebun', [
      {
        id: 'pak-kebun',
        nama: 'Pak Kebun',
        peran: 'Penjaga Kebun',
        chapterId: 'kompos',
        x: 230,
        y: 130,
        warna: '#8b5a2b',
        gerak: false,
      },
      {
        id: 'npc-bank-sampah',
        nama: 'Kak Bimo',
        peran: 'Bank Sampah dan Daur Ulang',
        chapterId: null,
        tugasId: 'bank-sampah',
        x: 480,
        y: 160,
        warna: '#43a047',
        gerak: false,
      },
      {
        id: 'npc-edu-lingkungan',
        nama: 'Kak Lala',
        peran: 'Edu-Lingkungan',
        chapterId: null,
        tugasId: 'edu-lingkungan',
        x: 150,
        y: 300,
        warna: '#f9a825',
        gerak: false,
      },
      {
        id: 'npc-eco-communication',
        nama: 'Kak Naya',
        peran: 'Eco-Communication',
        chapterId: null,
        tugasId: 'eco-communication',
        x: 600,
        y: 300,
        warna: '#00acc1',
        gerak: false,
      },
    ]),
    sampah: sampahTanpaIdx([
      { x: 360, y: 320, nama: 'Ranting kecil', jenis: 'organik' },
      { x: 620, y: 380, nama: 'Kaleng bekas', jenis: 'anorganik' },
    ]),
    portal: [portalKembali(152, 70)],
    titikInteraksi: [
      { id: 'petak-1', x: 300, y: 70 },
      { id: 'petak-2', x: 300, y: 150 },
      { id: 'petak-3', x: 330, y: 205 },
      { id: 'bank-sampah', x: 540, y: 100 },
      { id: 'eco-shop', x: 540, y: 200 },
    ],
  },
  maggot: {
    id: 'maggot',
    nama: 'Pos Maggot',
    lebar: 640,
    tinggi: 480,
    luarRuang: true,
    spawn: { x: 320, y: 400 },
    zona: [
      { id: 'pos-maggot', nama: 'Pos Maggot', chapterId: 'maggot', x: 80, y: 60, w: 480, h: 200, warna: '#4d8a4f' },
      { id: 'kompos', nama: 'Kompos', chapterId: 'kompos', x: 80, y: 300, w: 240, h: 120, warna: '#8b5a2b' },
    ],
    dinding: [
      ...dindingTepi(640, 480),
      { x: 140, y: 90, w: 120, h: 80 }, // rumah maggot
      { x: 120, y: 330, w: 100, h: 60 }, // bak kompos
    ],
    npc: npcDi('maggot', [
      {
        id: 'magi',
        nama: 'Magi',
        peran: 'Maskot Maggot',
        chapterId: 'maggot',
        x: 400,
        y: 230,
        warna: '#2e7d32',
        gerak: false,
      },
    ]),
    sampah: sampahTanpaIdx([
      { x: 300, y: 420, nama: 'Baterai bekas', jenis: 'b3' },
      { x: 520, y: 380, nama: 'Styrofoam', jenis: 'residu' },
    ]),
    portal: [portalKembali(640, 232)],
    titikInteraksi: [{ id: 'kotak-maggot', x: 480, y: 160 }],
  },
  taman: {
    id: 'taman',
    nama: 'Taman',
    lebar: 720,
    tinggi: 480,
    luarRuang: true,
    spawn: { x: 360, y: 420 },
    zona: [
      { id: 'taman-air', nama: 'Taman Air', chapterId: 'air-energi', x: 60, y: 40, w: 220, h: 160, warna: '#3b7ea1' },
      { id: 'panel-surya', nama: 'Panel Surya', chapterId: 'air-energi', x: 320, y: 40, w: 340, h: 160, warna: '#7b5ea7' },
      { id: 'pohon', nama: 'Pohon', chapterId: 'biodiversitas', x: 60, y: 240, w: 280, h: 180, warna: '#2d6a4f' },
      { id: 'taman-toilet', nama: 'Taman & Toilet', chapterId: null, x: 380, y: 240, w: 140, h: 120, warna: '#00897b' },
      { id: 'pos-data', nama: 'Pos Data', chapterId: null, x: 540, y: 240, w: 140, h: 120, warna: '#1e88e5' },
    ],
    dinding: [
      ...dindingTepi(720, 480),
      { x: 90, y: 70, w: 100, h: 70 }, // kolam taman air
      { x: 360, y: 60, w: 180, h: 60 }, // deret panel surya
      // Pohon di zona Pohon (empat sudut, jalur tengah tetap lewat).
      { x: 68, y: 248, w: 24, h: 24 },
      { x: 308, y: 248, w: 24, h: 24 },
      { x: 68, y: 388, w: 24, h: 24 },
      { x: 308, y: 388, w: 24, h: 24 },
    ],
    npc: npcDi('taman', [
      {
        id: 'mbak-rani',
        nama: 'Mbak Rani',
        peran: 'Penjaga Air & Energi',
        chapterId: 'air-energi',
        x: 170,
        y: 160,
        warna: '#3b7ea1',
        gerak: false,
      },
      {
        id: 'npc-data-hijau',
        nama: 'Kak Fajar',
        peran: 'Data Hijau',
        chapterId: null,
        tugasId: 'data-hijau',
        x: 610,
        y: 330,
        warna: '#1e88e5',
        gerak: false,
      },
      {
        id: 'npc-lingkungan-sehat',
        nama: 'Pak Sehat',
        peran: 'Lingkungan Sehat',
        chapterId: null,
        tugasId: 'lingkungan-sehat',
        x: 450,
        y: 330,
        warna: '#00897b',
        gerak: false,
      },
      {
        id: 'npc-inovasi-hijau',
        nama: 'Kak Raka',
        peran: 'Inovasi Hijau',
        chapterId: null,
        tugasId: 'inovasi-hijau',
        x: 200,
        y: 330,
        warna: '#5e35b1',
        gerak: false,
      },
      {
        id: 'sinta',
        nama: 'Sinta',
        peran: 'Siswa',
        chapterId: null,
        x: 500,
        y: 420,
        warna: '#e75480',
        gerak: true,
        radiusGerak: 50,
      },
    ]),
    sampah: sampahTanpaIdx([
      { x: 300, y: 200, nama: 'Puntung rokok', jenis: 'residu' },
      { x: 600, y: 420, nama: 'Botol kaca', jenis: 'anorganik' },
      { x: 120, y: 420, nama: 'Lampu bekas', jenis: 'b3' },
    ]),
    portal: [portalKembali(572, 70)],
    titikInteraksi: [{ id: 'panel-surya', x: 366, y: 96 }],
  },
}

// Isi indeks global sampah 0..11 lintas peta (urutan PETA_ORDER, lalu
// urutan di tiap peta) — dipakai logika tampil `idx < sampahLiar`.
{
  let idxGlobal = 0
  for (const id of PETA_ORDER) {
    for (const s of PETA[id].sampah) {
      s.idx = idxGlobal
      idxGlobal += 1
    }
  }
}

/** Semua NPC di semua peta (bentuk lama dari dunia.ts, dipertahankan
 * supaya `misi.ts` tetap bisa mengimpor NPCS apa adanya). */
export const NPCS: NpcDunia[] = PETA_ORDER.flatMap((id) => PETA[id].npc)

/** Cari titik interaksi di sebuah peta (undefined bila peta itu tidak
 * punya titik tersebut — mis. 'pilah' hanya ada di Gerbang). */
export function cariTitik(peta: PetaDunia, id: IdTitikInteraksi): { x: number; y: number } | undefined {
  return peta.titikInteraksi.find((t) => t.id === id)
}

/** Peta tempat NPC ini berdiri (dipakai label lokasi misi). */
export function petaUntukNpc(npcId: string): PetaId | undefined {
  return NPCS.find((n) => n.id === npcId)?.petaId
}
