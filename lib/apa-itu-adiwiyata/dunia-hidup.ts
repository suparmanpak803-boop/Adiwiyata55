// Dunia Hidup — simulasi kebun, maggot, dan sampah liar di dunia Jelajah.
//
// ATURAN SIMULASI (dibaca agen UI Gelombang B sebelum memakai file ini):
//
// - SEMUA fungsi di file ini MURNI: tidak menyentuh localStorage dan tidak
//   memanggil Date di luar parameter. Satu-satunya pengecualian adalah
//   `freshDunia()`, yang memakai `Date.now()` sebagai nilai default bila
//   pemanggil tidak memberi `sekarang` (dipakai storage.ts saat membuat save
//   baru; panggil dengan waktu eksplisit di tes supaya deterministik).
// - Waktu selalu dalam milidetik epoch (parameter `sekarang`, isi Date.now()
//   dari pemanggil). Tanggal "hari" selalu tanggal LOKAL (YYYY-MM-DD, bukan
//   UTC) supaya pergantian hari mengikuti tengah malam waktu setempat.
// - Tanaman: 3 petak tetap (kangkung, cabai, bayam). Tahap 0 benih, 1 tunas,
//   2 semak, 3 berbunga (= siap panen). Tahap TIDAK PERNAH turun.
// - Penyiraman: acuan air sebuah petak adalah yang terbaru dari
//   `terakhirDisiram` dan `ditanam` (tanaman baru ditanam dianggap baru
//   disiram). Bila tanaman tidak disiram >= 2 hari (dihitung dari tanggal
//   lokal acuan air sampai tanggal lokal `sekarang`), ia menjadi layu dan
//   TIDAK tumbuh sampai disiram lagi. Bila masih segar (< 2 hari tanpa air),
//   ia tumbuh 1 tahap per hari berlalu (maks tahap 3). Karena penyiraman
//   hanya terjadi saat pemain berkunjung, dalam praktiknya: pulang setelah
//   1 hari = tumbuh 1 tahap, pulang setelah >= 2 hari tanpa menyiram = layu.
// - Maggot: lapar 0..100, naik +25 per hari berlalu (maks 100). Tidak ada
//   hukuman lain: maggot yang lapar hanya menunggu diberi makan.
// - Sampah liar: 0..12, naik +1 per hari berlalu HANYA bila masih ada misi
//   utama yang belum selesai (`adaMisiBelumSelesai`). Bila semua misi utama
//   selesai, sampah liar tidak bertambah sendiri.
// - `majukanDunia()` menghitung hari berlalu dari `hariTerakhirKunjung`
//   (clamp 0..30; 0 hari = kembalikan referensi dunia yang sama + peristiwa
//   kosong). Tanggal kunjungan yang rusak/tidak bisa dibaca dianggap hari
//   ini: dunia dikembalikan dengan tanggal diperbaiki, tanpa peristiwa.
// - AKSI PERAWATAN (siram / beri makan / bersihkan / panen / panen kasgot):
//   semuanya mengembalikan objek dunia BARU (argumen tidak diubah) plus
//   `koin` dan `pesan` 1 kalimat untuk toast. Bila aksi tidak mengubah apa
//   pun (mis. panen tanaman yang belum siap, kotak maggot belum siap, atau
//   sampah sudah bersih), koin = 0 dan dikembalikan REFERENSI dunia yang
//   sama, supaya reducer tahu tidak ada yang perlu disimpan.
//   Koin: siram +5, beri makan +5, bersihkan +5, panen +20, panen kasgot +20.
//   Panen mereset petak ke tahap 0 (jenis tetap) supaya tumbuh lagi; panen
//   kasgot hanya bila maggot tahap 2, lalu maggot kembali ke tahap 0 dengan
//   lapar 30, dan petak target naik 1 tahap (maks 3, tidak bila layu).
// - TIDAK ADA hukuman keras: tidak ada progres atau koin yang hilang karena
//   tanaman layu, maggot lapar, atau sampah bertambah. Semua bisa diperbaiki
//   dengan satu aksi perawatan.
// - REDUCER vs UI: reducer (context.tsx) hanya menyimpan `dunia` hasil
//   fungsi murni — ia TIDAK mengembalikan `peristiwa`/`pesan`. UI yang butuh
//   teks peristiwa/pesan toast memanggil fungsi murni yang sama langsung
//   dari `save.dunia` (sebelum dispatch), lalu dispatch aksi yang sama;
//   hasilnya identik karena fungsinya murni dan deterministik.
// - POSISI: titik interaksi di dunia Canvas 960x640 (lihat dunia.ts).
//   POSISI_PETAK ada di zona Kebun (x 270-470, y 40-180) tapi DI LUAR kedua
//   bedeng (290,60,120,40) dan (290,120,120,40); petak-1 digeser ke (450,60)
//   supaya tidak menumpuk NPC Pak Kebun di (440,90). POSISI_KOTAK_MAGGOT
//   (760,400) ada di zona Pos Maggot (x 720-920, y 290-430) tapi DI LUAR
//   dinding rumah maggot (790,310,110,80).
// - Nama SFX di suara.ts (siram, panen, tumbuh, maggot, koin) TIDAK dipakai
//   di file ini; UI Gelombang B yang memanggilnya. Nama fungsi di sini
//   sengaja berbeda (siramTanaman, panenTanaman, ...) supaya tidak bentrok.

