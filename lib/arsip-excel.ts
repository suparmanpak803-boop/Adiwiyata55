// Ekspor arsip tahun ajaran ke Excel (.xlsx) — server-only.
//
// File berisi 3 lembar: "Daftar kelas", "Rekap sampah per kelas", dan
// "Peringkat akhir". Dipakai oleh tombol unduh admin di /admin/diagnostik
// dan endpoint cron /api/cron/arsip-excel (yang dipanggil pekerjaan
// terjadwal pengunggah Drive). Modul ini TIDAK menyentuh Google Drive.
//
// Semua query di sini hanya SELECT — tidak ada data yang diubah.
// Paket `xlsx` hanya dipakai di sisi server (modul ini tidak pernah
// diimpor komponen klien).

import * as XLSX from 'xlsx'
import { pool } from '@/lib/db'
import {
  labelTahunAjaran,
  labelTahunAjaranValid,
  rencanakanRollover,
  type RingkasanRollover,
} from '@/lib/tahun-ajaran'
import { getHariLibur, hitungHariSekolah } from '@/lib/hari-sekolah'

const POLA_LABEL = /^(\d{4})\/(\d{4})$/

// Label tahun ajaran berikutnya, mis. '2026/2027' → '2027/2028'.
export function labelTahunAjaranBerikutnya(label: string): string | null {
  const cocok = POLA_LABEL.exec(label)
  if (!cocok) return null
  const awal = Number(cocok[1])
  const akhir = Number(cocok[2])
  if (akhir !== awal + 1) return null
  return `${akhir}/${akhir + 1}`
}

// Rentang tanggal tahun ajaran: 1 Juli tahun awal s.d. 30 Juni tahun akhir.
export function rentangTahunAjaran(label: string): { dari: string; sampai: string } | null {
  const cocok = POLA_LABEL.exec(label)
  if (!cocok) return null
  const awal = Number(cocok[1])
  const akhir = Number(cocok[2])
  if (akhir !== awal + 1) return null
  return { dari: `${awal}-07-01`, sampai: `${akhir}-06-30` }
}

// Nama file yang aman (garis miring diganti tanda hubung).
export function namaFileArsipExcel(tahunAjaran: string): string {
  const aman = tahunAjaran.replace('/', '-')
  return `Arsip Adiwiyata55 ${aman}.xlsx`
}

export type BarisDaftarKelas = {
  kelas: string
  status: 'Dipromosikan' | 'Diarsipkan' | 'Dilewati'
  keterangan: string
}

export type BarisRekapSampah = {
  kelas: string
  organik: number
  anorganik: number
  kertas: number
  residu: number
  b3: number
  totalKg: number
  hariSekolah: number
  rataPerHari: number | null
  hariInput: number
}

export type BarisPeringkat = {
  peringkat: number
  nama: string
  kelas: string
  skor: number
}

export type DataArsipExcel = {
  tahunAjaran: string
  sumberDaftarKelas: string
  daftarKelas: BarisDaftarKelas[]
  rekapSampah: BarisRekapSampah[]
  hariSekolah: number
  sumberPeringkat: string
  peringkat: BarisPeringkat[]
}

function bulatkan2(nilai: number): number {
  return Math.round(nilai * 100) / 100
}

function adalahRingkasan(nilai: unknown): nilai is RingkasanRollover {
  if (!nilai || typeof nilai !== 'object') return false
  const r = nilai as Record<string, unknown>
  return Array.isArray(r.dipromosikan) && Array.isArray(r.diarsipkan)
}

// Keterangan baris arsip berdasarkan tingkat kelas: XII = lulus,
// X = diarsipkan karena rolling jurusan (siswa diacak ulang ke XI).
function keteranganArsip(nama: string): string {
  if (/^XII-/.test(nama)) return 'Lulus — data dan riwayat tetap tersimpan'
  if (/^X-/.test(nama)) return 'Diarsipkan — siswa diacak ulang ke kelas XI (jurusan/rolling)'
  return 'Diarsipkan — data dan riwayat tetap tersimpan'
}

function barisDariRingkasan(ringkasan: RingkasanRollover): BarisDaftarKelas[] {
  const baris: BarisDaftarKelas[] = []
  for (const item of ringkasan.dipromosikan ?? []) {
    if (typeof item?.dari !== 'string' || typeof item?.ke !== 'string') continue
    baris.push({ kelas: item.dari, status: 'Dipromosikan', keterangan: `Naik menjadi ${item.ke}` })
  }
  for (const nama of ringkasan.diarsipkan ?? []) {
    if (typeof nama !== 'string') continue
    baris.push({ kelas: nama, status: 'Diarsipkan', keterangan: keteranganArsip(nama) })
  }
  for (const item of ringkasan.arsipDipindah ?? []) {
    if (typeof item?.dari !== 'string' || typeof item?.ke !== 'string') continue
    baris.push({ kelas: item.ke, status: 'Diarsipkan', keterangan: `Dipindah namanya (sebelumnya ${item.dari})` })
  }
  for (const nama of ringkasan.dilewati ?? []) {
    if (typeof nama !== 'string') continue
    baris.push({ kelas: nama, status: 'Dilewati', keterangan: 'Tidak cocok pola tingkat kelas' })
  }
  return baris
}

