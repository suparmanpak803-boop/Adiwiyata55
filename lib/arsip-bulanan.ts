// Ekspor arsip bulanan data setoran sampah ke Excel (.xlsx) — server-only.
//
// File berisi 2 lembar: "Rekap per kelas" dan "Data setoran" (baris mentah
// tiap setoran bulan itu — supaya data aslinya tetap tersimpan, bukan
// hanya rekapnya). Dipakai oleh tombol unduh admin di /admin/diagnostik
// dan endpoint cron /api/cron/arsip-excel (yang dipanggil pekerjaan
// terjadwal pengunggah Drive tiap tanggal 1 untuk bulan sebelumnya).
// Modul ini TIDAK menyentuh Google Drive.
//
// Semua query di sini hanya SELECT — tidak ada data yang diubah.
// Paket `xlsx` hanya dipakai di sisi server (modul ini tidak pernah
// diimpor komponen klien). Modul ini sengaja terpisah dari
// lib/arsip-excel.ts (arsip tahunan) supaya keduanya bisa diubah
// sendiri-sendiri.

import * as XLSX from 'xlsx'
import { pool } from '@/lib/db'
import { getHariLibur, hitungHariSekolah } from '@/lib/hari-sekolah'

const POLA_BULAN = /^(\d{4})-(\d{2})$/

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export type BulanArsip = { tahun: number; bulan: number }

// Uraikan label 'YYYY-MM' menjadi { tahun, bulan } atau null bila
// tidak valid (tahun 2000–2099, bulan 01–12). Dipakai route untuk
// memvalidasi query `?bulan=` SEBELUM menyentuh DB.
export function uraikanBulan(value: unknown): BulanArsip | null {
  if (typeof value !== 'string') return null
  const cocok = POLA_BULAN.exec(value)
  if (!cocok) return null
  const tahun = Number(cocok[1])
  const bulan = Number(cocok[2])
  if (tahun < 2000 || tahun > 2099 || bulan < 1 || bulan > 12) return null
  return { tahun, bulan }
}

export function bulanValid(tahun: unknown, bulan: unknown): tahun is number {
  return (
    typeof tahun === 'number' && Number.isInteger(tahun) && tahun >= 2000 && tahun <= 2099 &&
    typeof bulan === 'number' && Number.isInteger(bulan) && bulan >= 1 && bulan <= 12
  )
}

// Rentang tanggal satu bulan kalender, mis. (2026, 11) → 2026-11-01
// s.d. 2026-11-30; (2024, 2) → 2024-02-29 (tahun kabisat).
export function rentangBulan(tahun: number, bulan: number): { dari: string; sampai: string } | null {
  if (!bulanValid(tahun, bulan)) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  const hariTerakhir = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate()
  return { dari: `${tahun}-${pad(bulan)}-01`, sampai: `${tahun}-${pad(bulan)}-${pad(hariTerakhir)}` }
}

export function namaBulanIndonesia(bulan: number): string {
  return NAMA_BULAN[bulan - 1] ?? ''
}

// Label 'YYYY-MM' untuk satu bulan, mis. (2026, 11) → '2026-11'.
export function labelBulan(tahun: number, bulan: number): string {
  return `${tahun}-${String(bulan).padStart(2, '0')}`
}

// Nama file arsip bulanan, mis. 'Setoran Sampah 2026-11.xlsx'.
export function namaFileArsipBulanan(tahun: number, bulan: number): string {
  return `Setoran Sampah ${labelBulan(tahun, bulan)}.xlsx`
}

