// Pergantian tahun ajaran otomatis dengan pengarsipan.
//
// Aturan yang disepakati pengguna:
// - Setiap awal tahun ajaran: X → XI, XI → XII, kelas XII yang lulus
//   DIARSIPKAN (data dan riwayatnya tetap tersimpan, tidak dihapus,
//   hanya tidak aktif lagi).
// - Akun siswa lulusan tetap ada; keterikatan kelasnya berakhir
//   (class_name dikosongkan). Peran (admin/petugas/pengunjung) dan
//   expires_on petugas TIDAK diubah.
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
// berakhir)`, mis. `XII-A (arsip 2026/2027)` — barisnya tetap ada
// (tidak dihapus), tetap bertanda diarsipkan, dan ringkasan mencatat
// pemindahan ini (arsipDipindah). Konsekuensi yang perlu diketahui:
// setoran lama kelas itu tetap tersimpan, tetapi JOIN leaderboard
// sampah untuk periode lama tidak lagi menemukan student_count
// kelas tersebut, sehingga kelas lulusan itu tampil di daftar
// "belum memenuhi syarat" (bukan di peringkat) bila periode lama
// dibuka kembali. Total kg tidak berubah (dihitung dari setoran).

import { pool } from '@/lib/db'
import type { PoolClient } from 'pg'

export type HasilPromosi =
  | { aksi: 'promosi'; baru: string }
  | { aksi: 'arsip' }
  | { aksi: 'lewati' }

export type RenameKelas = { dari: string; ke: string }

export type RencanaRollover = {
  tahunAjaran: string
  tahunAjaranBerakhir: string
  renames: RenameKelas[]
  archives: string[] // nama asli kelas XII yang diarsipkan
  arsipDipindah: RenameKelas[] // baris arsip lama yang dipindah namanya agar tidak bentrok
  dilewati: string[]
}

export type RingkasanRollover = {
  dipromosikan: RenameKelas[]
  diarsipkan: string[]
  arsipDipindah: RenameKelas[]
  dilewati: string[]
  peranDiperbarui: number
  lulusanDiputus: number
  dipaksa: boolean
}

export type PratinjauRollover = RencanaRollover & {
  sudahDijalankan: boolean
  peranDiperbarui: number
  lulusanDiputus: number
}

export type HasilJalankan =
  | { ok: true; tahunAjaran: string; ringkasan: RingkasanRollover }
  | { ok: false; tahunAjaran: string; sudahDijalankan: boolean; error: string }

const POLA_KELAS = /^(XII|XI|X)-(.+)$/
const POLA_LABEL = /^(\d{4})\/(\d{4})$/

// Aturan promosi satu nama kelas (fungsi murni):
// 'X-1' → 'XI-1', 'XI-1' → 'XII-1', 'XII-1' → diarsipkan.
// Nama yang tidak cocok pola `^(XII|XI|X)-...` dikembalikan sebagai
// "dilewati" (tidak disentuh). Urutan alternatif XII dulu penting:
// 'XII-1' tidak boleh tertangkap sebagai X dengan rombel 'II-1'.
export function promosikanNamaKelas(nama: string): HasilPromosi {
  const cocok = POLA_KELAS.exec(nama.trim())
  if (!cocok) return { aksi: 'lewati' }
  const [, tingkat, rombel] = cocok
  if (tingkat === 'X') return { aksi: 'promosi', baru: `XI-${rombel}` }
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

// Menyusun rencana dari daftar kelas (fungsi murni, tanpa tulis).
// `kelas` berisi semua baris adiwiyata_classes (nama + status arsip).
export function rencanakanRollover(
  kelas: { nama: string; diarsipkan: boolean }[],
  tahunAjaran: string,
): RencanaRollover {
  const berakhir = tahunAjaranSebelumnya(tahunAjaran) ?? tahunAjaran
  const renames: RenameKelas[] = []
  const archives: string[] = []
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
    } else {
      dilewati.push(item.nama)
    }
  }
  // Baris arsip lama yang masih memegang nama tujuan promosi harus
  // dipindah (lihat catatan bentrok nama di atas). Nama tujuan yang
  // ditempati baris yang ikut di-rename tahun ini tidak dihitung
  // (rename dua tahap membebaskannya).
  const arsipDipindah: RenameKelas[] = []
  const namaTerpakai = new Set(kelas.map((item) => item.nama))
  for (const rename of renames) {
    if (!namaTerpakai.has(rename.ke) || namaDiubah.has(rename.ke)) continue
    let tujuan = `${rename.ke} (arsip ${berakhir})`
    let urutan = 2
    while (namaTerpakai.has(tujuan)) {
      tujuan = `${rename.ke} (arsip ${berakhir} ${urutan})`
      urutan += 1
    }
    arsipDipindah.push({ dari: rename.ke, ke: tujuan })
    namaTerpakai.add(tujuan)
  }
  return { tahunAjaran, tahunAjaranBerakhir: berakhir, renames, archives, arsipDipindah, dilewati }
}

// Pratinjau tanpa menulis apa pun: rencana + jumlah peran yang akan
// berubah + apakah label tahun ajaran ini sudah pernah dijalankan.
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
  const lulusanDiputus = rencana.archives.reduce((total, nama) => total + (jumlahPerKelas.get(nama) ?? 0), 0)
  const sudahDijalankan = await cekSudahDijalankan(pool, tahunAjaran)
  return { ...rencana, sudahDijalankan, peranDiperbarui, lulusanDiputus }
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
    // 1. Pindahkan baris arsip lama yang menghalangi nama tujuan.
    for (const pindah of rencana.arsipDipindah) {
      await koneksi.query(
        `UPDATE public.adiwiyata_classes SET name = $2 WHERE name = $1 AND school_id = 'SMAN55'`,
        [pindah.dari, pindah.ke],
      )
    }
    // 2. Tandai kelas XII tahun ini sebagai arsip (nama tidak diubah,
    //    kecuali yang baru dipindah pada langkah 1 — pakai nama kini).
    const namaArsipKini = new Map(rencana.arsipDipindah.map((pindah) => [pindah.dari, pindah.ke]))
    const arsipKini = rencana.archives.map((nama) => namaArsipKini.get(nama) ?? nama)
    if (arsipKini.length > 0) {
      await koneksi.query(
        `UPDATE public.adiwiyata_classes SET diarsipkan = true WHERE school_id = 'SMAN55' AND name = ANY($1::text[])`,
        [arsipKini],
      )
    }
    // 3. Rename dua tahap untuk promosi (nama sementara dulu, lalu
    //    nama akhir) supaya tidak bentrok primary key.
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
    // 4. Perbarui peran pengguna. Urutan penting: lulusan diputus
    //    DULU (class_name = NULL), baru rename — supaya peran yang
    //    baru naik ke XII tidak ikut terputus. Rename memakai satu
    //    UPDATE CASE (bukan UPDATE berurutan) agar baris yang baru
    //    saja diganti namanya tidak ikut terganti lagi.
    let lulusanDiputus = 0
    if (rencana.archives.length > 0) {
      const hasil = await koneksi.query(
        `UPDATE public.adiwiyata_user_roles SET class_name = NULL WHERE class_name = ANY($1::text[])`,
        [rencana.archives],
      )
      lulusanDiputus = hasil.rowCount ?? 0
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
