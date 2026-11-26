'use server'

import { revalidatePath } from 'next/cache'
import { callAppsScriptRead } from '@/lib/apps-script-client'
import { getPortalUser, requirePortalRole } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'
import { getClassMasterData, getFallbackClassMaster, isActiveClassCode } from '@/lib/class-master'
import { normalizeClassCode } from '@/lib/class-codes'
import { tanggalIsoValid } from '@/lib/hari-sekolah'
import { GENERAL_LOCATIONS } from '@/lib/general-locations'

export type DepositRow = {
  id: string
  date: string
  class_name: string
  student_count: number
  organic: string
  inorganic: string
  residual: string
  hazardous: string
  paper: string
  tumbler: number
  lunchbox: number
  submitter_name: string
  user_id: string
}

export type SpreadsheetSummary = {
  totalsByType: Record<string, number>
  byClass: { className: string; grade: string; entries: number; totalKg: number; compliant: number; compliancePercent: number; tumbler: number; lunchbox: number }[]
  byGrade: { grade: string; totalKg: number; entries: number; compliancePercent: number }[]
  weeklyByGrade: { week: string; grade: string; totalKg: number }[]
  byMonth: Record<string, number>
  totalKg: number
  recordCount: number
  spreadsheetUrl: string
}

export type ClassReportRow = {
  class_name: string
  entries: number
  total_kg: string
  organic: string
  inorganic: string
  residual: string
  hazardous: string
  paper: string
  tumbler: number
  lunchbox: number
}

export type DepositInput = {
  date: string
  className: string
  organic: number
  inorganic: number
  residual: number
  hazardous: number
  paper: number
  tumbler: number
  lunchbox: number
  overwrite?: boolean
}

function todayInJakarta() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

async function validateInput(input: DepositInput) {
  // Tanggal harus tanggal kalender yang benar: '2026-02-30' lolos
  // regex lama lalu gagal di cast `$2::date` saat INSERT.
  if (!tanggalIsoValid(input.date) || input.date > todayInJakarta()) {
    throw new Error('Tanggal tidak valid atau tidak boleh melewati hari ini.')
  }
  const classCode = normalizeClassCode(input.className)
  const location = GENERAL_LOCATIONS.find((item) => item.toLowerCase() === input.className.trim().toLowerCase())
  if (!classCode && !location) throw new Error('Pilih kelas atau lokasi umum yang valid.')
  if (classCode && !(await isActiveClassCode(classCode))) throw new Error('Kode kelas tidak terdaftar atau tidak aktif di Master_Kelas.')
  for (const [label, value] of Object.entries({
    Organik: input.organic,
    Anorganik: input.inorganic,
    Residu: input.residual,
    B3: input.hazardous,
    Kertas: input.paper,
  })) {
    if (!Number.isFinite(value) || value < 0 || value > 500 || Math.round(value * 100) !== value * 100) {
      throw new Error(`Berat ${label} harus 0–500 kg dengan maksimal dua angka desimal.`)
    }
  }
  for (const [label, value] of [['Tumbler', input.tumbler], ['Lunch box', input.lunchbox]] as const) {
    if (!Number.isInteger(value) || value < 0 || value > 100) throw new Error(`Jumlah ${label} tidak valid.`)
  }
  return { ...input, className: classCode || location! }
}

async function getWriter() {
  // Petugas boleh menginput untuk kelas mana pun, jadi penugasan kelas
  // bukan lagi syarat untuk menulis setoran.
  return requirePortalRole(['admin', 'petugas'])
}

async function fetchSheetSummary(user: NonNullable<Awaited<ReturnType<typeof getPortalUser>>>, filters: { from?: string; to?: string; className?: string } = {}) {
  try {
    const className = user.role === 'petugas' ? normalizeClassCode(user.className) || user.className : filters.className
    const result = await callAppsScriptRead<{ success?: boolean; error?: string } & Partial<SpreadsheetSummary>>('summary', {
      className: className ?? undefined,
      from: filters.from,
      to: filters.to,
    })
    if (!result.success) return { summary: null, error: result.error || 'Rekap Spreadsheet belum dapat dimuat.' }
    return { summary: result as SpreadsheetSummary, error: null }
  } catch {
    return { summary: null, error: 'Spreadsheet belum dapat dihubungi. Periksa koneksi atau konfigurasi Apps Script.' }
  }
}