export type BarisRekapBulanan = {
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

export type BarisSetoranMentah = {
  tanggal: string
  kelas: string
  organik: number
  anorganik: number
  kertas: number
  residu: number
  b3: number
  totalKg: number
}

export type DataArsipBulanan = {
  tahun: number
  bulan: number
  label: string
  dari: string
  sampai: string
  hariSekolah: number
  rekap: BarisRekapBulanan[]
  setoran: BarisSetoranMentah[]
}

function bulatkan2(nilai: number): number {
  return Math.round(nilai * 100) / 100
}

async function susunRekapBulanan(dari: string, sampai: string): Promise<{ baris: BarisRekapBulanan[]; hariSekolah: number }> {
  const libur = await getHariLibur(dari, sampai)
  const hariSekolah = hitungHariSekolah(dari, sampai, new Set(libur.map((item) => item.tanggal)))
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
    [dari, sampai],
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

async function susunSetoranMentah(dari: string, sampai: string): Promise<BarisSetoranMentah[]> {
  const hasil = await pool.query<{
    tanggal: string
    class_name: string
    organic: string
    inorganic: string
    paper: string
    residual: string
    hazardous: string
  }>(
    `SELECT date::text AS tanggal, class_name,
            COALESCE(organic, 0)::text AS organic,
            COALESCE(inorganic, 0)::text AS inorganic,
            COALESCE(paper, 0)::text AS paper,
            COALESCE(residual, 0)::text AS residual,
            COALESCE(hazardous, 0)::text AS hazardous
       FROM public.adiwiyata_deposits
      WHERE date BETWEEN $1::date AND $2::date
      ORDER BY date ASC, class_name ASC`,
    [dari, sampai],
  )
  return hasil.rows.map((row) => {
    const organik = Number(row.organic ?? 0)
    const anorganik = Number(row.inorganic ?? 0)
    const kertas = Number(row.paper ?? 0)
    const residu = Number(row.residual ?? 0)
    const b3 = Number(row.hazardous ?? 0)
    return {
      tanggal: row.tanggal,
      kelas: row.class_name,
      organik: bulatkan2(organik),
      anorganik: bulatkan2(anorganik),
      kertas: bulatkan2(kertas),
      residu: bulatkan2(residu),
      b3: bulatkan2(b3),
      totalKg: bulatkan2(organik + anorganik + kertas + residu + b3),
    }
  })
}

// Menyusun seluruh data arsip bulanan (hanya SELECT). Melempar Error
// dengan pesan 'BULAN_TIDAK_VALID' bila bulan tidak valid — dan
// validasi ini berjalan SEBELUM query DB apa pun.
export async function susunDataArsipBulanan(tahun: number, bulan: number): Promise<DataArsipBulanan> {
  const rentang = rentangBulan(tahun, bulan)
  if (!rentang) throw new Error('BULAN_TIDAK_VALID')
  const [rekap, setoran] = await Promise.all([
    susunRekapBulanan(rentang.dari, rentang.sampai),
    susunSetoranMentah(rentang.dari, rentang.sampai),
  ])
  return {
    tahun,
    bulan,
    label: labelBulan(tahun, bulan),
    dari: rentang.dari,
    sampai: rentang.sampai,
    hariSekolah: rekap.hariSekolah,
    rekap: rekap.baris,
    setoran,
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
export function bangunWorkbookBulanan(data: DataArsipBulanan): XLSX.WorkBook {
  const buku = XLSX.utils.book_new()
  const namaBulan = `${namaBulanIndonesia(data.bulan)} ${data.tahun}`

  const lembarRekap = buatLembar(
    `Arsip Setoran Sampah ${namaBulan}: Rekap per kelas`,
    `Total setoran ${data.dari} s.d. ${data.sampai}. Hari sekolah efektif: ${data.hariSekolah} hari (Senin–Jumat dikurangi hari libur tercatat).`,
    ['Kelas', 'Organik (kg)', 'Anorganik (kg)', 'Kertas (kg)', 'Residu (kg)', 'B3 (kg)', 'Total (kg)', 'Hari sekolah', 'Rata-rata kg / hari sekolah', 'Hari input'],
    data.rekap.map((row) => [
      row.kelas, row.organik, row.anorganik, row.kertas, row.residu, row.b3,
      row.totalKg, row.hariSekolah, row.rataPerHari ?? '-', row.hariInput,
    ]),
    [14, 14, 15, 12, 12, 10, 12, 12, 24, 11],
  )
  XLSX.utils.book_append_sheet(buku, lembarRekap, 'Rekap per kelas')

  const lembarSetoran = buatLembar(
    `Arsip Setoran Sampah ${namaBulan}: Data setoran`,
    `Baris mentah tiap setoran yang tercatat pada ${namaBulan} (${data.setoran.length} baris).`,
    ['Tanggal', 'Kelas', 'Organik (kg)', 'Anorganik (kg)', 'Kertas (kg)', 'Residu (kg)', 'B3 (kg)', 'Total (kg)'],
    data.setoran.map((row) => [
      row.tanggal, row.kelas, row.organik, row.anorganik, row.kertas, row.residu, row.b3, row.totalKg,
    ]),
    [12, 14, 14, 15, 12, 12, 10, 12],
  )
  XLSX.utils.book_append_sheet(buku, lembarSetoran, 'Data setoran')

  return buku
}

// Membuat file Excel arsip bulanan untuk satu bulan kalender. Melempar
// Error 'BULAN_TIDAK_VALID' bila bulan tidak valid.
export async function buatArsipBulanan(tahun: number, bulan: number): Promise<Buffer> {
  const data = await susunDataArsipBulanan(tahun, bulan)
  const buku = bangunWorkbookBulanan(data)
  const hasil = XLSX.write(buku, { type: 'buffer', bookType: 'xlsx' }) as unknown
  if (!Buffer.isBuffer(hasil)) throw new Error('GAGAL_MEMBUAT_EXCEL')
  return hasil
}
