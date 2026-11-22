// Pergantian tahun ajaran otomatis dengan pengarsipan.
//
// Aturan yang disepakati pengguna:
// - Setiap awal tahun ajaran: kelas XI naik ke XII (orangnya tetap
//   sama) dan kelas XII yang lulus DIARSIPKAN. Kelas X lama ikut
//   DIARSIPKAN — naik X→XI ada sistem jurusan dan kemungkinan
//   rolling, siswa kelas X diacak ulang ke kelas XI berdasarkan
//   jurusan sehingga TIDAK sama orangnya; rename otomatis X→XI
//   untuk peran siswa SALAH (akan menaruh siswa di kelas yang salah).
//   Peran siswa X dikosongkan (class_name NULL) untuk ditetapkan
//   ulang admin setelah hasil rolling keluar. Kelas X baru (PPDB)
//   dan kelas XI baru (hasil rolling) dimasukkan admin.
// - Sebelum XI naik ke XII, diambil SALINAN PENGAMAN (cadangan):
//   baris kelas XI, X, dan XII yang terlibat (nama, jumlah siswa,
//   wali kelas, petugas, status arsip), disimpan di ringkasan.cadangan.
//   TIDAK ada data perorangan di cadangan: tujuan pengarsipan hanya
//   data setoran sampah; daftar murid tidak disimpan di mana pun.
//   Ada tombol admin "Pulihkan cadangan XI" untuk mengembalikan bila
//   promosi salah (kelas dikembalikan, peran dipulihkan lewat
//   transformasi nama kelas). Peran siswa X yang dikosongkan TIDAK
//   bisa dipulihkan perorangan (tidak ada datanya).
// - Akun siswa tetap ada; keterikatan kelas lulusan dan siswa X
//   berakhir (class_name dikosongkan). Peran (admin/petugas/
//   pengunjung) dan expires_on petugas TIDAK diubah.
// - Data setoran sampah (adiwiyata_deposits) TIDAK disentuh sama
//   sekali — riwayat tetap utuh dan bisa dilihat lewat filter periode.
// - TIDAK ada penghapusan data di mana pun dalam fitur ini.
//
// Modul ini server-only (mengimpor pool). Dijalankan lewat cron
// tahunan (/api/cron/tahun-ajaran, 12 Juli 00:00 WIB) atau pemicu
// manual admin di /admin/diagnostik.
//
// CATATAN BENTROK NAMA (keputusan desain): nama kelas dipakai ulang
// tiap tahun (X-A..X-H, XI-A..XI-H, XII-A..XII-H) dan `name` adalah
// PRIMARY KEY di adiwiyata_classes. Saat XI-A naik ke XII-A, baris
// XII-A lama (yang sedang diarsipkan) masih memegang nama itu.
// Supaya promosi tetap bisa jalan, baris arsip yang menghalangi
// dipindah ke nama bersufiks `<nama> (arsip <tahun ajaran yang
// berakhir)>`, mis. `XII-A (arsip 2026/2027)` — barisnya tetap ada
// (tidak dihapus), tetap bertanda diarsipkan, dan ringkasan mencatat
// pemindahan ini (arsipDipindah). Hal yang sama berlaku untuk kelas
// X yang diarsipkan: namanya dibebaskan dengan sufiks yang sama
// supaya kelas X baru (PPDB) bisa memakai nama itu. Konsekuensi
// yang perlu diketahui: setoran lama kelas itu tetap tersimpan,
// tetapi JOIN leaderboard sampah untuk periode lama tidak lagi
// menemukan student_count kelas tersebut, sehingga kelas itu tampil
// di daftar "belum memenuhi syarat" (bukan di peringkat) bila
// periode lama dibuka kembali. Total kg tidak berubah (dihitung
// dari setoran).

import { pool } from '@/lib/db'
import type { PoolClient } from 'pg'

export type HasilPromosi =
  | { aksi: 'promosi'; baru: string }
  | { aksi: 'arsip' }
  | { aksi: 'lewati' }

export type RenameKelas = { dari: string; ke: string }