export async function getSheetsReport(filters: { from?: string; to?: string; className?: string }) {
  const user = await getPortalUser()
  if (!user || (user.role !== 'admin' && user.role !== 'petugas' && user.role !== 'pengunjung')) throw new Error('Akses rekap tidak diizinkan.')
  const validFilter = (value?: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (!validFilter(filters.from) || !validFilter(filters.to)) throw new Error('Filter tanggal tidak valid.')
  return fetchSheetSummary(user, filters)
}

export async function getDepositPageData() {
  const user = await getPortalUser()
  if (!user) throw new Error('Silakan masuk kembali.')

  const assignedClass = user.className ? normalizeClassCode(user.className) || user.className : null
  const classFilter = user.role === 'petugas' ? assignedClass : null
  const [masterData, savedClassRows, deposits, report, sheets, totals] = await Promise.all([
    getClassMasterData().catch(() => getFallbackClassMaster()),
    pool.query<{ name: string; student_count: number | null; homeroom_teacher: string; officer_name: string }>(
      `SELECT name, student_count, homeroom_teacher, officer_name FROM public.adiwiyata_classes WHERE school_id = 'SMAN55' ORDER BY name`,
    ),
    user.role === 'admin'
      ? pool.query<DepositRow>(`SELECT id, date::text, class_name, student_count, organic::text, inorganic::text, residual::text, hazardous::text, paper::text, tumbler, lunchbox, submitter_name, user_id FROM public.adiwiyata_deposits ORDER BY date DESC, class_name LIMIT 100`)
      : user.role === 'petugas'
        ? pool.query<DepositRow>(`SELECT id, date::text, class_name, student_count, organic::text, inorganic::text, residual::text, hazardous::text, paper::text, tumbler, lunchbox, submitter_name, user_id FROM public.adiwiyata_deposits WHERE class_name = $1 OR user_id = $2 ORDER BY date DESC LIMIT 100`, [classFilter, user.id])
        : Promise.resolve({ rows: [] as DepositRow[] }),
    user.role === 'pengunjung'
      ? Promise.resolve({ rows: [] as ClassReportRow[] })
      : pool.query<ClassReportRow>(
        `SELECT class_name, COUNT(*)::int AS entries,
           COALESCE(SUM(organic + inorganic + residual + hazardous + paper), 0)::text AS total_kg,
           COALESCE(SUM(organic), 0)::text AS organic, COALESCE(SUM(inorganic), 0)::text AS inorganic,
           COALESCE(SUM(residual), 0)::text AS residual, COALESCE(SUM(hazardous), 0)::text AS hazardous,
           COALESCE(SUM(paper), 0)::text AS paper, COALESCE(SUM(tumbler), 0)::int AS tumbler,
           COALESCE(SUM(lunchbox), 0)::int AS lunchbox
         FROM public.adiwiyata_deposits
         WHERE ($1::text IS NULL OR class_name = $1)
         GROUP BY class_name ORDER BY SUM(organic + inorganic + residual + hazardous + paper) DESC, class_name ASC`,
        [classFilter],
      ),
    fetchSheetSummary(user),
    // Total sekolah (semua peran, tanpa rincian per kelas) untuk angka
    // di hero beranda — alur cerita A: Masalah → Aksi → Bukti.
    pool.query<{ total_kg: string; organic: string; inorganic: string; paper: string; residual: string; hazardous: string; tumbler: number; lunchbox: number }>(
      `SELECT COALESCE(SUM(organic + inorganic + residual + hazardous + paper), 0)::text AS total_kg,
         COALESCE(SUM(organic), 0)::text AS organic, COALESCE(SUM(inorganic), 0)::text AS inorganic,
         COALESCE(SUM(paper), 0)::text AS paper, COALESCE(SUM(residual), 0)::text AS residual,
         COALESCE(SUM(hazardous), 0)::text AS hazardous,
         COALESCE(SUM(tumbler), 0)::int AS tumbler, COALESCE(SUM(lunchbox), 0)::int AS lunchbox
       FROM public.adiwiyata_deposits`,
    ).catch(() => ({ rows: [] as { total_kg: string; organic: string; inorganic: string; paper: string; residual: string; hazardous: string; tumbler: number; lunchbox: number }[] })),
  ])

  const savedClassData = new Map(savedClassRows.rows.map((item) => [item.name, item]))
  const classes = masterData.classes.map((item) => {
    const saved = savedClassData.get(item.code)
    return {
      name: item.code,
      grade: item.grade,
      rombel: item.rombel,
      student_count: saved?.student_count ?? null,
      // L-06: nama wali kelas & petugas hanya untuk admin/petugas — bukan
      // untuk pengunjung (payload ini ikut ke komponen klien).
      homeroom_teacher: user.role === 'pengunjung' ? '' : (saved?.homeroom_teacher || item.homeroomTeacher),
      officer_name: user.role === 'pengunjung' ? '' : (saved?.officer_name || ''),
    }
  })
  return { classes, deposits: deposits.rows, report: report.rows, sheetsSummary: sheets.summary, sheetsError: sheets.error, totals: totals.rows[0] ?? null, role: user.role, className: assignedClass, userId: user.id }
}

export async function saveDeposit(input: DepositInput) {
  const user = await getWriter()
  // M-05/M-07: batas laju penulisan setoran (30/jam per akun).
  if (!(await allowRequest(`setoran:${user.id}`, 30, 3600))) throw new Error('Terlalu banyak penyimpanan setoran. Coba lagi nanti.')
  input = await validateInput(input)
  // M-05: tanggal mundur maksimal 30 hari (tanggal lebih lama hanya
  // lewat admin) agar leaderboard tidak bisa digelembungkan backfill.
  // Batas dihitung dari tanggal Jakarta (bukan UTC): di 00:00–07:00 WIB
  // tanggal UTC masih hari kemarin sehingga batas mundur molor 1 hari.
  if (user.role !== 'admin') {
    const hariIni = new Date(`${todayInJakarta()}T00:00:00Z`)
    hariIni.setUTCDate(hariIni.getUTCDate() - 30)
    if (input.date < hariIni.toISOString().slice(0, 10)) {
      throw new Error('Tanggal setoran maksimal 30 hari ke belakang. Untuk tanggal yang lebih lama, minta admin.')
    }
  }
  // Petugas boleh menginput setoran untuk kelas mana pun (bukan hanya
  // kelas penugasannya) maupun lokasi umum. Kelas yang dipilih tetap
  // divalidasi di validateInput (harus terdaftar dan aktif).
  const isClass = Boolean(normalizeClassCode(input.className))
  const classResult = isClass ? await pool.query<{ student_count: number | null }>(
    `SELECT student_count FROM public.adiwiyata_classes WHERE name = $1 AND school_id = 'SMAN55' LIMIT 1`,
    [input.className],
  ) : { rows: [] as { student_count: number | null }[] }
  const studentCount = classResult.rows[0]?.student_count ?? 0
  if (isClass && !studentCount) throw new Error('Jumlah siswa kelas belum diisi Admin. Setoran tidak dapat disimpan.')
  if (isClass && (input.tumbler > studentCount || input.lunchbox > studentCount)) throw new Error('Jumlah siswa membawa wadah tidak boleh melebihi jumlah siswa kelas.')

  const id = `${input.date}_${input.className}`
  const existing = await pool.query<{ user_id: string }>(`SELECT user_id FROM public.adiwiyata_deposits WHERE id = $1`, [id])
  if (existing.rowCount && !input.overwrite) return { needsConfirmation: true as const }
  // Setoran boleh ditimpa petugas/admin mana pun (kepemilikan jatuh ke
  // penulis terakhir; jejak audit di log_aktivitas mencatat siapa yang
  // menulis). UI sudah meminta konfirmasi sebelum menimpa.

  const saved = await pool.query(
    `INSERT INTO public.adiwiyata_deposits
      (id, date, class_name, student_count, organic, inorganic, residual, hazardous, paper, tumbler, lunchbox, shift, user_id, submitter_name, sync_status, updated_at)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Siang', $12, $13, 'pending', NOW())
     ON CONFLICT (date, class_name) DO UPDATE SET
       student_count = EXCLUDED.student_count, organic = EXCLUDED.organic, inorganic = EXCLUDED.inorganic,
       residual = EXCLUDED.residual, hazardous = EXCLUDED.hazardous, paper = EXCLUDED.paper,
       tumbler = EXCLUDED.tumbler, lunchbox = EXCLUDED.lunchbox, user_id = EXCLUDED.user_id,
       submitter_name = EXCLUDED.submitter_name, sync_status = 'pending', updated_at = NOW()
     RETURNING id`,
    [id, input.date, input.className, studentCount, input.organic, input.inorganic, input.residual, input.hazardous, input.paper, input.tumbler, input.lunchbox, user.id, user.name],
  )
  if (!saved.rowCount) throw new Error('Setoran ini dibuat oleh akun lain. Hubungi Admin untuk menggantinya.')
  // M-05: jejak audit penulisan setoran.
  await pool.query(`INSERT INTO public.log_aktivitas (actor_id, aksi, detail) VALUES ($1, 'setoran_simpan', $2::jsonb)`, [user.id, JSON.stringify({ date: input.date, className: input.className })]).catch(() => undefined)
  revalidatePath('/')
  return { needsConfirmation: false as const }
}

export async function saveClass(input: { name: string; studentCount: number | null; homeroomTeacher: string; officerName: string }) {
  const actor = await requirePortalRole(['admin'])
  // M-07: batas laju perubahan data kelas.
  if (!(await allowRequest(`kelas:${actor.id}`, 30, 3600))) {
    return { success: false, error: 'Terlalu banyak perubahan data kelas. Coba lagi nanti.' }
  }
  const className = normalizeClassCode(input.name)
  const master = await getClassMasterData().catch(() => getFallbackClassMaster())
  if (!className || !master.classes.some((item) => item.active && item.code === className)) {
    return { success: false, error: 'Kelas harus terdaftar dan aktif di Master_Kelas.' }
  }
  if (input.studentCount !== null && (!Number.isInteger(input.studentCount) || input.studentCount < 1 || input.studentCount > 100)) {
    return { success: false, error: 'Jumlah siswa harus bilangan bulat 1–100 atau dikosongkan.' }
  }
  const homeroomTeacher = input.homeroomTeacher.trim().slice(0, 100)
  const officerName = input.officerName.trim().slice(0, 100)
  try {
    await pool.query(
      `INSERT INTO public.adiwiyata_classes (name, student_count, homeroom_teacher, officer_name, school_id)
       VALUES ($1, $2, $3, $4, 'SMAN55')
       ON CONFLICT (name) DO UPDATE SET student_count = EXCLUDED.student_count,
         homeroom_teacher = EXCLUDED.homeroom_teacher, officer_name = EXCLUDED.officer_name`,
      [className, input.studentCount, homeroomTeacher, officerName],
    )
    revalidatePath('/')
    return { success: true as const }
  } catch {
    return { success: false as const, error: 'Data kelas gagal disimpan. Coba lagi beberapa saat.' }
  }
}

export async function deleteDeposit(id: string) {
  const user = await getWriter()
  if (!/^\d{4}-\d{2}-\d{2}_(?:(?:X|XI|XII)-[A-Z]|Kantin|Halaman|Lab|Perpustakaan|Taman)$/.test(id)) throw new Error('Setoran tidak ditemukan.')
  // M-07: batas laju penghapusan setoran (30/jam per akun).
  if (!(await allowRequest(`setoran-hapus:${user.id}`, 30, 3600))) throw new Error('Terlalu banyak penghapusan setoran. Coba lagi nanti.')
  const target = await pool.query<{ class_name: string; user_id: string }>(`SELECT class_name, user_id FROM public.adiwiyata_deposits WHERE id = $1`, [id])
  if (!target.rowCount) throw new Error('Setoran tidak ditemukan.')
  const row = target.rows[0]
  const isGeneralLocation = GENERAL_LOCATIONS.includes(row.class_name as (typeof GENERAL_LOCATIONS)[number])
  // Lokasi umum boleh dihapus petugas mana pun; setoran kelas hanya
  // pemiliknya (atau admin). Pemilik dinilai dari user_id, bukan kelas
  // penugasan — petugas kini bisa menginput untuk kelas mana pun, jadi
  // setoran miliknya bisa untuk kelas lain.
  if (user.role !== 'admin' && !isGeneralLocation && row.user_id !== user.id) {
    throw new Error('Setoran tidak ditemukan atau tidak dapat dihapus oleh akun ini.')
  }
  await pool.query(`DELETE FROM public.adiwiyata_deposits WHERE id = $1`, [id])
  await pool.query(`INSERT INTO public.log_aktivitas (actor_id, aksi, detail) VALUES ($1, 'setoran_hapus', $2::jsonb)`, [user.id, JSON.stringify({ id })]).catch(() => undefined)
  revalidatePath('/')
  return { success: true }
}