async function bacaRingkasan(tahunAjaran: string): Promise<{ ringkasan: RingkasanRollover; dijalankanPada: string | null } | null> {
  try {
    const hasil = await pool.query<{ ringkasan: unknown; dijalankan_pada: string | null }>(
      `SELECT ringkasan, dijalankan_pada::text AS dijalankan_pada
         FROM public.arsip_tahun_ajaran WHERE tahun_ajaran = $1 LIMIT 1`,
      [tahunAjaran],
    )
    const row = hasil.rows[0]
    if (!row || !adalahRingkasan(row.ringkasan)) return null
    return { ringkasan: row.ringkasan, dijalankanPada: row.dijalankan_pada ? String(row.dijalankan_pada).slice(0, 10) : null }
  } catch {
    return null
  }
}

async function susunDaftarKelas(tahunAjaran: string): Promise<{ baris: BarisDaftarKelas[]; sumber: string }> {
  // 1. Ringkasan rollover dengan label yang diminta.
  const tepat = await bacaRingkasan(tahunAjaran)
  if (tepat) {
    return {
      baris: barisDariRingkasan(tepat.ringkasan),
      sumber: `Ringkasan pergantian tahun ajaran ${tahunAjaran}${tepat.dijalankanPada ? ` (dijalankan ${tepat.dijalankanPada})` : ''}.`,
    }
  }
  // 2. Ringkasan rollover label berikutnya — itulah pergantian yang
  // menutup tahun ajaran yang diminta (mis. baris '2027/2028'
  // mengarsipkan kelas XII tahun ajaran 2026/2027).
  const berikut = labelTahunAjaranBerikutnya(tahunAjaran)
  if (berikut) {
    const penutup = await bacaRingkasan(berikut)
    if (penutup) {
      return {
        baris: barisDariRingkasan(penutup.ringkasan),
        sumber: `Ringkasan pergantian tahun ajaran ${berikut} yang menutup tahun ajaran ${tahunAjaran}${penutup.dijalankanPada ? ` (dijalankan ${penutup.dijalankanPada})` : ''}.`,
      }
    }
  }
  // 3. Belum ada rollover: hitung rencana dari daftar kelas saat ini.
  const kelas = await pool.query<{ name: string; diarsipkan: boolean }>(
    `SELECT name, COALESCE(diarsipkan, false) AS diarsipkan FROM public.adiwiyata_classes WHERE school_id = 'SMAN55' ORDER BY name`,
  )
  const labelRencana = berikut ?? tahunAjaran
  const rencana = rencanakanRollover(
    kelas.rows.map((row) => ({ nama: row.name, diarsipkan: row.diarsipkan })),
    labelRencana,
  )
  const baris: BarisDaftarKelas[] = []
  for (const item of rencana.renames) baris.push({ kelas: item.dari, status: 'Dipromosikan', keterangan: `Naik menjadi ${item.ke}` })
  for (const nama of rencana.archives) baris.push({ kelas: nama, status: 'Diarsipkan', keterangan: keteranganArsip(nama) })
  for (const item of rencana.arsipDipindah) baris.push({ kelas: item.ke, status: 'Diarsipkan', keterangan: `Dipindah namanya (sebelumnya ${item.dari})` })
  for (const nama of rencana.dilewati) baris.push({ kelas: nama, status: 'Dilewati', keterangan: 'Tidak cocok pola tingkat kelas' })
  return {
    baris,
    sumber: 'Rencana pergantian tahun ajaran (rollover belum dijalankan) — dihitung dari daftar kelas saat ini.',
  }
}

