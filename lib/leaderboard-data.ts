// Leaderboard & pengaturan game.
// Data: game_scores + adiwiyata_deposits + adiwiyata_classes +
// leaderboard_archive, periode aktif dari leaderboard_settings.
//
// PERINGATAN: implementasi ini direkonstruksi dari kontrak call-site
// (route, komponen, migrasi). Rumus yang tidak terbukti aslinya:
// kepatuhan sampah dihitung dari tumbler+lunchbox per siswa,
// tren = perubahan vs periode sebelumnya yang sama panjangnya.
// Lihat PERBAIKAN.md.
import { pool } from '@/lib/db'
import { getPortalUser, type PortalUser } from '@/lib/auth/access'

export const GAME_KEYS = [
  'pilah_sampah',
  'tangkap_sampah',
  'memory_daur_ulang',
  'kuis_adiwiyata',
  'kebun_virtual',
  'lama_terurai',
] as const

export type GameKey = (typeof GAME_KEYS)[number]

export type LeaderboardPayload = {
  tab: string
  state: { reset_berikutnya: string | null; mulai: string }
  rows: Record<string, unknown>[]
  insufficient?: Record<string, unknown>[]
  summary?: { total_kg: number | string; jumlah_kelas: number }
  minimumDays?: number
  currentUserId: string
  currentClass: string | null
  currentRank?: number | null
  period?: string
  metric?: string
  settings?: { tampil_tersedikit: boolean; tampil_terbanyak: boolean; metrik_default: string } | null
}

export type AdminLeaderboardData = {
  settings: Record<string, unknown> | null
  games: Record<string, unknown>[]
  waste: Record<string, unknown> | null
  classes: Record<string, unknown>[]
}

const GRADE_ORDER: Record<string, number> = { X: 0, XI: 1, XII: 2 }

function gradeOf(code: string | null | undefined): string | null {
  if (!code) return null
  if (code.startsWith('XII-')) return 'XII'
  if (code.startsWith('XI-')) return 'XI'
  if (code.startsWith('X-')) return 'X'
  return null
}

function displayName(name: string | null, tampilInisial: boolean, userId: string): string {
  const clean = (name ?? '').trim()
  if (!clean) return 'Pengguna'
  if (!tampilInisial) return clean
  const parts = clean.split(/\s+/).filter(Boolean)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('. ') || 'P'
}

type SettingsRow = {
  mode: string
  hari: number
  tanggal: number
  jam: string
  tanggal_mulai_semester: string | null
  tanggal_akhir_semester: string | null
  cakupan: string
  reset_poin_total: boolean
  reset_lencana: boolean
  hadiah_otomatis: boolean
  reset_berikutnya: string | null
  terakhir_dijalankan: string | null
  game_key: string | null
  period_id: string | null
  period_mulai: string | null
}

async function readSettings(): Promise<SettingsRow | null> {
  const result = await pool.query<SettingsRow>(
    `SELECT s.mode, s.hari, s.tanggal, s.jam::text AS jam,
            s.tanggal_mulai_semester::text AS tanggal_mulai_semester,
            s.tanggal_akhir_semester::text AS tanggal_akhir_semester,
            s.cakupan, s.reset_poin_total, s.reset_lencana, s.hadiah_otomatis,
            s.reset_berikutnya::text AS reset_berikutnya,
            s.terakhir_dijalankan::text AS terakhir_dijalankan,
            s.game_key, s.period_id, p.mulai::text AS period_mulai
       FROM public.leaderboard_settings s
       LEFT JOIN public.leaderboard_periods p ON p.id = s.period_id
      WHERE s.id = true LIMIT 1`,
  )
  return result.rows[0] ?? null
}