export type JenisTanaman = 'kangkung' | 'cabai' | 'bayam'

export type PetakId = 'petak-1' | 'petak-2' | 'petak-3'

export interface PetakKebun {
  id: PetakId
  jenis: JenisTanaman
  /** 0 benih, 1 tunas, 2 semak, 3 berbunga (siap panen). */
  tahap: 0 | 1 | 2 | 3
  layu: boolean
  /** Milidetik epoch terakhir disiram; 0 = belum pernah disiram. */
  terakhirDisiram: number
  /** Milidetik epoch tanaman ini ditanam (di-reset tiap panen). */
  ditanam: number
}

export interface Maggot {
  /** 0 kenyang .. 100 sangat lapar. */
  lapar: number
  /** Milidetik epoch terakhir diberi makan; 0 = belum pernah. */
  terakhirDiberiMakan: number
  /** 0 kecil, 1 sedang, 2 besar (siap panen kasgot). */
  tahap: 0 | 1 | 2
  kaliDiberiMakan: number
}

export interface DuniaHidup {
  petak: [PetakKebun, PetakKebun, PetakKebun]
  maggot: Maggot
  /** Sampah liar yang berserakan di dunia; 0..12. */
  sampahLiar: number
  /** Tanggal lokal (YYYY-MM-DD) terakhir dunia dimajukan. */
  hariTerakhirKunjung: string
}

export type JenisPeristiwaDunia = 'tumbuh' | 'layu' | 'lapar' | 'sampah'

export interface PeristiwaDunia {
  jenis: JenisPeristiwaDunia
  /** Satu kalimat Bahasa Indonesia untuk toast/ringkasan kunjungan. */
  teks: string
}

/** Hasil aksi perawatan: dunia baru + koin + pesan toast 1 kalimat. */
export interface HasilPerawatan {
  dunia: DuniaHidup
  koin: number
  pesan: string
}

export const NAMA_TANAMAN: Record<JenisTanaman, string> = {
  kangkung: 'Kangkung',
  cabai: 'Cabai',
  bayam: 'Bayam',
}

/** Label tahap tanaman, indeks = nilai `tahap` (0 benih .. 3 berbunga). */
export const LABEL_TAHAP: ['Benih', 'Tunas', 'Semak', 'Berbunga'] = ['Benih', 'Tunas', 'Semak', 'Berbunga']