// Salinan pengaman yang diambil SEBELUM ada tulisan apa pun saat
// rollover berjalan. Disimpan di ringkasan.cadangan. HANYA berisi
// baris KELAS (nama, jumlah siswa, wali kelas, petugas, status
// arsip) — TIDAK ada data perorangan (tanpa user_id). Tujuan
// pengarsipan hanya data setoran sampah; daftar murid tidak disimpan
// di mana pun.
export type CadanganKelas = {
  nama: string
  student_count: number | null
  homeroom_teacher: string
  officer_name: string
  diarsipkan: boolean
}
export type CadanganRollover = {
  kelasXI: CadanganKelas[] // kelas XI yang naik (dipulihkan bila perlu)
  kelasX: CadanganKelas[] // kelas X yang diarsipkan (catatan saja)
  kelasXII: CadanganKelas[] // kelas XII yang diarsipkan (catatan saja)
}

export type RencanaRollover = {
  tahunAjaran: string
  tahunAjaranBerakhir: string
  renames: RenameKelas[] // hanya XI → XII
  archives: string[] // X + XII (gabungan, untuk kompatibilitas)
  archivesX: string[] // kelas X yang diarsipkan
  archivesXII: string[] // kelas XII (lulusan) yang diarsipkan
  arsipDipindah: RenameKelas[] // baris arsip penghalang + kelas X yang dibebaskan namanya
  dilewati: string[]
}

export type RingkasanRollover = {
  dipromosikan: RenameKelas[]
  diarsipkan: string[]
  arsipDipindah: RenameKelas[]
  dilewati: string[]
  peranDiperbarui: number
  lulusanDiputus: number // hanya XII
  peranXDikosongkan: number // hanya X
  cadangan?: CadanganRollover
  dipulihkan_pada?: string | null
  dipaksa: boolean
}

export type PratinjauRollover = RencanaRollover & {
  sudahDijalankan: boolean
  adaCadangan: boolean
  sudahDipulihkan: boolean
  peranDiperbarui: number
  lulusanDiputus: number
  peranXDikosongkan: number
  cadangan: { kelasXI: number; kelasX: number; kelasXII: number }
}

export type HasilJalankan =
  | { ok: true; tahunAjaran: string; ringkasan: RingkasanRollover }
  | { ok: false; tahunAjaran: string; sudahDijalankan: boolean; error: string }

export type HasilPulihkan =
  | { ok: true; tahunAjaran: string; kelasDipulihkan: number; peranDipulihkan: number }
  | { ok: false; tahunAjaran: string; error: string }

const POLA_KELAS = /^(XII|XI|X)-(.+)$/
const POLA_LABEL = /^(\d{4})\/(\d{4})$/

// Tingkat kelas dari nama ('X' | 'XI' | 'XII'), atau null bila
// tidak cocok pola. Dipakai untuk membedakan arsip X dan XII.
export function tingkatKelas(nama: string): 'X' | 'XI' | 'XII' | null {
  const cocok = POLA_KELAS.exec(nama.trim())
  if (!cocok) return null
  return cocok[1] as 'X' | 'XI' | 'XII'
}

// Aturan promosi satu nama kelas (fungsi murni):
// 'X-1' → diarsipkan (jurusan + rolling: siswa diacak ulang, jadi
// rename otomatis ke XI SALAH). 'XI-1' → 'XII-1' (orangnya tetap
// sama). 'XII-1' → diarsipkan (lulus).
// Nama yang tidak cocok pola `^(XII|XI|X)-...` dikembalikan sebagai
// "dilewati" (tidak disentuh). Urutan alternatif XII dulu penting:
// 'XII-1' tidak boleh tertangkap sebagai X dengan rombel 'II-1'.
export function promosikanNamaKelas(nama: string): HasilPromosi {
  const cocok = POLA_KELAS.exec(nama.trim())
  if (!cocok) return { aksi: 'lewati' }
  const [, tingkat, rombel] = cocok
  if (tingkat === 'XI') return { aksi: 'promosi', baru: `XII-${rombel}` }
  return { aksi: 'arsip' }
}