async function ensureSettingsAndPeriod(): Promise<{ settings: SettingsRow; periodId: string; periodMulai: string }> {
  await pool.query(`INSERT INTO public.leaderboard_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING`)
  let settings = await readSettings()
  if (!settings?.period_id) {
    await pool.query(
      `INSERT INTO public.leaderboard_periods (status, dibuat_oleh) SELECT 'aktif', 'otomatis'
        WHERE NOT EXISTS (SELECT 1 FROM public.leaderboard_periods WHERE status = 'aktif')`,
    )
    await pool.query(
      `UPDATE public.leaderboard_settings SET period_id = (SELECT id FROM public.leaderboard_periods WHERE status = 'aktif' LIMIT 1)
        WHERE id = true AND period_id IS NULL`,
    )
    settings = await readSettings()
  }
  if (!settings || !settings.period_id) throw new Error('Periode leaderboard belum siap.')
  return { settings, periodId: settings.period_id, periodMulai: settings.period_mulai ?? new Date().toISOString() }
}

type WastePeriod = { from: string; to: string; previousFrom: string; previousTo: string }

function wastePeriodRange(period: string, from?: string, to?: string): WastePeriod {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const addDays = (d: Date, n: number) => {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + n)
    return copy
  }
  let start: Date
  let end: Date = today
  if (period === 'minggu_ini') {
    const day = (today.getDay() + 6) % 7 // Senin = 0
    start = addDays(today, -day)
  } else if (period === 'semester_ini') {
    start = new Date(today.getFullYear(), today.getMonth() < 6 ? 0 : 6, 1)
  } else if (period === '30_hari') {
    start = addDays(today, -29)
  } else if (period === 'custom' && from && to) {
    start = new Date(`${from}T00:00:00Z`)
    end = new Date(`${to}T00:00:00Z`)
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1) // bulan_ini
  }
  const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  return {
    from: iso(start),
    to: iso(end),
    previousFrom: iso(addDays(start, -lengthDays)),
    previousTo: iso(addDays(start, -1)),
  }
}

const WASTE_COLUMNS: Record<string, string> = {
  all: 'organic + inorganic + paper + residual + hazardous',
  organic: 'organic',
  inorganic: 'inorganic',
  paper: 'paper',
  residual: 'residual',
  hazardous: 'hazardous',
}