async function susunRekapSampah(tahunAjaran: string): Promise<{ baris: BarisRekapSampah[]; hariSekolah: number }> {
  const rentang = rentangTahunAjaran(tahunAjaran)
  if (!rentang) return { baris: [], hariSekolah: 0 }
  const libur = await getHariLibur(rentang.dari, rentang.sampai)
  const hariSekolah = hitungHariSekolah(rentang.dari, rentang.sampai, new Set(libur.map((item) => item.tanggal)))
  const hasil = await pool.query<{
    class_name: string
    organic: string
    inorganic: string
    paper: string
    residual: string
    hazardous: string
    hari_input: number
  }>(
    `SELECT class_name,
            COALESCE(SUM(organic), 0)::text AS organic,
            COALESCE(SUM(inorganic), 0)::text AS inorganic,
            COALESCE(SUM(paper), 0)::text AS paper,
            COALESCE(SUM(residual), 0)::text AS residual,
            COALESCE(SUM(hazardous), 0)::text AS hazardous,
            COUNT(DISTINCT date)::int AS hari_input
       FROM public.adiwiyata_deposits
      WHERE date BETWEEN $1::date AND $2::date
      GROUP BY class_name ORDER BY class_name`,
    [rentang.dari, rentang.sampai],
  )
  const baris = hasil.rows.map((row) => {
    const organik = Number(row.organic ?? 0)
    const anorganik = Number(row.inorganic ?? 0)
    const kertas = Number(row.paper ?? 0)
    const residu = Number(row.residual ?? 0)
    const b3 = Number(row.hazardous ?? 0)
    const totalKg = bulatkan2(organik + anorganik + kertas + residu + b3)
    return {
      kelas: row.class_name,
      organik: bulatkan2(organik),
      anorganik: bulatkan2(anorganik),
      kertas: bulatkan2(kertas),
      residu: bulatkan2(residu),
      b3: bulatkan2(b3),
      totalKg,
      hariSekolah,
      rataPerHari: hariSekolah > 0 ? bulatkan2(totalKg / hariSekolah) : null,
      hariInput: Number(row.hari_input ?? 0),
    }
  })
  return { baris, hariSekolah }
}

async function susunPeringkat(tahunAjaran: string): Promise<{ baris: BarisPeringkat[]; sumber: string }> {
  const rentang = rentangTahunAjaran(tahunAjaran)
  if (rentang) {
    try {
      const periode = await pool.query<{ id: string; selesai: string | null }>(
        `SELECT id, selesai::text AS selesai FROM public.leaderboard_periods
          WHERE status = 'arsip' AND selesai IS NOT NULL
            AND selesai::date BETWEEN $1::date AND $2::date
          ORDER BY selesai DESC LIMIT 1`,
        [rentang.dari, rentang.sampai],
      )
      const idPeriode = periode.rows[0]?.id
      if (idPeriode) {
        const arsip = await pool.query<{ peringkat: number; nama: string | null; kelas: string | null; skor: string | number }>(
          `SELECT a.peringkat, u.name AS nama, r.class_name AS kelas, a.skor
             FROM public.leaderboard_archive a
             LEFT JOIN neon_auth."user" u ON u.id = a.user_id
             LEFT JOIN public.adiwiyata_user_roles r ON r.user_id = a.user_id
            WHERE a.period_id = $1 AND a.papan = 'pengguna'
            ORDER BY a.peringkat ASC LIMIT 100`,
          [idPeriode],
        )
        return {
          baris: arsip.rows.map((row) => ({
            peringkat: Number(row.peringkat ?? 0),
            nama: row.nama ?? '—',
            kelas: row.kelas ?? '—',
            skor: Number(row.skor ?? 0),
          })),
          sumber: `Peringkat akhir dari arsip periode yang berakhir ${String(periode.rows[0]?.selesai ?? '').slice(0, 10)}.`,
        }
      }
    } catch (error) {
      console.error('[arsip-excel] gagal membaca arsip peringkat, memakai peringkat saat ini:', error)
    }
  }
  // Belum ada periode yang diarsipkan: peringkat saat ini (periode aktif).
  try {
    const saatIni = await pool.query<{ peringkat: number; nama: string | null; kelas: string | null; skor: string | number }>(
      `SELECT DENSE_RANK() OVER (ORDER BY COALESCE(SUM(gs.poin_didapat), 0) DESC)::int AS peringkat,
              u.name AS nama, r.class_name AS kelas, COALESCE(SUM(gs.poin_didapat), 0) AS skor
         FROM public.game_scores gs
         JOIN neon_auth."user" u ON u.id = gs.user_id
         JOIN public.adiwiyata_user_roles r ON r.user_id = gs.user_id
         JOIN public.leaderboard_settings s ON s.id = true
        WHERE gs.period_id = s.period_id AND gs.mencurigakan = false
          AND COALESCE(r.diblokir_leaderboard, false) = false
        GROUP BY gs.user_id, u.name, r.class_name
        ORDER BY skor DESC LIMIT 100`,
    )
    return {
      baris: saatIni.rows.map((row) => ({
        peringkat: Number(row.peringkat ?? 0),
        nama: row.nama ?? '—',
        kelas: row.kelas ?? '—',
        skor: Number(row.skor ?? 0),
      })),
      sumber: 'Peringkat saat ini (periode berjalan, belum diarsipkan).',
    }
  } catch (error) {
    console.error('[arsip-excel] gagal membaca peringkat saat ini:', error)
    return { baris: [], sumber: 'Peringkat tidak dapat dimuat.' }
  }
}