// Label tahun ajaran dari tanggal jalan (zona Asia/Jakarta):
// Juli–Desember YYYY → 'YYYY/YYYY+1'; Januari–Juni YYYY → 'YYYY-1/YYYY'.
// Rollover 12 Juli 2027 → '2027/2028'.
export function labelTahunAjaran(tanggal: Date): string {
  const bagian = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(tanggal)
  const tahun = Number(bagian.find((item) => item.type === 'year')?.value)
  const bulan = Number(bagian.find((item) => item.type === 'month')?.value)
  if (bulan >= 7) return `${tahun}/${tahun + 1}`
  return `${tahun - 1}/${tahun}`
}

// Tahun ajaran yang berakhir saat label baru dimulai, mis.
// '2027/2028' → '2026/2027'. Dipakai sebagai sufiks nama arsip.
export function tahunAjaranSebelumnya(label: string): string | null {
  const cocok = POLA_LABEL.exec(label)
  if (!cocok) return null
  const awal = Number(cocok[1])
  const akhir = Number(cocok[2])
  if (akhir !== awal + 1) return null
  return `${awal - 1}/${awal}`
}

export function labelTahunAjaranValid(label: unknown): label is string {
  if (typeof label !== 'string') return false
  const cocok = POLA_LABEL.exec(label)
  if (!cocok) return false
  return Number(cocok[2]) === Number(cocok[1]) + 1
}