export async function getLeaderboardPayload(searchParams: URLSearchParams): Promise<LeaderboardPayload> {
  const user = await getPortalUser()
  if (!user) throw new Error('UNAUTHORIZED')
  const tab = ['pengguna', 'kelas', 'game', 'sampah', 'riwayat'].includes(searchParams.get('tab') ?? '')
    ? (searchParams.get('tab') as string)
    : 'pengguna'
  const grade = searchParams.get('grade') ?? 'all'
  const { settings, periodId, periodMulai } = await ensureSettingsAndPeriod()

  const base: LeaderboardPayload = {
    tab,
    state: { reset_berikutnya: settings.reset_berikutnya, mulai: periodMulai },
    rows: [],
    currentUserId: user.id,
    currentClass: user.className,
  }

  if (tab === 'riwayat') {
    const result = await pool.query<{
      papan: string
      peringkat: number
      user_id: string | null
      kode_kelas: string | null
      skor: string | number
      created_at: string
      nama: string | null
      tampil_inisial: boolean | null
    }>(
      `SELECT a.papan, a.peringkat, a.user_id::text, a.kode_kelas, a.skor, a.created_at::text,
              u.name AS nama, r.tampil_inisial
         FROM public.leaderboard_archive a
         LEFT JOIN neon_auth."user" u ON u.id = a.user_id
         LEFT JOIN public.adiwiyata_user_roles r ON r.user_id = a.user_id
        ORDER BY a.created_at DESC, a.papan, a.peringkat ASC
        LIMIT 200`,
    )
    base.rows = result.rows.map((row) => ({
      papan: row.papan,
      peringkat: row.peringkat,
      user_id: row.user_id,
      kode_kelas: row.kode_kelas,
      skor: Number(row.skor ?? 0),
      created_at: row.created_at,
      nama_tampil: row.user_id ? displayName(row.nama, row.tampil_inisial === true, row.user_id) : row.kode_kelas,
      // H-01: nama lengkap hanya untuk baris sendiri / admin. Pengguna lain
      // hanya mendapat nama_tampil (inisial bila tampil_inisial aktif).
      ...(row.user_id === user.id || user.role === 'admin' ? { nama: row.nama } : {}),
    }))
    return base
  }

  if (tab === 'sampah') {
    const period = searchParams.get('period') || 'bulan_ini'
    const metric = searchParams.get('metric') || 'total'
    const type = searchParams.get('type') || 'all'
    const sort = searchParams.get('sort') || 'terbanyak'
    const scope = searchParams.get('scope') || 'angkatan'
    const wasteSettings = await pool.query<{
      metrik_default: string
      min_hari_input: number
      periode_default: string
      tampil_terbanyak: boolean
      tampil_tersedikit: boolean
    }>(`SELECT * FROM public.leaderboard_sampah_settings WHERE id = true LIMIT 1`)
    const waste = wasteSettings.rows[0]
    const minimumDays = waste?.min_hari_input ?? 3
    const range = wastePeriodRange(period, searchParams.get('from') ?? undefined, searchParams.get('to') ?? undefined)
    const column = WASTE_COLUMNS[type] ?? WASTE_COLUMNS.all
    const gradeFilter = scope === 'semua' ? null : grade === 'all' ? 'X' : grade

    const rows = await pool.query<{
      class_name: string
      student_count: number | null
      total_kg: string
      kg_per_siswa: string
      organic: string
      inorganic: string
      paper: string
      residual: string
      hazardous: string
      kepatuhan: string
      days: number
    }>(
      `SELECT d.class_name,
              MAX(c.student_count) AS student_count,
              COALESCE(SUM(${column}), 0)::text AS total_kg,
              CASE WHEN MAX(c.student_count) > 0 THEN (COALESCE(SUM(${column}), 0) / MAX(c.student_count))::text ELSE '0' END AS kg_per_siswa,
              COALESCE(SUM(d.organic), 0)::text AS organic,
              COALESCE(SUM(d.inorganic), 0)::text AS inorganic,
              COALESCE(SUM(d.paper), 0)::text AS paper,
              COALESCE(SUM(d.residual), 0)::text AS residual,
              COALESCE(SUM(d.hazardous), 0)::text AS hazardous,
              COALESCE(AVG(CASE WHEN c.student_count > 0 THEN LEAST(100, (d.tumbler + d.lunchbox) * 100.0 / (2 * c.student_count)) ELSE 0 END), 0)::text AS kepatuhan,
              COUNT(DISTINCT d.date)::int AS days
         FROM public.adiwiyata_deposits d
         LEFT JOIN public.adiwiyata_classes c ON c.name = d.class_name
        WHERE d.date BETWEEN $1::date AND $2::date
          AND ($3::text IS NULL OR d.class_name LIKE $3 || '-%')
        GROUP BY d.class_name`,
      [range.from, range.to, gradeFilter],
    )
    const previous = await pool.query<{ class_name: string; total_kg: string }>(
      `SELECT class_name, COALESCE(SUM(${column}), 0)::text AS total_kg
         FROM public.adiwiyata_deposits
        WHERE date BETWEEN $1::date AND $2::date
        GROUP BY class_name`,
      [range.previousFrom, range.previousTo],
    )
    const previousMap = new Map(previous.rows.map((row) => [row.class_name, Number(row.total_kg ?? 0)]))
    const metricKey = metric === 'per_siswa' ? 'kg_per_siswa' : 'total_kg'
    const mapped = rows.rows.map((row) => {
      const total = Number(row.total_kg ?? 0)
      const prev = previousMap.get(row.class_name) ?? 0
      const tren = prev > 0 ? ((total - prev) / prev) * 100 : null
      return {
        peringkat: 0,
        class_name: row.class_name,
        kode_kelas: row.class_name,
        total_kg: total,
        kg_per_siswa: Number(row.kg_per_siswa ?? 0),
        organic: Number(row.organic ?? 0),
        inorganic: Number(row.inorganic ?? 0),
        paper: Number(row.paper ?? 0),
        residual: Number(row.residual ?? 0),
        hazardous: Number(row.hazardous ?? 0),
        kepatuhan: Number(row.kepatuhan ?? 0),
        days: row.days,
        tren_persen: tren,
        tanpa_jumlah_siswa: row.student_count == null,
      }
    })
    const qualified = mapped.filter((row) => row.days >= minimumDays && !row.tanpa_jumlah_siswa)
    const insufficient = mapped.filter((row) => row.days < minimumDays || row.tanpa_jumlah_siswa)
    qualified.sort((a, b) => {
      const diff = Number(b[metricKey] ?? 0) - Number(a[metricKey] ?? 0)
      return sort === 'tersedikit' ? -diff : diff
    })
    qualified.forEach((row, index) => {
      row.peringkat = index + 1
    })
    base.rows = qualified
    base.insufficient = insufficient.map((row) => ({
      class_name: row.class_name,
      days: row.days,
      tanpa_jumlah_siswa: row.tanpa_jumlah_siswa,
    }))
    base.summary = {
      total_kg: qualified.reduce((sum, row) => sum + row.total_kg, 0),
      jumlah_kelas: qualified.length,
    }
    base.minimumDays = minimumDays
    base.period = period
    base.metric = metric
    base.settings = waste
      ? { tampil_tersedikit: waste.tampil_tersedikit, tampil_terbanyak: waste.tampil_terbanyak, metrik_default: waste.metrik_default }
      : null
    return base
  }

  // Tab pengguna / kelas / game: dari game_scores periode aktif.
  const gameKey = tab === 'game' ? (searchParams.get('game') ?? 'tangkap_sampah') : null
  if (gameKey && !(GAME_KEYS as readonly string[]).includes(gameKey)) {
    throw new Error('Game tidak dikenal.')
  }
  const userRows = await pool.query<{
    user_id: string
    nama: string | null
    kode_kelas: string | null
    tampil_inisial: boolean
    skor: string
  }>(
    `SELECT gs.user_id::text AS user_id, u.name AS nama, r.class_name AS kode_kelas,
            COALESCE(r.tampil_inisial, false) AS tampil_inisial,
            ${gameKey ? 'COALESCE(MAX(gs.skor), 0)' : 'COALESCE(SUM(gs.poin_didapat), 0)'} AS skor
       FROM public.game_scores gs
       JOIN neon_auth."user" u ON u.id = gs.user_id
       JOIN public.adiwiyata_user_roles r ON r.user_id = gs.user_id
      WHERE gs.period_id = $1 AND gs.mencurigakan = false
        AND COALESCE(r.diblokir_leaderboard, false) = false
        AND ($2::text IS NULL OR gs.game_key = $2)
      GROUP BY gs.user_id, u.name, r.class_name, r.tampil_inisial
      ORDER BY ${gameKey ? 'COALESCE(MAX(gs.skor), 0)' : 'COALESCE(SUM(gs.poin_didapat), 0)'} DESC`,
    [periodId, gameKey],
  )
  let rows: Record<string, unknown>[] = userRows.rows
    .filter((row) => !grade || grade === 'all' || gradeOf(row.kode_kelas) === grade)
    .map((row, index) => ({
      peringkat: index + 1,
      user_id: row.user_id,
      // H-01: nama lengkap hanya untuk baris sendiri / admin.
      ...(row.user_id === user.id || user.role === 'admin' ? { nama: row.nama } : {}),
      nama_tampil: displayName(row.nama, row.tampil_inisial, row.user_id),
      kode_kelas: row.kode_kelas,
      skor: Number(row.skor ?? 0),
      lencana: [] as { badge_key: string; nama: string }[],
    }))

  if (tab === 'kelas') {
    const byClass = new Map<string, { total: number; count: number }>()
    for (const row of rows) {
      const code = String(row.kode_kelas ?? '')
      if (!code) continue
      const current = byClass.get(code) ?? { total: 0, count: 0 }
      current.total += Number(row.skor ?? 0)
      current.count += 1
      byClass.set(code, current)
    }
    rows = [...byClass.entries()]
      .map(([code, value]) => ({
        peringkat: 0,
        kode_kelas: code,
        nama_tampil: code,
        nama: code,
        skor: value.count ? value.total / value.count : 0,
        lencana: [] as unknown[],
      }))
      .sort((a, b) => Number(b.skor) - Number(a.skor))
    rows.forEach((row, index) => {
      row.peringkat = index + 1
    })
  } else {
    // Lencana pengguna (opsional — tabel bisa kosong).
    const badgeRows = await pool.query<{ user_id: string; badge_key: string; nama: string }>(
      `SELECT ub.user_id::text AS user_id, b.badge_key, b.nama
         FROM public.user_badges ub JOIN public.badges b ON b.id = ub.badge_id`,
    ).catch(() => ({ rows: [] as { user_id: string; badge_key: string; nama: string }[] }))
    const badgeMap = new Map<string, { badge_key: string; nama: string }[]>()
    for (const badge of badgeRows.rows) {
      if (!badgeMap.has(badge.user_id)) badgeMap.set(badge.user_id, [])
      badgeMap.get(badge.user_id)!.push({ badge_key: badge.badge_key, nama: badge.nama })
    }
    for (const row of rows) {
      row.lencana = badgeMap.get(String(row.user_id)) ?? []
    }
    const own = rows.find((row) => row.user_id === user.id)
    base.currentRank = own ? Number(own.peringkat ?? 0) || null : null
  }
  base.rows = rows
  return base
}