export const HARI_TANPA_AIR_LAYU = 2
export const LAPAR_PER_HARI = 25
export const MAKS_SAMPAH_LIAR = 12
export const MAKS_HARI_BERLALU = 30

export const KOIN_SIRAM = 5
export const KOIN_BERI_MAKAN = 5
export const KOIN_BERSIHKAN = 5
export const KOIN_PANEN = 20
export const KOIN_PANEN_KASGOT = 20

/** Titik interaksi petak kebun di dunia (di zona Kebun, di luar bedeng). */
export const POSISI_PETAK: Record<PetakId, { x: number; y: number }> = {
  'petak-1': { x: 450, y: 60 },
  'petak-2': { x: 450, y: 140 },
  'petak-3': { x: 320, y: 170 },
}

/** Titik interaksi kotak maggot di dunia (di zona Pos Maggot, di luar rumah maggot). */
export const POSISI_KOTAK_MAGGOT: { x: number; y: number } = { x: 760, y: 400 }

/** Tanggal lokal YYYY-MM-DD dari milidetik epoch (bukan UTC). */
export function hariLokalDariMs(ms: number): string {
  const d = new Date(ms)
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tanggal = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tanggal}`
}

/** Ubah 'YYYY-MM-DD' jadi jumlah hari sejak epoch (UTC, hanya untuk selisih). */
function tanggalKeHari(tanggal: string): number | null {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal)
  if (!cocok) return null
  const tahun = Number(cocok[1])
  const bulan = Number(cocok[2])
  const hari = Number(cocok[3])
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31) return null
  const ms = Date.UTC(tahun, bulan - 1, hari)
  // Tolak tanggal yang tidak ada (mis. 2026-02-30 lolos lewat normalisasi).
  const cek = new Date(ms)
  if (cek.getUTCFullYear() !== tahun || cek.getUTCMonth() !== bulan - 1 || cek.getUTCDate() !== hari) {
    return null
  }
  return ms / 86_400_000
}

/** Selisih hari (bilangan bulat, >= 0) antara dua tanggal lokal; null bila tanggal rusak. */
function selisihHari(dari: string, sampai: string): number | null {
  const awal = tanggalKeHari(dari)
  const akhir = tanggalKeHari(sampai)
  if (awal === null || akhir === null) return null
  return Math.max(0, Math.round(akhir - awal))
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function petakBaru(id: PetakId, jenis: JenisTanaman, sekarang: number): PetakKebun {
  return { id, jenis, tahap: 0, layu: false, terakhirDisiram: 0, ditanam: sekarang }
}

export function freshDunia(sekarang: number = Date.now()): DuniaHidup {
  return {
    petak: [petakBaru('petak-1', 'kangkung', sekarang), petakBaru('petak-2', 'cabai', sekarang), petakBaru('petak-3', 'bayam', sekarang)],
    maggot: { lapar: 20, terakhirDiberiMakan: 0, tahap: 0, kaliDiberiMakan: 0 },
    sampahLiar: 3,
    hariTerakhirKunjung: hariLokalDariMs(sekarang),
  }
}

/**
 * Majukan simulasi dari `hariTerakhirKunjung` sampai tanggal lokal
 * `sekarang`. Mengembalikan dunia baru + daftar peristiwa (1 baris per
 * perubahan). 0 hari berlalu = dunia dikembalikan apa adanya (referensi
 * sama) + peristiwa kosong. Argumen tidak diubah.
 */
export function majukanDunia(
  dunia: DuniaHidup,
  sekarang: number,
  adaMisiBelumSelesai: boolean,
): { dunia: DuniaHidup; peristiwa: PeristiwaDunia[] } {
  const hariIni = hariLokalDariMs(sekarang)
  const hariBerlalu = selisihHari(dunia.hariTerakhirKunjung, hariIni)
  // Tanggal kunjungan rusak: perbaiki tanggalnya saja, tanpa peristiwa.
  if (hariBerlalu === null) {
    return { dunia: { ...dunia, hariTerakhirKunjung: hariIni }, peristiwa: [] }
  }
  if (hariBerlalu === 0) {
    return { dunia, peristiwa: [] }
  }
  const hari = clamp(hariBerlalu, 0, MAKS_HARI_BERLALU)
  const peristiwa: PeristiwaDunia[] = []

  const petak = dunia.petak.map((p): PetakKebun => {
    const nama = NAMA_TANAMAN[p.jenis]
    // Acuan air = yang terbaru dari terakhir disiram / ditanam.
    const acuanAir = Math.max(p.terakhirDisiram, p.ditanam)
    const hariTanpaAir = selisihHari(hariLokalDariMs(acuanAir), hariIni) ?? Number.POSITIVE_INFINITY
    if (p.layu) {
      // Tetap layu sampai disiram; tidak tumbuh.
      return p
    }
    if (hariTanpaAir >= HARI_TANPA_AIR_LAYU) {
      peristiwa.push({ jenis: 'layu', teks: `${nama} layu karena tidak disiram.` })
      return { ...p, layu: true }
    }
    const naik = Math.min(hari, 3 - p.tahap)
    if (naik <= 0) return p
    const tahapBaru = (p.tahap + naik) as PetakKebun['tahap']
    peristiwa.push({ jenis: 'tumbuh', teks: `${nama} tumbuh jadi ${LABEL_TAHAP[tahapBaru].toLowerCase()}.` })
    return { ...p, tahap: tahapBaru }
  }) as [PetakKebun, PetakKebun, PetakKebun]

  let maggot = dunia.maggot
  const laparBaru = clamp(dunia.maggot.lapar + LAPAR_PER_HARI * hari, 0, 100)
  if (laparBaru > dunia.maggot.lapar) {
    maggot = { ...dunia.maggot, lapar: laparBaru }
    const tingkat = laparBaru >= 75 ? 'sangat lapar' : laparBaru >= 50 ? 'mulai lapar' : 'sedikit lapar'
    peristiwa.push({ jenis: 'lapar', teks: `Magi ${tingkat}, ia menggeliat mencari makan.` })
  }

  let sampahLiar = dunia.sampahLiar
  if (adaMisiBelumSelesai) {
    const sampahBaru = clamp(dunia.sampahLiar + hari, 0, MAKS_SAMPAH_LIAR)
    if (sampahBaru > dunia.sampahLiar) {
      sampahLiar = sampahBaru
      peristiwa.push({ jenis: 'sampah', teks: `Sampah liar bertambah jadi ${sampahBaru}.` })
    }
  }

  return {
    dunia: { petak, maggot, sampahLiar, hariTerakhirKunjung: hariIni },
    peristiwa,
  }
}

function cariPetak(dunia: DuniaHidup, petakId: PetakId): PetakKebun {
  return dunia.petak.find((p) => p.id === petakId) ?? dunia.petak[0]
}

function gantiPetak(dunia: DuniaHidup, petak: PetakKebun): [PetakKebun, PetakKebun, PetakKebun] {
  return dunia.petak.map((p) => (p.id === petak.id ? petak : p)) as [PetakKebun, PetakKebun, PetakKebun]
}

/** Siram satu petak: segar lagi (layu hilang), +5 koin. */
export function siramTanaman(dunia: DuniaHidup, petakId: PetakId, sekarang: number): HasilPerawatan {
  const petak = cariPetak(dunia, petakId)
  const nama = NAMA_TANAMAN[petak.jenis]
  const sudah = { ...petak, terakhirDisiram: sekarang, layu: false }
  const pesan =
    petak.tahap === 3
      ? `${nama} sudah siap panen, disiram pun tetap segar.`
      : `${nama} disiram, segar lagi.`
  return { dunia: { ...dunia, petak: gantiPetak(dunia, sudah) }, koin: KOIN_SIRAM, pesan }
}

/** Beri makan Magi: lapar -40, tiap 3x makan naik 1 tahap (maks 2), +5 koin. */
export function beriMakanMaggot(dunia: DuniaHidup, sekarang: number): HasilPerawatan {
  const kali = dunia.maggot.kaliDiberiMakan + 1
  const naikTahap = kali % 3 === 0 && dunia.maggot.tahap < 2
  const maggot: Maggot = {
    lapar: clamp(dunia.maggot.lapar - 40, 0, 100),
    terakhirDiberiMakan: sekarang,
    tahap: naikTahap ? ((dunia.maggot.tahap + 1) as Maggot['tahap']) : dunia.maggot.tahap,
    kaliDiberiMakan: kali,
  }
  const pesan = naikTahap ? 'Magi makan dengan lahap dan makin besar!' : 'Magi makan dengan lahap.'
  return { dunia: { ...dunia, maggot }, koin: KOIN_BERI_MAKAN, pesan }
}

/** Bersihkan satu sampah liar: -1 sampah, +5 koin; bila sudah 0, koin 0. */
export function bersihkanSampah(dunia: DuniaHidup): HasilPerawatan {
  if (dunia.sampahLiar <= 0) {
    return { dunia, koin: 0, pesan: 'Dunia sudah bersih, tidak ada sampah liar.' }
  }
  return {
    dunia: { ...dunia, sampahLiar: dunia.sampahLiar - 1 },
    koin: KOIN_BERSIHKAN,
    pesan: 'Sampah liar dibersihkan, dunia jadi lebih rapi.',
  }
}

/** Panen satu petak (hanya bila tahap 3): +20 koin, petak tumbuh lagi dari benih. */
export function panenTanaman(dunia: DuniaHidup, petakId: PetakId, sekarang: number): HasilPerawatan {
  const petak = cariPetak(dunia, petakId)
  const nama = NAMA_TANAMAN[petak.jenis]
  if (petak.tahap !== 3) {
    return { dunia, koin: 0, pesan: `${nama} belum siap panen.` }
  }
  const sudah: PetakKebun = {
    ...petak,
    tahap: 0,
    layu: false,
    terakhirDisiram: sekarang,
    ditanam: sekarang,
  }
  return { dunia: { ...dunia, petak: gantiPetak(dunia, sudah) }, koin: KOIN_PANEN, pesan: `${nama} dipanen, petaknya tumbuh lagi dari benih.` }
}

/**
 * Panen kasgot (hanya bila maggot tahap 2): +20 koin, maggot kembali ke
 * tahap 0 dengan lapar 30, petak target naik 1 tahap (maks 3, tidak bila
 * layu). `terakhirDisiram` petak tidak berubah.
 */
export function panenKasgot(dunia: DuniaHidup, petakId: PetakId, sekarang: number): HasilPerawatan {
  void sekarang
  if (dunia.maggot.tahap !== 2) {
    return { dunia, koin: 0, pesan: 'Kasgot belum siap dipanen, Magi masih kecil.' }
  }
  const petak = cariPetak(dunia, petakId)
  const nama = NAMA_TANAMAN[petak.jenis]
  const maggot: Maggot = { ...dunia.maggot, tahap: 0, lapar: 30 }
  const naik = !petak.layu && petak.tahap < 3
  const petakBaruHasil: PetakKebun = naik
    ? { ...petak, tahap: (petak.tahap + 1) as PetakKebun['tahap'] }
    : petak
  const pesan = naik
    ? `Kasgot dipanen, ${nama} jadi makin subur.`
    : `Kasgot dipanen, tapi ${nama} sedang layu jadi tidak ikut tumbuh.`
  return { dunia: { ...dunia, petak: gantiPetak(dunia, petakBaruHasil), maggot }, koin: KOIN_PANEN_KASGOT, pesan }
}