// Menyusun seluruh data arsip (hanya SELECT). Melempar Error dengan
// pesan 'LABEL_TIDAK_VALID' bila label tahun ajaran tidak valid.
export async function susunDataArsipExcel(tahunAjaran: string): Promise<DataArsipExcel> {
  if (!labelTahunAjaranValid(tahunAjaran)) throw new Error('LABEL_TIDAK_VALID')
  const [daftar, rekap, peringkat] = await Promise.all([
    susunDaftarKelas(tahunAjaran),
    susunRekapSampah(tahunAjaran),
    susunPeringkat(tahunAjaran),
  ])
  return {
    tahunAjaran,
    sumberDaftarKelas: daftar.sumber,
    daftarKelas: daftar.baris,
    rekapSampah: rekap.baris,
    hariSekolah: rekap.hariSekolah,
    sumberPeringkat: peringkat.sumber,
    peringkat: peringkat.baris,
  }
}

type BarisSel = string | number

function buatLembar(judul: string, catatan: string, kepala: string[], baris: BarisSel[][], lebar: number[]): XLSX.WorkSheet {
  const aoa: BarisSel[][] = [[judul], [catatan], kepala, ...baris]
  const lembar = XLSX.utils.aoa_to_sheet(aoa)
  lembar['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: kepala.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: kepala.length - 1 } },
  ]
  lembar['!cols'] = lebar.map((wch) => ({ wch }))
  return lembar
}

// Membangun workbook dari data polos (fungsi murni — bisa diuji tanpa DB).
export function bangunWorkbookArsip(data: DataArsipExcel): XLSX.WorkBook {
  const buku = XLSX.utils.book_new()

  const lembarKelas = buatLembar(
    `Arsip Adiwiyata55 — Tahun Ajaran ${data.tahunAjaran} — Daftar kelas`,
    data.sumberDaftarKelas,
    ['Kelas', 'Status', 'Keterangan'],
    data.daftarKelas.map((row) => [row.kelas, row.status, row.keterangan]),
    [28, 16, 64],
  )
  XLSX.utils.book_append_sheet(buku, lembarKelas, 'Daftar kelas')

  const lembarRekap = buatLembar(
    `Arsip Adiwiyata55 — Tahun Ajaran ${data.tahunAjaran} — Rekap sampah per kelas`,
    `Total setoran 1 Juli – 30 Juni tahun ajaran. Hari sekolah efektif: ${data.hariSekolah} hari (Senin–Jumat dikurangi hari libur tercatat).`,
    ['Kelas', 'Organik (kg)', 'Anorganik (kg)', 'Kertas (kg)', 'Residu (kg)', 'B3 (kg)', 'Total (kg)', 'Hari sekolah', 'Rata-rata kg / hari sekolah', 'Hari input'],
    data.rekapSampah.map((row) => [
      row.kelas, row.organik, row.anorganik, row.kertas, row.residu, row.b3,
      row.totalKg, row.hariSekolah, row.rataPerHari ?? '—', row.hariInput,
    ]),
    [14, 14, 15, 12, 12, 10, 12, 12, 24, 11],
  )
  XLSX.utils.book_append_sheet(buku, lembarRekap, 'Rekap sampah per kelas')

  const lembarPeringkat = buatLembar(
    `Arsip Adiwiyata55 — Tahun Ajaran ${data.tahunAjaran} — Peringkat akhir`,
    data.sumberPeringkat,
    ['Peringkat', 'Nama', 'Kelas', 'Skor (poin)'],
    data.peringkat.map((row) => [row.peringkat, row.nama, row.kelas, row.skor]),
    [10, 36, 14, 14],
  )
  XLSX.utils.book_append_sheet(buku, lembarPeringkat, 'Peringkat akhir')

  return buku
}

// Membuat file Excel arsip untuk satu tahun ajaran. Melempar Error
// 'LABEL_TIDAK_VALID' bila label tidak cocok pola YYYY/YYYY+1.
export async function buatArsipExcel(tahunAjaran: string): Promise<Buffer> {
  const data = await susunDataArsipExcel(tahunAjaran)
  const buku = bangunWorkbookArsip(data)
  const hasil = XLSX.write(buku, { type: 'buffer', bookType: 'xlsx' }) as unknown
  if (!Buffer.isBuffer(hasil)) throw new Error('GAGAL_MEMBUAT_EXCEL')
  return hasil
}

// Label tahun ajaran berjalan (zona Asia/Jakarta).
export function labelTahunAjaranBerjalan(): string {
  return labelTahunAjaran(new Date())
}