export async function getAdminLeaderboardSettings(): Promise<AdminLeaderboardData> {
  const [settings, games, waste, classes] = await Promise.all([
    pool.query(`SELECT * FROM public.leaderboard_settings WHERE id = true`),
    pool.query(`SELECT game_key, aktif, durasi_detik, tingkat_kesulitan, konfigurasi FROM public.game_settings ORDER BY game_key`),
    pool.query(`SELECT * FROM public.leaderboard_sampah_settings WHERE id = true`),
    pool.query(`SELECT name, student_count FROM public.adiwiyata_classes WHERE school_id = 'SMAN55' ORDER BY name`),
  ])
  return {
    settings: (settings.rows[0] as Record<string, unknown> | undefined) ?? null,
    games: games.rows as Record<string, unknown>[],
    waste: (waste.rows[0] as Record<string, unknown> | undefined) ?? null,
    classes: classes.rows as Record<string, unknown>[],
  }
}

// B-08: error validasi input dibedakan dari error lain (mis. driver pg)
// agar route API bisa mengembalikan pesan validasi ke klien tanpa
// membocorkan pesan error mentah. Subclass dari Error, jadi semua
// pemakaian `throw validationError(...)` yang sudah ada tetap aman.
export class InputValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InputValidationError'
  }
}