// Membuat skema bila belum ada (idempotent). Dipanggil di awal
// pembacaan dan penulisan, seperti ensureLiburSchema().
export async function ensureTahunAjaranSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE public.adiwiyata_classes ADD COLUMN IF NOT EXISTS diarsipkan boolean NOT NULL DEFAULT false;
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.arsip_tahun_ajaran (
      tahun_ajaran text PRIMARY KEY,
      dijalankan_pada timestamptz NOT NULL DEFAULT now(),
      ringkasan jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  `)
}

async function cekSudahDijalankan(
  klien: { query: PoolClient['query'] },
  tahunAjaran: string,
): Promise<boolean> {
  const hasil = await klien.query(
    `SELECT 1 FROM public.arsip_tahun_ajaran WHERE tahun_ajaran = $1 LIMIT 1`,
    [tahunAjaran],
  )
  return (hasil.rowCount ?? 0) > 0
}

// Membaca ringkasan rollover satu tahun ajaran (null bila belum ada
// atau bentuknya tidak dikenali). Dipakai pratinjau (adaCadangan /
// sudahDipulihkan) dan pemulihan cadangan.
async function bacaRingkasanTahunAjaran(
  klien: { query: PoolClient['query'] },
  tahunAjaran: string,
): Promise<RingkasanRollover | null> {
  const hasil = await klien.query<{ ringkasan: unknown }>(
    `SELECT ringkasan FROM public.arsip_tahun_ajaran WHERE tahun_ajaran = $1 LIMIT 1`,
    [tahunAjaran],
  )
  const nilai = hasil.rows[0]?.ringkasan
  if (!nilai || typeof nilai !== 'object') return null
  const r = nilai as Record<string, unknown>
  if (!Array.isArray(r.dipromosikan) || !Array.isArray(r.diarsipkan)) return null
  return nilai as RingkasanRollover
}

function cadanganValid(cadangan: unknown): cadangan is CadanganRollover {
  if (!cadangan || typeof cadangan !== 'object') return false
  const c = cadangan as Record<string, unknown>
  return Array.isArray(c.kelasXI) && Array.isArray(c.kelasX) && Array.isArray(c.kelasXII)
}

// Menyusun rencana dari daftar kelas (fungsi murni, tanpa tulis).
// `kelas` berisi semua baris adiwiyata_classes (nama + status arsip).
export function rencanakanRollover(
  kelas: { nama: string; diarsipkan: boolean }[],
  tahunAjaran: string,
): RencanaRollover {
  const berakhir = tahunAjaranSebelumnya(tahunAjaran) ?? tahunAjaran
  const renames: RenameKelas[] = []
  const archives: string[] = []
  const archivesX: string[] = []
  const archivesXII: string[] = []
  const dilewati: string[] = []
  const namaDiubah = new Set<string>()
  for (const item of kelas) {
    if (item.diarsipkan) {
      dilewati.push(item.nama)
      continue
    }
    const hasil = promosikanNamaKelas(item.nama)
    if (hasil.aksi === 'promosi') {
      renames.push({ dari: item.nama, ke: hasil.baru })
      namaDiubah.add(item.nama)
    } else if (hasil.aksi === 'arsip') {
      archives.push(item.nama)
      if (tingkatKelas(item.nama) === 'X') archivesX.push(item.nama)
      else archivesXII.push(item.nama)
    } else {
      dilewati.push(item.nama)
    }
  }
  // Nama bersufiks arsip yang masih bebas (dengan penomoran bila bentrok).
  const namaTerpakai = new Set(kelas.map((item) => item.nama))
  const cariNamaArsipBebas = (nama: string): string => {
    let tujuan = `${nama} (arsip ${berakhir})`
    let urutan = 2
    while (namaTerpakai.has(tujuan)) {
      tujuan = `${nama} (arsip ${berakhir} ${urutan})`
      urutan += 1
    }
    namaTerpakai.add(tujuan)
    return tujuan
  }
  const arsipDipindah: RenameKelas[] = []
  // 1. Baris arsip lama yang masih memegang nama tujuan promosi harus
  //    dipindah (lihat catatan bentrok nama di atas). Nama tujuan yang
  //    ditempati baris yang ikut di-rename tahun ini tidak dihitung
  //    (rename dua tahap membebaskannya).
  for (const rename of renames) {
    if (!namaTerpakai.has(rename.ke) || namaDiubah.has(rename.ke)) continue
    arsipDipindah.push({ dari: rename.ke, ke: cariNamaArsipBebas(rename.ke) })
  }
  // 2. Kelas X yang diarsipkan tahun ini: namanya dibebaskan dengan
  //    sufiks supaya kelas X baru (PPDB) bisa memakai nama itu.
  for (const nama of archivesX) {
    arsipDipindah.push({ dari: nama, ke: cariNamaArsipBebas(nama) })
  }
  return { tahunAjaran, tahunAjaranBerakhir: berakhir, renames, archives, archivesX, archivesXII, arsipDipindah, dilewati }
}

// Pratinjau tanpa menulis apa pun: rencana + jumlah peran yang akan
// berubah + apakah label tahun ajaran ini sudah pernah dijalankan +
// apakah ada cadangan yang bisa dipulihkan.
export async function pratinjauPergantianTahunAjaran(
  tanggal: Date = new Date(),
): Promise<PratinjauRollover> {
  await ensureTahunAjaranSchema()
  const tahunAjaran = labelTahunAjaran(tanggal)
  const kelas = await pool.query<{ name: string; diarsipkan: boolean }>(
    `SELECT name, COALESCE(diarsipkan, false) AS diarsipkan FROM public.adiwiyata_classes WHERE school_id = 'SMAN55' ORDER BY name`,
  )
  const rencana = rencanakanRollover(
    kelas.rows.map((row) => ({ nama: row.name, diarsipkan: row.diarsipkan })),
    tahunAjaran,
  )
  const peran = await pool.query<{ class_name: string | null; jumlah: string }>(
    `SELECT class_name, COUNT(*)::text AS jumlah FROM public.adiwiyata_user_roles WHERE class_name IS NOT NULL GROUP BY class_name`,
  )
  const jumlahPerKelas = new Map(peran.rows.map((row) => [row.class_name as string, Number(row.jumlah)]))
  const peranDiperbarui = rencana.renames.reduce((total, rename) => total + (jumlahPerKelas.get(rename.dari) ?? 0), 0)
  const lulusanDiputus = rencana.archivesXII.reduce((total, nama) => total + (jumlahPerKelas.get(nama) ?? 0), 0)
  const peranXDikosongkan = rencana.archivesX.reduce((total, nama) => total + (jumlahPerKelas.get(nama) ?? 0), 0)
  const sudahDijalankan = await cekSudahDijalankan(pool, tahunAjaran)
  const ringkasan = await bacaRingkasanTahunAjaran(pool, tahunAjaran)
  const adaCadangan = ringkasan !== null && cadanganValid(ringkasan.cadangan)
  const sudahDipulihkan = ringkasan?.dipulihkan_pada != null && ringkasan.dipulihkan_pada !== ''
  return {
    ...rencana,
    sudahDijalankan,
    adaCadangan,
    sudahDipulihkan,
    peranDiperbarui,
    lulusanDiputus,
    peranXDikosongkan,
    cadangan: { kelasXI: rencana.renames.length, kelasX: rencana.archivesX.length, kelasXII: rencana.archivesXII.length },
  }
}

// Mengambil salinan pengaman (cadangan) untuk rollover: baris kelas XI
// yang akan naik, baris kelas X yang akan diarsipkan, dan baris kelas
// XII yang akan diarsipkan. Hanya baris KELAS — tidak ada data
// perorangan. Hanya SELECT — dipanggil sebelum langkah tulis pertama.
async function ambilCadangan(
  klien: { query: PoolClient['query'] },
  rencana: RencanaRollover,
): Promise<CadanganRollover> {
  const namaSemua = [
    ...rencana.renames.map((item) => item.dari),
    ...rencana.archivesX,
    ...rencana.archivesXII,
  ]
  const cadangan: CadanganRollover = { kelasXI: [], kelasX: [], kelasXII: [] }
  if (namaSemua.length === 0) return cadangan
  const hasil = await klien.query<{ name: string; student_count: number | null; homeroom_teacher: string; officer_name: string; diarsipkan: boolean }>(
    `SELECT name, student_count, homeroom_teacher, officer_name, COALESCE(diarsipkan, false) AS diarsipkan FROM public.adiwiyata_classes WHERE school_id = 'SMAN55' AND name = ANY($1::text[]) ORDER BY name`,
    [namaSemua],
  )
  for (const row of hasil.rows) {
    const baris: CadanganKelas = {
      nama: row.name,
      student_count: row.student_count ?? null,
      homeroom_teacher: row.homeroom_teacher ?? '',
      officer_name: row.officer_name ?? '',
      diarsipkan: row.diarsipkan ?? false,
    }
    const tingkat = tingkatKelas(row.name)
    if (tingkat === 'XI') cadangan.kelasXI.push(baris)
    else if (tingkat === 'X') cadangan.kelasX.push(baris)
    else if (tingkat === 'XII') cadangan.kelasXII.push(baris)
  }
  return cadangan
}

// Menjalankan rollover dalam satu transaksi. `klien` hanya dipakai
// pengujian (diisi koneksi palsu); pemakaian normal memakai pool.
// Penjaga idempotensi: bila label tahun ajaran sudah tercatat,
// tolak jalan lagi kecuali `paksa: true` (dicatat di ringkasan).
export async function jalankanPergantianTahunAjaran(
  opts: { tahunAjaran?: string; paksa?: boolean } = {},
  klien?: PoolClient,
): Promise<HasilJalankan> {
  await ensureTahunAjaranSchema()
  const tahunAjaran = opts.tahunAjaran ?? labelTahunAjaran(new Date())
  if (!labelTahunAjaranValid(tahunAjaran)) {
    return { ok: false, tahunAjaran, sudahDijalankan: false, error: 'Label tahun ajaran tidak valid.' }
  }
  const paksa = opts.paksa === true
  const koneksi = klien ?? (await pool.connect())
  const milikSendiri = klien === undefined
  try {
    await koneksi.query('BEGIN')
    if ((await cekSudahDijalankan(koneksi, tahunAjaran)) && !paksa) {
      await koneksi.query('ROLLBACK')
      return { ok: false, tahunAjaran, sudahDijalankan: true, error: 'Pergantian tahun ajaran ini sudah pernah dijalankan.' }
    }
    const kelas = await koneksi.query<{ name: string; diarsipkan: boolean }>(
      `SELECT name, COALESCE(diarsipkan, false) AS diarsipkan FROM public.adiwiyata_classes WHERE school_id = 'SMAN55' ORDER BY name`,
    )
    const rencana = rencanakanRollover(
      kelas.rows.map((row) => ({ nama: row.name, diarsipkan: row.diarsipkan })),
      tahunAjaran,
    )
    // 0. Salinan pengaman (cadangan) — diambil SEBELUM langkah tulis
    //    pertama. Bila transaksi gagal/rollback, cadangan ikut hilang
    //    (tidak ada ringkasan yang tersimpan).
    const cadangan = await ambilCadangan(koneksi, rencana)
    // 1. Pindahkan baris arsip (penghalang nama tujuan + kelas X yang
    //    dibebaskan namanya).
    for (const pindah of rencana.arsipDipindah) {
      await koneksi.query(
        `UPDATE public.adiwiyata_classes SET name = $2 WHERE name = $1 AND school_id = 'SMAN55'`,
        [pindah.dari, pindah.ke],
      )
    }
    // 2. Tandai kelas X dan XII tahun ini sebagai arsip (pakai nama
    //    kini setelah langkah 1 — kelas X sudah bersufiks).
    const namaArsipKini = new Map(rencana.arsipDipindah.map((pindah) => [pindah.dari, pindah.ke]))
    const arsipKini = rencana.archives.map((nama) => namaArsipKini.get(nama) ?? nama)
    if (arsipKini.length > 0) {
      await koneksi.query(
        `UPDATE public.adiwiyata_classes SET diarsipkan = true WHERE school_id = 'SMAN55' AND name = ANY($1::text[])`,
        [arsipKini],
      )
    }
    // 3. Rename dua tahap untuk promosi XI → XII (nama sementara dulu,
    //    lalu nama akhir) supaya tidak bentrok primary key.
    for (const rename of rencana.renames) {
      await koneksi.query(
        `UPDATE public.adiwiyata_classes SET name = $2 WHERE name = $1 AND school_id = 'SMAN55'`,
        [rename.dari, `__rollover__${rename.dari}`],
      )
    }
    for (const rename of rencana.renames) {
      await koneksi.query(
        `UPDATE public.adiwiyata_classes SET name = $2 WHERE name = $1 AND school_id = 'SMAN55'`,
        [`__rollover__${rename.dari}`, rename.ke],
      )
    }
    // 4. Perbarui peran pengguna. Urutan penting: putus DULU (lulusan
    //    XII + siswa X), baru rename XI → XII — supaya peran yang
    //    baru naik ke XII tidak ikut terputus. Rename memakai satu
    //    UPDATE CASE (bukan UPDATE berurutan) agar baris yang baru
    //    saja diganti namanya tidak ikut terganti lagi.
    let lulusanDiputus = 0
    if (rencana.archivesXII.length > 0) {
      const hasil = await koneksi.query(
        `UPDATE public.adiwiyata_user_roles SET class_name = NULL WHERE class_name = ANY($1::text[])`,
        [rencana.archivesXII],
      )
      lulusanDiputus = hasil.rowCount ?? 0
    }
    let peranXDikosongkan = 0
    if (rencana.archivesX.length > 0) {
      const hasil = await koneksi.query(
        `UPDATE public.adiwiyata_user_roles SET class_name = NULL WHERE class_name = ANY($1::text[])`,
        [rencana.archivesX],
      )
      peranXDikosongkan = hasil.rowCount ?? 0
    }
    let peranDiperbarui = 0
    if (rencana.renames.length > 0) {
      const klausa: string[] = []
      const parameter: unknown[] = []
      rencana.renames.forEach((rename, index) => {
        klausa.push(`WHEN $${index * 2 + 1} THEN $${index * 2 + 2}`)
        parameter.push(rename.dari, rename.ke)
      })
      parameter.push(rencana.renames.map((rename) => rename.dari))
      const hasil = await koneksi.query(
        `UPDATE public.adiwiyata_user_roles SET class_name = CASE class_name ${klausa.join(' ')} END
          WHERE class_name = ANY($${parameter.length}::text[])`,
        parameter,
      )
      peranDiperbarui = hasil.rowCount ?? 0
    }
    const ringkasan: RingkasanRollover = {
      dipromosikan: rencana.renames,
      diarsipkan: rencana.archives,
      arsipDipindah: rencana.arsipDipindah,
      dilewati: rencana.dilewati,
      peranDiperbarui,
      lulusanDiputus,
      peranXDikosongkan,
      cadangan,
      dipulihkan_pada: null,
      dipaksa: paksa,
    }
    await koneksi.query(
      `INSERT INTO public.arsip_tahun_ajaran (tahun_ajaran, ringkasan)
         VALUES ($1, $2::jsonb)
       ON CONFLICT (tahun_ajaran) DO UPDATE SET dijalankan_pada = now(), ringkasan = EXCLUDED.ringkasan`,
      [tahunAjaran, JSON.stringify(ringkasan)],
    )
    await koneksi.query('COMMIT')
    return { ok: true, tahunAjaran, ringkasan }
  } catch (error) {
    await koneksi.query('ROLLBACK').catch(() => undefined)
    console.error('[tahun-ajaran] rollover gagal:', error)
    return { ok: false, tahunAjaran, sudahDijalankan: false, error: 'Pergantian tahun ajaran gagal dijalankan.' }
  } finally {
    if (milikSendiri) koneksi.release()
  }
}

// Memulihkan cadangan XI: mengembalikan kelas XI yang sudah naik ke
// XII beserta peran siswanya, dari salinan pengaman di ringkasan.
// Peran dikembalikan lewat transformasi nama kelas (semua peran XII-*
// kembali ke XI-*) — bukan dari daftar perorangan, karena cadangan
// tidak menyimpan data murid. Konsekuensinya, peran yang ditetapkan
// admin ke kelas XII SETELAH rollover ikut kembali ke XI.
// Peran siswa X TIDAK dipulihkan (kelas X sudah diarsipkan; tidak ada
// data perorangan untuk mengembalikannya — peran X ditetapkan ulang
// admin setelah rolling). Hanya admin yang memanggil (route
// /admin/diagnostik). Menolak tanpa menulis apa pun bila: tidak ada
// cadangan, sudah pernah dipulihkan, nama tujuan XI sudah dipakai
// baris lain, atau baris XII sumber tidak ditemukan.
export async function pulihkanCadanganXI(
  opts: { tahunAjaran?: string } = {},
  klien?: PoolClient,
): Promise<HasilPulihkan> {
  await ensureTahunAjaranSchema()
  const tahunAjaran = opts.tahunAjaran ?? labelTahunAjaran(new Date())
  if (!labelTahunAjaranValid(tahunAjaran)) {
    return { ok: false, tahunAjaran, error: 'Label tahun ajaran tidak valid.' }
  }
  const koneksi = klien ?? (await pool.connect())
  const milikSendiri = klien === undefined
  try {
    await koneksi.query('BEGIN')
    const ringkasan = await bacaRingkasanTahunAjaran(koneksi, tahunAjaran)
    if (!ringkasan || !cadanganValid(ringkasan.cadangan)) {
      await koneksi.query('ROLLBACK')
      return { ok: false, tahunAjaran, error: `Tidak ada cadangan XI untuk tahun ajaran ${tahunAjaran}.` }
    }
    if (ringkasan.dipulihkan_pada != null && ringkasan.dipulihkan_pada !== '') {
      await koneksi.query('ROLLBACK')
      return { ok: false, tahunAjaran, error: `Cadangan XI tahun ajaran ${tahunAjaran} sudah pernah dipulihkan.` }
    }
    const cadangan = ringkasan.cadangan
    // Pasangan nama lama (XI) → nama kini (XII) dari ringkasan promosi.
    const petaKembali = new Map<string, string>()
    for (const item of ringkasan.dipromosikan ?? []) {
      if (typeof item?.dari === 'string' && typeof item?.ke === 'string') petaKembali.set(item.dari, item.ke)
    }
    const targetXI: string[] = []
    const sumberXII: string[] = []
    for (const kelas of cadangan.kelasXI) {
      const sumber = petaKembali.get(kelas.nama)
      if (!sumber) {
        await koneksi.query('ROLLBACK')
        return { ok: false, tahunAjaran, error: `Data cadangan tidak konsisten: kelas ${kelas.nama} tidak ada di daftar promosi.` }
      }
      targetXI.push(kelas.nama)
      sumberXII.push(sumber)
    }
    if (targetXI.length === 0) {
      await koneksi.query('ROLLBACK')
      return { ok: false, tahunAjaran, error: `Cadangan XI tahun ajaran ${tahunAjaran} kosong — tidak ada kelas untuk dipulihkan.` }
    }
    // Tolak bila ada nama tujuan XI yang sudah dipakai baris lain.
    const bentrok = await koneksi.query<{ name: string }>(
      `SELECT name FROM public.adiwiyata_classes WHERE name = ANY($1::text[])`,
      [targetXI],
    )
    if ((bentrok.rowCount ?? 0) > 0) {
      await koneksi.query('ROLLBACK')
      return { ok: false, tahunAjaran, error: `Tidak dapat memulihkan: nama kelas ${bentrok.rows.map((row) => row.name).join(', ')} sudah dipakai. Hapus atau ganti nama kelas tersebut dulu.` }
    }
    // Tolak bila ada baris XII sumber yang tidak ditemukan.
    const ada = await koneksi.query<{ name: string }>(
      `SELECT name FROM public.adiwiyata_classes WHERE name = ANY($1::text[])`,
      [sumberXII],
    )
    const namaAda = new Set(ada.rows.map((row) => row.name))
    const hilang = sumberXII.filter((nama) => !namaAda.has(nama))
    if (hilang.length > 0) {
      await koneksi.query('ROLLBACK')
      return { ok: false, tahunAjaran, error: `Tidak dapat memulihkan: baris kelas ${hilang.join(', ')} tidak ditemukan.` }
    }
    // Rename kembali XII → XI dalam satu UPDATE CASE (nama sumber dan
    // tujuan tidak bersinggungan, jadi tidak ada rantai rename).
    const klausaKelas: string[] = []
    const paramKelas: unknown[] = []
    sumberXII.forEach((sumber, index) => {
      klausaKelas.push(`WHEN $${index * 2 + 1} THEN $${index * 2 + 2}`)
      paramKelas.push(sumber, targetXI[index])
    })
    paramKelas.push(sumberXII)
    const hasilKelas = await koneksi.query(
      `UPDATE public.adiwiyata_classes SET name = CASE name ${klausaKelas.join(' ')} END
        WHERE school_id = 'SMAN55' AND name = ANY($${paramKelas.length}::text[])`,
      paramKelas,
    )
    if ((hasilKelas.rowCount ?? 0) !== sumberXII.length) {
      await koneksi.query('ROLLBACK')
      return { ok: false, tahunAjaran, error: 'Pemulihan kelas gagal — tidak ada perubahan yang disimpan.' }
    }
    // Kembalikan peran siswa XI lewat transformasi nama kelas: semua
    // peran yang kini di XII-* kembali ke XI-*. Tidak memakai daftar
    // perorangan (tidak ada data murid di cadangan).
    let peranDipulihkan = 0
    if (sumberXII.length > 0) {
      const klausaPeran: string[] = []
      const paramPeran: unknown[] = []
      sumberXII.forEach((sumber, index) => {
        klausaPeran.push(`WHEN $${index * 2 + 1} THEN $${index * 2 + 2}`)
        paramPeran.push(sumber, targetXI[index])
      })
      paramPeran.push(sumberXII)
      const hasilPeran = await koneksi.query(
        `UPDATE public.adiwiyata_user_roles SET class_name = CASE class_name ${klausaPeran.join(' ')} END
          WHERE class_name = ANY($${paramPeran.length}::text[])`,
        paramPeran,
      )
      peranDipulihkan = hasilPeran.rowCount ?? 0
    }
    // Tandai sudah dipulihkan supaya tidak bisa dipulihkan dua kali.
    const ringkasanBaru: RingkasanRollover = {
      ...ringkasan,
      dipulihkan_pada: new Date().toISOString(),
    }
    await koneksi.query(
      `UPDATE public.arsip_tahun_ajaran SET ringkasan = $2::jsonb WHERE tahun_ajaran = $1`,
      [tahunAjaran, JSON.stringify(ringkasanBaru)],
    )
    await koneksi.query('COMMIT')
    return { ok: true, tahunAjaran, kelasDipulihkan: sumberXII.length, peranDipulihkan }
  } catch (error) {
    await koneksi.query('ROLLBACK').catch(() => undefined)
    console.error('[tahun-ajaran] pulihkan cadangan gagal:', error)
    return { ok: false, tahunAjaran, error: 'Pemulihan cadangan gagal dijalankan.' }
  } finally {
    if (milikSendiri) koneksi.release()
  }
}