function validationError(message: string): InputValidationError {
  return new InputValidationError(message)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function nextResetDate(settings: {
  mode: string
  hari: number
  tanggal: number
  jam: string
  tanggal_mulai_semester: string | null
  tanggal_akhir_semester: string | null
}): Date | null {
  const now = new Date()
  const [hour, minute] = String(settings.jam ?? '00:00')
    .split(':')
    .map((part) => Number(part) || 0)
  const at = (date: Date) => {
    const copy = new Date(date)
    copy.setHours(hour, minute, 0, 0)
    return copy
  }
  if (settings.mode === 'harian') {
    const next = at(new Date(now))
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }
  if (settings.mode === 'mingguan') {
    const targetDay = settings.hari // 0 = Minggu ... 6 = Sabtu
    const next = at(new Date(now))
    let diff = (targetDay - now.getDay() + 7) % 7
    if (diff === 0 && next <= now) diff = 7
    next.setDate(next.getDate() + diff)
    return next
  }
  if (settings.mode === 'bulanan') {
    const next = at(new Date(now.getFullYear(), now.getMonth(), Math.min(28, Math.max(1, settings.tanggal))))
    if (next <= now) next.setMonth(next.getMonth() + 1)
    return next
  }
  if (settings.mode === 'semester' && settings.tanggal_akhir_semester) {
    const end = at(new Date(`${settings.tanggal_akhir_semester}T00:00:00`))
    return end > now ? end : null
  }
  return null // manual / never / khusus: hanya reset manual
}

export async function saveAdminLeaderboardSettings(input: Record<string, unknown>): Promise<void> {
  const mode = String(input.mode ?? 'mingguan')
  if (!['harian', 'mingguan', 'bulanan', 'semester', 'khusus', 'manual', 'never'].includes(mode)) {
    throw validationError('Mode reset tidak valid.')
  }
  const hari = Number(input.hari ?? 1)
  if (!Number.isInteger(hari) || hari < 0 || hari > 6) throw validationError('Hari reset harus 0–6 (0 = Minggu).')
  const tanggal = Number(input.tanggal ?? 1)
  if (!Number.isInteger(tanggal) || tanggal < 1 || tanggal > 31) throw validationError('Tanggal reset harus 1–31.')
  const jam = String(input.jam ?? '00:00')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(jam)) throw validationError('Jam reset harus format HH:MM (00:00–23:59).')
  const cakupan = String(input.cakupan ?? 'semua')
  if (!['semua', 'game', 'kelas_pengguna'].includes(cakupan)) throw validationError('Cakupan reset tidak valid.')
  const gameKey = input.game_key == null ? null : String(input.game_key)
  if (cakupan === 'game' && !(GAME_KEYS as readonly string[]).includes(gameKey ?? '')) {
    throw validationError('Pilih game yang valid untuk cakupan game.')
  }
  const dateOrNull = (value: unknown) => {
    if (value == null || value === '') return null
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    throw validationError('Tanggal semester harus format YYYY-MM-DD.')
  }
  const semesterStart = dateOrNull(input.tanggal_mulai_semester)
  const semesterEnd = dateOrNull(input.tanggal_akhir_semester)

  const gamesInput = asRecord(input.games)
  const parsedGames: { game_key: string; aktif: boolean; durasi_detik: number; tingkat_kesulitan: number; konfigurasi: Record<string, unknown> | null }[] = []
  for (const [key, value] of Object.entries(gamesInput)) {
    if (!(GAME_KEYS as readonly string[]).includes(key)) continue
    const game = asRecord(value)
    const durasi = Number(game.durasi_detik ?? 60)
    if (!Number.isInteger(durasi) || durasi < 15 || durasi > 600) throw validationError(`Durasi game ${key} harus 15–600 detik.`)
    const tingkat = Number(game.tingkat_kesulitan ?? 1)
    if (!Number.isInteger(tingkat) || tingkat < 1 || tingkat > 5) throw validationError(`Tingkat kesulitan ${key} harus 1–5.`)
    let konfigurasi: Record<string, unknown> | null = null
    if (key === 'kuis_adiwiyata') {
      const config = asRecord(game.konfigurasi)
      const jumlahSoal = Number(config.jumlah_soal ?? 10)
      const waktuPerSoal = Number(config.waktu_per_soal ?? 20)
      if (!Number.isInteger(jumlahSoal) || jumlahSoal < 5 || jumlahSoal > 20) throw validationError('Jumlah soal kuis harus 5–20.')
      if (!Number.isInteger(waktuPerSoal) || waktuPerSoal < 5 || waktuPerSoal > 20) throw validationError('Waktu per soal harus 5–20 detik.')
      konfigurasi = { jumlah_soal: jumlahSoal, waktu_per_soal: waktuPerSoal }
    }
    parsedGames.push({
      game_key: key,
      aktif: game.aktif !== false,
      durasi_detik: durasi,
      tingkat_kesulitan: tingkat,
      konfigurasi,
    })
  }

  const wasteInput = asRecord(input.waste)
  const wasteMetric = String(wasteInput.metrik_default ?? 'total')
  if (!['total', 'per_siswa'].includes(wasteMetric)) throw validationError('Metrik sampah tidak valid.')
  const minHari = Number(wasteInput.min_hari_input ?? 3)
  if (!Number.isInteger(minHari) || minHari < 1 || minHari > 31) throw validationError('Minimal hari input harus 1–31.')
  const periodeDefault = String(wasteInput.periode_default ?? 'bulan_ini')
  if (!['bulan_ini', 'minggu_ini', 'semester_ini', '30_hari', 'custom'].includes(periodeDefault)) {
    throw validationError('Periode default sampah tidak valid.')
  }

  const next = nextResetDate({ mode, hari, tanggal, jam, tanggal_mulai_semester: semesterStart, tanggal_akhir_semester: semesterEnd })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO public.leaderboard_settings
         (id, mode, hari, tanggal, jam, tanggal_mulai_semester, tanggal_akhir_semester, cakupan, game_key,
          reset_poin_total, reset_lencana, hadiah_otomatis, reset_berikutnya, updated_at)
       VALUES (true, $1,$2,$3,$4::time,$5::date,$6::date,$7,$8,$9,$10,$11,$12::timestamptz, NOW())
       ON CONFLICT (id) DO UPDATE SET
         mode = EXCLUDED.mode, hari = EXCLUDED.hari, tanggal = EXCLUDED.tanggal, jam = EXCLUDED.jam,
         tanggal_mulai_semester = EXCLUDED.tanggal_mulai_semester, tanggal_akhir_semester = EXCLUDED.tanggal_akhir_semester,
         cakupan = EXCLUDED.cakupan, game_key = EXCLUDED.game_key,
         reset_poin_total = EXCLUDED.reset_poin_total, reset_lencana = EXCLUDED.reset_lencana,
         hadiah_otomatis = EXCLUDED.hadiah_otomatis, reset_berikutnya = EXCLUDED.reset_berikutnya, updated_at = NOW()`,
      [
        mode, hari, tanggal, jam, semesterStart, semesterEnd, cakupan, gameKey,
        input.reset_poin_total === true, input.reset_lencana === true, input.hadiah_otomatis !== false,
        next ? next.toISOString() : null,
      ],
    )
    for (const game of parsedGames) {
      await client.query(
        `INSERT INTO public.game_settings (game_key, aktif, durasi_detik, tingkat_kesulitan, konfigurasi)
           VALUES ($1,$2,$3,$4, COALESCE($5::jsonb, '{}'::jsonb))
         ON CONFLICT (game_key) DO UPDATE SET
           aktif = EXCLUDED.aktif, durasi_detik = EXCLUDED.durasi_detik,
           tingkat_kesulitan = EXCLUDED.tingkat_kesulitan,
           konfigurasi = CASE WHEN $5::jsonb IS NULL THEN public.game_settings.konfigurasi ELSE EXCLUDED.konfigurasi END,
           updated_at = NOW()`,
        [game.game_key, game.aktif, game.durasi_detik, game.tingkat_kesulitan, game.konfigurasi ? JSON.stringify(game.konfigurasi) : null],
      )
    }
    await client.query(
      `INSERT INTO public.leaderboard_sampah_settings (id, metrik_default, min_hari_input, periode_default, tampil_terbanyak, tampil_tersedikit)
         VALUES (true, $1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         metrik_default = EXCLUDED.metrik_default, min_hari_input = EXCLUDED.min_hari_input,
         periode_default = EXCLUDED.periode_default, tampil_terbanyak = EXCLUDED.tampil_terbanyak,
         tampil_tersedikit = EXCLUDED.tampil_tersedikit`,
      [
        wasteMetric, minHari, periodeDefault,
        wasteInput.tampil_terbanyak !== false, wasteInput.tampil_tersedikit !== false,
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

// Mengarsipkan peringkat periode berjalan, membuka periode baru, dan
// (bila diatur) meng-nol-kan total poin / menghapus lencana.
// Mengembalikan true bila reset dijalankan, false bila belum waktunya.
export async function resetLeaderboardIfDue(opts?: { force?: boolean; actorId?: string }): Promise<boolean> {
  const { settings, periodId } = await ensureSettingsAndPeriod()
  const due = opts?.force === true || (settings.reset_berikutnya ? new Date(settings.reset_berikutnya) <= new Date() : false)
  if (!due) return false

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Arsip peringkat pengguna (papan 'pengguna') — top 100 periode ini.
    await client.query(
      `INSERT INTO public.leaderboard_archive (period_id, papan, peringkat, user_id, kode_kelas, skor)
       SELECT $1, 'pengguna', DENSE_RANK() OVER (ORDER BY COALESCE(SUM(poin_didapat), 0) DESC)::int,
              user_id, NULL, COALESCE(SUM(poin_didapat), 0)
         FROM public.game_scores WHERE period_id = $1 AND mencurigakan = false
        GROUP BY user_id
        ORDER BY 3 ASC LIMIT 100`,
      [periodId],
    )
    // Arsip per game.
    for (const key of GAME_KEYS) {
      await client.query(
        `INSERT INTO public.leaderboard_archive (period_id, papan, peringkat, user_id, kode_kelas, skor)
         SELECT $1, $2, DENSE_RANK() OVER (ORDER BY COALESCE(MAX(skor), 0) DESC)::int,
                user_id, NULL, COALESCE(MAX(skor), 0)
           FROM public.game_scores WHERE period_id = $1 AND game_key = $2 AND mencurigakan = false
          GROUP BY user_id ORDER BY 3 ASC LIMIT 100`,
        [periodId, `game:${key}`],
      )
    }
    // Tutup periode lama, buka periode baru.
    await client.query(`UPDATE public.leaderboard_periods SET status = 'arsip', selesai = NOW() WHERE id = $1`, [periodId])
    const created = await client.query<{ id: string }>(
      `INSERT INTO public.leaderboard_periods (status, dibuat_oleh) VALUES ('aktif', $1) RETURNING id`,
      [opts?.actorId ?? 'otomatis'],
    )
    const newPeriodId = created.rows[0]?.id
    if (!newPeriodId) throw new Error('Periode baru gagal dibuat.')
    if (settings.reset_poin_total) {
      await client.query(`UPDATE public.adiwiyata_user_roles SET total_poin = 0, updated_at = NOW()`)
    }
    if (settings.reset_lencana) {
      await client.query(`DELETE FROM public.user_badges`)
    }
    const next = nextResetDate({
      mode: settings.mode,
      hari: settings.hari,
      tanggal: settings.tanggal,
      jam: settings.jam,
      tanggal_mulai_semester: settings.tanggal_mulai_semester,
      tanggal_akhir_semester: settings.tanggal_akhir_semester,
    })
    await client.query(
      `UPDATE public.leaderboard_settings
          SET period_id = $1, terakhir_dijalankan = NOW(), reset_berikutnya = $2::timestamptz, updated_at = NOW()
        WHERE id = true`,
      [newPeriodId, next ? next.toISOString() : null],
    )
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error('[leaderboard-reset]', error)
    return false
  } finally {
    client.release()
  }
}

// Dipakai cron & halaman admin; re-export agar mudah ditemukan.
export type { PortalUser }
