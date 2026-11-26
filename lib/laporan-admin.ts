// Admin laporan & saran (panel Kelola Laporan).
// Data di tabel public.laporan (+ foto/komentar/riwayat/notifikasi).
//
// Keputusan rekonstruksi (nilai asli tidak tersisa di repo):
// - PAGE_SIZE = 20.
// - Terlambat: status masih baru/diproses dan dibuat > 72 jam lalu.
// - Petugas hanya melihat laporan yang ditugaskan kepadanya
//   (penanggung_jawab = user.id) dan tidak melihat nama pelapor
//   anonim (sesuai teks panel: "Laporan yang ditugaskan kepada Anda.
//   Identitas pelapor anonim tidak ditampilkan").
// - Sinkronisasi memakai Apps Script action 'sync_laporan' (lihat
//   apps-script/Code.gs) — handler itu sebelumnya tidak ada.
import { del } from '@vercel/blob'
import { pool } from '@/lib/db'
import { KATEGORI, STATUS_LABEL } from '@/lib/laporan'
import { tanggalIsoValid } from '@/lib/hari-sekolah'
import { getAppsScriptConfig } from '@/lib/sheets-config'
import type { PortalUser } from '@/lib/auth/access'

export const STATUS_IDS = ['baru', 'diproses', 'selesai', 'ditolak'] as const
export const PAGE_SIZE = 20
// Laporan baru/diproses yang lebih tua dari ini dianggap terlambat.
export const LATE_HOURS = 72

export type ReportPatch = {
  status?: string
  alasan?: string
  tanggapan?: string
  catatanInternal?: string
  penanggungJawab?: string | null
  saranTerbaik?: boolean
}

export type LaporanFilters = {
  status: string
  kategori: string
  urgensi: string
  tingkat: string
  lokasi: string
  dari: string
  sampai: string
  q: string
  urut: string
  page: number
}

export type LaporanRow = {
  id: string
  nomorTiket: string
  kategori: string
  lokasi: string | null
  judul: string
  urgensi: string
  status: string
  pelapor: string | null
  tingkat: string | null
  penanggungJawab: string | null
  saranTerbaik: boolean
  statusSinkron: string
  dibuatPada: string
  terlambat: boolean
}

export type LaporanSummary = {
  baru: number
  diproses: number
  selesai: number
  ditolak: number
  terlambat: number
  tertunda: number
  rataJamSelesai: number | null
  rataRating: number | null
}

export type LaporanDetail = {
  laporan: {
    id: string
    nomorTiket: string
    kategori: string
    lokasi: string | null
    judul: string
    isi: string
    urgensi: string
    status: string
    pelapor: string | null
    anonim: boolean
    penanggungJawabId: string | null
    penanggungJawab: string | null
    saranTerbaik: boolean
    tanggapan: string | null
    catatanInternal: string | null
    rating: number | null
    dibuatPada: string
    terlambat: boolean
    statusSinkron: string
    sinkronError: string | null
  }
  foto: string[]
  komentar: { dariAdmin: boolean; isi: string; dibuatPada: string }[]
  riwayat: { status: string; catatan: string | null; dibuatPada: string }[]
}

export type LaporanSettings = {
  spreadsheetUrl: string | null
  waAktif: boolean
  waNomor: string | null
}

// Error dengan status HTTP, dibaca errorResponse di lib/laporan-admin-guard.
export function withStatus(message: string, status: number): Error {
  const error = new Error(message) as Error & { status?: number }
  error.status = status
  return error
}

function gradeOfLocation(lokasi: string | null): string | null {
  if (!lokasi) return null
  if (lokasi.startsWith('XII-')) return 'XII'
  if (lokasi.startsWith('XI-')) return 'XI'
  if (lokasi.startsWith('X-')) return 'X'
  return null
}

function isLate(status: string, dibuatPada: string): boolean {
  if (status !== 'baru' && status !== 'diproses') return false
  return Date.now() - new Date(dibuatPada).getTime() > LATE_HOURS * 3_600_000
}

export function parseFilters(params: URLSearchParams): LaporanFilters {
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const urut = params.get('urut') === 'terbaru' ? 'terbaru' : 'urgensi'
  // Tanggal filter harus tanggal kalender yang benar: nilai seperti
  // 'abc' atau '2026-02-30' sebelumnya lolos ke `$?::date` dan membuat
  // query melempar (500). Nilai tidak valid dibuang (dianggap kosong).
  const tanggal = (key: string) => {
    const value = params.get(key) ?? ''
    return tanggalIsoValid(value) ? value : ''
  }
  return {
    status: params.get('status') ?? '',
    kategori: params.get('kategori') ?? '',
    urgensi: params.get('urgensi') ?? '',
    tingkat: params.get('tingkat') ?? '',
    lokasi: params.get('lokasi') ?? '',
    dari: tanggal('dari'),
    sampai: tanggal('sampai'),
    q: params.get('q') ?? '',
    urut,
    page,
  }
}

// WHERE bersama list/export/count. $1 = user.id (petugas), $2.. = filter.
function buildWhere(filters: LaporanFilters, user: PortalUser): { sql: string; params: unknown[] } {
  const conditions: string[] = []
  const params: unknown[] = []
  const add = (sql: string, value: unknown) => {
    params.push(value)
    conditions.push(sql.replace('$?', `$${params.length}`))
  }
  if (user.role === 'petugas') add('l.penanggung_jawab = $?', user.id)
  if (filters.status) add('l.status = $?', filters.status)
  if (filters.kategori) add('l.kategori = $?', filters.kategori)
  if (filters.urgensi) add('l.urgensi = $?', filters.urgensi)
  if (filters.tingkat) add(`(l.lokasi LIKE $? || '-%')`, filters.tingkat)
  if (filters.lokasi) add('l.lokasi = $?', filters.lokasi)
  if (filters.dari) add('l.dibuat_pada >= $?::date', filters.dari)
  if (filters.sampai) add('l.dibuat_pada < ($?::date + interval \'1 day\')', filters.sampai)
  if (filters.q) {
    // Escape wildcard LIKE (% dan _) supaya pencarian '%'
    // tidak cocok dengan semua baris.
    const escaped = filters.q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
    params.push(`%${escaped}%`)
    conditions.push(`(l.nomor_tiket ILIKE $${params.length} ESCAPE '\\' OR l.judul ILIKE $${params.length} ESCAPE '\\' OR l.isi ILIKE $${params.length} ESCAPE '\\' OR l.nama_pelapor ILIKE $${params.length} ESCAPE '\\')`)
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params }
}

type ListRow = {
  id: string
  nomor_tiket: string
  kategori: string
  lokasi: string | null
  judul: string
  urgensi: string
  status: string
  nama_pelapor: string | null
  anonim: boolean
  pj_nama: string | null
  saran_terbaik: boolean
  status_sinkron: string
  dibuat_pada: string
}

const LIST_COLUMNS = `l.id::text AS id, l.nomor_tiket, l.kategori, l.lokasi, l.judul, l.urgensi, l.status,
  l.nama_pelapor, l.anonim, pj.name AS pj_nama, l.saran_terbaik, l.status_sinkron,
  l.dibuat_pada::text AS dibuat_pada`
const LIST_FROM = `FROM public.laporan l LEFT JOIN neon_auth."user" pj ON pj.id::text = l.penanggung_jawab`

function toRow(row: ListRow, user: PortalUser): LaporanRow {
  return {
    id: row.id,
    nomorTiket: row.nomor_tiket,
    kategori: row.kategori,
    lokasi: row.lokasi,
    judul: row.judul,
    urgensi: row.urgensi,
    status: row.status,
    pelapor: row.anonim && user.role !== 'admin' ? null : (row.nama_pelapor ?? null),
    tingkat: gradeOfLocation(row.lokasi),
    penanggungJawab: row.pj_nama,
    saranTerbaik: row.saran_terbaik,
    statusSinkron: row.status_sinkron,
    dibuatPada: row.dibuat_pada,
    terlambat: isLate(row.status, row.dibuat_pada),
  }
}

export async function listReports(
  filters: LaporanFilters,
  user: PortalUser,
): Promise<{ laporan: LaporanRow[]; total: number; pageSize: number }> {
  const { sql, params } = buildWhere(filters, user)
  const order =
    filters.urut === 'terbaru'
      ? 'ORDER BY l.dibuat_pada DESC'
      : `ORDER BY CASE l.urgensi WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 ELSE 2 END, l.dibuat_pada DESC`
  const offset = (filters.page - 1) * PAGE_SIZE
  const [list, count] = await Promise.all([
    pool.query<ListRow>(
      `SELECT ${LIST_COLUMNS} ${LIST_FROM} ${sql} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, PAGE_SIZE, offset],
    ),
    pool.query<{ n: number }>(`SELECT count(*)::int AS n ${LIST_FROM.replace('LEFT JOIN neon_auth."user" pj ON pj.id::text = l.penanggung_jawab', '')} ${sql}`, params),
  ])
  return { laporan: list.rows.map((row) => toRow(row, user)), total: count.rows[0]?.n ?? 0, pageSize: PAGE_SIZE }
}

export async function getSummary(user: PortalUser): Promise<LaporanSummary> {
  const scope = user.role === 'petugas' ? 'WHERE penanggung_jawab = $1' : ''
  const params = user.role === 'petugas' ? [user.id] : []
  const result = await pool.query<{
    baru: string
    diproses: string
    selesai: string
    ditolak: string
    terlambat: string
    tertunda: string
    rata_jam: string | null
    rata_rating: string | null
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'baru')::text AS baru,
       COUNT(*) FILTER (WHERE status = 'diproses')::text AS diproses,
       COUNT(*) FILTER (WHERE status = 'selesai')::text AS selesai,
       COUNT(*) FILTER (WHERE status = 'ditolak')::text AS ditolak,
       COUNT(*) FILTER (WHERE status IN ('baru','diproses') AND dibuat_pada < NOW() - interval '${LATE_HOURS} hours')::text AS terlambat,
       COUNT(*) FILTER (WHERE status_sinkron <> 'tersinkron')::text AS tertunda,
       AVG(EXTRACT(EPOCH FROM (diselesaikan_pada - dibuat_pada)) / 3600) FILTER (WHERE status = 'selesai')::text AS rata_jam,
       AVG(rating)::text AS rata_rating
     FROM public.laporan ${scope}`,
    params,
  )
  const row = result.rows[0]
  return {
    baru: Number(row?.baru ?? 0),
    diproses: Number(row?.diproses ?? 0),
    selesai: Number(row?.selesai ?? 0),
    ditolak: Number(row?.ditolak ?? 0),
    terlambat: Number(row?.terlambat ?? 0),
    tertunda: Number(row?.tertunda ?? 0),
    rataJamSelesai: row?.rata_jam == null ? null : Math.round(Number(row.rata_jam) * 10) / 10,
    rataRating: row?.rata_rating == null ? null : Math.round(Number(row.rata_rating) * 10) / 10,
  }
}

export type StatPoint = { name: string; label?: string; jumlah: number }

export async function getStats(): Promise<{
  kategori: StatPoint[]
  bulan: StatPoint[]
  tingkat: StatPoint[]
  lokasi: StatPoint[]
}> {
  const [kategori, bulan, tingkat, lokasi] = await Promise.all([
    pool.query<{ name: string; jumlah: number }>(
      `SELECT kategori AS name, count(*)::int AS jumlah FROM public.laporan GROUP BY kategori ORDER BY jumlah DESC`,
    ),
    pool.query<{ name: string; jumlah: number }>(
      `SELECT to_char(dibuat_pada, 'YYYY-MM') AS name, count(*)::int AS jumlah
         FROM public.laporan WHERE dibuat_pada >= date_trunc('month', NOW() - interval '11 months')
        GROUP BY 1 ORDER BY 1`,
    ),
    pool.query<{ name: string; jumlah: number }>(
      `SELECT CASE WHEN lokasi LIKE 'XII-%' THEN 'XII' WHEN lokasi LIKE 'XI-%' THEN 'XI' WHEN lokasi LIKE 'X-%' THEN 'X' ELSE 'Lainnya' END AS name,
              count(*)::int AS jumlah FROM public.laporan GROUP BY 1 ORDER BY jumlah DESC`,
    ),
    pool.query<{ name: string; jumlah: number }>(
      `SELECT lokasi AS name, count(*)::int AS jumlah FROM public.laporan WHERE lokasi IS NOT NULL
        GROUP BY lokasi ORDER BY jumlah DESC LIMIT 10`,
    ),
  ])
  const kategoriLabel = new Map<string, string>(KATEGORI.map((item) => [item.id, item.label]))
  return {
    kategori: kategori.rows.map((row) => ({ name: row.name, label: kategoriLabel.get(row.name) ?? row.name, jumlah: row.jumlah })),
    bulan: bulan.rows,
    tingkat: tingkat.rows,
    lokasi: lokasi.rows,
  }
}

export type ExportRow = {
  nomor_tiket: string
  dibuat_pada: string
  kategori: string
  lokasi: string | null
  judul: string
  isi: string
  urgensi: string
  pelapor: string | null
  status: string
  pj: string | null
  tanggapan_admin: string | null
  diselesaikan_pada: string | null
  rating: number | null
}

export async function exportRows(filters: LaporanFilters, user: PortalUser): Promise<ExportRow[]> {
  const { sql, params } = buildWhere(filters, user)
  const result = await pool.query<{
    nomor_tiket: string
    dibuat_pada: string
    kategori: string
    lokasi: string | null
    judul: string
    isi: string
    urgensi: string
    nama_pelapor: string | null
    anonim: boolean
    status: string
    pj: string | null
    tanggapan_admin: string | null
    diselesaikan_pada: string | null
    rating: number | null
  }>(
    `SELECT l.nomor_tiket, l.dibuat_pada::text AS dibuat_pada, l.kategori, l.lokasi, l.judul, l.isi, l.urgensi,
            l.nama_pelapor, l.anonim, l.status, pj.name AS pj,
            l.tanggapan_admin, l.diselesaikan_pada::text AS diselesaikan_pada, l.rating
       ${LIST_FROM} ${sql}
      ORDER BY CASE l.urgensi WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 ELSE 2 END, l.dibuat_pada DESC`,
    params,
  )
  return result.rows.map((row) => ({
    nomor_tiket: row.nomor_tiket,
    dibuat_pada: row.dibuat_pada,
    kategori: row.kategori,
    lokasi: row.lokasi,
    judul: row.judul,
    isi: row.isi,
    urgensi: row.urgensi,
    pelapor: row.anonim && user.role !== 'admin' ? null : (row.nama_pelapor ?? null),
    status: row.status,
    pj: row.pj,
    tanggapan_admin: row.tanggapan_admin,
    diselesaikan_pada: row.diselesaikan_pada,
    rating: row.rating,
  }))
}

export async function getReportDetail(id: string, user: PortalUser): Promise<LaporanDetail | null> {
  if (!/^\d{1,15}$/.test(id)) return null
  const report = await pool.query<{
    id: string
    nomor_tiket: string
    kategori: string
    lokasi: string | null
    judul: string
    isi: string
    urgensi: string
    status: string
    nama_pelapor: string | null
    anonim: boolean
    penanggung_jawab: string | null
    pj_nama: string | null
    saran_terbaik: boolean
    tanggapan_admin: string | null
    catatan_internal: string | null
    rating: number | null
    dibuat_pada: string
    status_sinkron: string
    sinkron_error: string | null
  }>(
    `SELECT l.id::text AS id, l.nomor_tiket, l.kategori, l.lokasi, l.judul, l.isi, l.urgensi, l.status,
            l.nama_pelapor, l.anonim, l.penanggung_jawab, pj.name AS pj_nama, l.saran_terbaik,
            l.tanggapan_admin, l.catatan_internal, l.rating, l.dibuat_pada::text AS dibuat_pada,
            l.status_sinkron, l.sinkron_error
       ${LIST_FROM} WHERE l.id = $1`,
    [id],
  )
  const row = report.rows[0]
  if (!row) return null
  if (user.role === 'petugas' && row.penanggung_jawab !== user.id) return null
  const [photos, comments, history] = await Promise.all([
    pool.query<{ pathname: string }>(`SELECT pathname FROM public.laporan_foto WHERE laporan_id = $1 ORDER BY id`, [id]),
    pool.query<{ dari_admin: boolean; isi: string; dibuat_pada: string }>(
      `SELECT dari_admin AS "dariAdmin", isi, dibuat_pada::text AS "dibuatPada" FROM public.laporan_komentar WHERE laporan_id = $1 ORDER BY id`,
      [id],
    ),
    pool.query<{ status: string; catatan: string | null; dibuat_pada: string }>(
      `SELECT status, catatan, dibuat_pada::text AS "dibuatPada" FROM public.laporan_riwayat_status WHERE laporan_id = $1 ORDER BY id`,
      [id],
    ),
  ])
  // pg mengembalikan kolom dengan alias camelCase persis seperti di atas.
  const komentar = (comments.rows as unknown as { dariAdmin: boolean; isi: string; dibuatPada: string }[]).map((item) => ({
    dariAdmin: item.dariAdmin,
    isi: item.isi,
    dibuatPada: item.dibuatPada,
  }))
  const riwayat = (history.rows as unknown as { status: string; catatan: string | null; dibuatPada: string }[]).map((item) => ({
    status: item.status,
    catatan: item.catatan,
    dibuatPada: item.dibuatPada,
  }))
  return {
    laporan: {
      id: row.id,
      nomorTiket: row.nomor_tiket,
      kategori: row.kategori,
      lokasi: row.lokasi,
      judul: row.judul,
      isi: row.isi,
      urgensi: row.urgensi,
      status: row.status,
      pelapor: row.anonim && user.role !== 'admin' ? null : (row.nama_pelapor ?? null),
      anonim: row.anonim,
      penanggungJawabId: row.penanggung_jawab,
      penanggungJawab: row.pj_nama,
      saranTerbaik: row.saran_terbaik,
      tanggapan: row.tanggapan_admin,
      catatanInternal: row.catatan_internal,
      rating: row.rating,
      dibuatPada: row.dibuat_pada,
      terlambat: isLate(row.status, row.dibuat_pada),
      statusSinkron: row.status_sinkron,
      sinkronError: row.sinkron_error,
    },
    foto: photos.rows.map((photo) => photo.pathname),
    komentar,
    riwayat,
  }
}

export async function updateReports(ids: string[], patch: ReportPatch, user: PortalUser): Promise<string[]> {
  const validIds = [...new Set(ids)].filter((id) => /^\d{1,15}$/.test(id))
  if (!validIds.length) return []
  if (patch.status !== undefined && !(STATUS_IDS as readonly string[]).includes(patch.status)) {
    throw withStatus('Status tidak valid.', 400)
  }
  // B-06: batas panjang teks tanggapan/catatan/alasan (kolom TEXT tanpa batas).
  if (typeof patch.tanggapan === 'string' && patch.tanggapan.length > 2000) {
    throw withStatus('Tanggapan maksimal 2000 karakter.', 400)
  }
  if (typeof patch.catatanInternal === 'string' && patch.catatanInternal.length > 2000) {
    throw withStatus('Catatan internal maksimal 2000 karakter.', 400)
  }
  if (typeof patch.alasan === 'string' && patch.alasan.length > 500) {
    throw withStatus('Alasan maksimal 500 karakter.', 400)
  }
  // B-06: penanggung jawab harus staf yang ada (admin/petugas) — UUID sampah
  // membuat laporan "yatim" yang tidak bisa disentuh petugas mana pun.
  if (patch.penanggungJawab !== undefined && patch.penanggungJawab !== null && patch.penanggungJawab !== '') {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(patch.penanggungJawab)) throw withStatus('Petugas yang dipilih tidak valid.', 400)
    const staff = await listStaff()
    if (!staff.some((member) => member.id === patch.penanggungJawab)) throw withStatus('Petugas yang dipilih tidak valid.', 400)
  }
  if (patch.status === 'ditolak' && (patch.alasan ?? '').trim().length < 5) {
    throw withStatus('Isi alasan penolakan (minimal 5 karakter).', 400)
  }
  const updated: string[] = []
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const id of validIds) {
      const current = await client.query<{
        status: string
        user_id: string
        nomor_tiket: string
        judul: string
        penanggung_jawab: string | null
      }>(
        `SELECT status, user_id, nomor_tiket, judul, penanggung_jawab FROM public.laporan WHERE id = $1 FOR UPDATE`,
        [id],
      )
      const row = current.rows[0]
      if (!row) continue
      if (user.role === 'petugas' && row.penanggung_jawab !== user.id) continue

      const sets: string[] = ['diperbarui_pada = NOW()']
      const params: unknown[] = []
      const set = (sql: string, value: unknown) => {
        params.push(value)
        sets.push(sql.replace('$?', `$${params.length}`))
      }
      let statusChanged = false
      if (patch.status !== undefined && patch.status !== row.status) {
        set('status = $?', patch.status)
        set('diselesaikan_pada = $?', patch.status === 'selesai' ? new Date().toISOString() : null)
        statusChanged = true
      }
      if (patch.tanggapan !== undefined) set('tanggapan_admin = $?', patch.tanggapan)
      if (patch.catatanInternal !== undefined) set('catatan_internal = $?', patch.catatanInternal)
      if (user.role === 'admin' && patch.penanggungJawab !== undefined) set('penanggung_jawab = $?', patch.penanggungJawab)
      if (user.role === 'admin' && patch.saranTerbaik !== undefined) set('saran_terbaik = $?', patch.saranTerbaik)
      // Perubahan apa pun menandai laporan perlu disinkronkan ulang.
      set('status_sinkron = $?', 'tertunda')
      if (sets.length > 2) {
        params.push(id)
        await client.query(`UPDATE public.laporan SET ${sets.join(', ')} WHERE id = $${params.length}`, params)
      }
      if (statusChanged) {
        await client.query(
          `INSERT INTO public.laporan_riwayat_status (laporan_id, status, catatan) VALUES ($1, $2, $3)`,
          [id, patch.status, (patch.alasan ?? '').trim() || null],
        )
        await client.query(
          `INSERT INTO public.notifikasi (user_id, judul, isi, tautan) VALUES ($1, $2, $3, $4)`,
          [
            row.user_id,
            `Status laporan ${row.nomor_tiket} berubah`,
            `Laporan "${row.judul}" kini berstatus ${STATUS_LABEL[patch.status as string] ?? patch.status}.`,
            `/laporan/${id}`,
          ],
        )
      } else if (patch.tanggapan !== undefined && patch.tanggapan.trim()) {
        await client.query(
          `INSERT INTO public.notifikasi (user_id, judul, isi, tautan) VALUES ($1, $2, $3, $4)`,
          [row.user_id, `Tanggapan baru untuk ${row.nomor_tiket}`, `Admin menanggapi laporan "${row.judul}".`, `/laporan/${id}`],
        )
      }
      updated.push(id)
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
  return updated
}

export async function deleteReport(id: string, user: PortalUser): Promise<void> {
  if (!/^\d{1,15}$/.test(id)) throw withStatus('Laporan tidak ditemukan.', 404)
  const photos = await pool.query<{ pathname: string }>(`SELECT pathname FROM public.laporan_foto WHERE laporan_id = $1`, [id])
  const result = await pool.query(`DELETE FROM public.laporan WHERE id = $1`, [id])
  if (!result.rowCount) throw withStatus('Laporan tidak ditemukan.', 404)
  // Hapus blob foto (best-effort; kegagalan di sini tidak membatalkan hapus data).
  for (const photo of photos.rows) {
    await del(photo.pathname).catch(() => undefined)
    await pool.query(`DELETE FROM public.laporan_foto_unggahan WHERE pathname = $1`, [photo.pathname]).catch(() => undefined)
  }
  await pool.query(
    `INSERT INTO public.log_aktivitas (actor_id, aksi, detail) VALUES ($1, 'laporan_hapus', $2::jsonb)`,
    [user.id, JSON.stringify({ laporanId: id })],
  ).catch(() => undefined)
}

// Sinkronisasi laporan tertunda ke Spreadsheet lewat Apps Script.
// Mengembalikan { skipped } bila Apps Script belum dikonfigurasi
// (bukan error) agar halaman admin tidak menampilkan 500.
export async function syncReports(
  origin: string,
  ids?: string[],
): Promise<{ skipped: boolean; failed: boolean; message?: string }> {
  let config: { url: string; token: string }
  try {
    config = await getAppsScriptConfig()
  } catch {
    return { skipped: true, failed: false, message: 'Sinkronisasi dilewati: Apps Script belum dikonfigurasi.' }
  }
  const pending = await pool.query<{
    id: string
    nomor_tiket: string
    kategori: string
    lokasi: string | null
    judul: string
    isi: string
    urgensi: string
    status: string
    nama_pelapor: string | null
    dibuat_pada: string
    diselesaikan_pada: string | null
    rating: number | null
  }>(
    `SELECT id::text AS id, nomor_tiket, kategori, lokasi, judul, isi, urgensi, status, nama_pelapor,
            dibuat_pada::text AS dibuat_pada, diselesaikan_pada::text AS diselesaikan_pada, rating
       FROM public.laporan
      WHERE status_sinkron <> 'tersinkron'
        AND ($1::text[] IS NULL OR id::text = ANY($1))
      ORDER BY dibuat_pada ASC LIMIT 200`,
    [ids && ids.length ? ids : null],
  )
  if (!pending.rows.length) return { skipped: false, failed: false, message: 'Tidak ada laporan tertunda.' }
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'sync_laporan', token: config.token, origin, reports: pending.rows }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || `Apps Script menjawab ${response.status}.`)
    }
    const syncedIds = pending.rows.map((row) => row.id)
    await pool.query(
      `UPDATE public.laporan SET status_sinkron = 'tersinkron', sinkron_percobaan = sinkron_percobaan + 1,
         sinkron_error = NULL WHERE id = ANY($1::bigint[])`,
      [syncedIds],
    )
    return { skipped: false, failed: false, message: `${syncedIds.length} laporan tersinkron ke Spreadsheet.` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghubungi Apps Script.'
    const syncedIds = pending.rows.map((row) => row.id)
    await pool.query(
      `UPDATE public.laporan SET sinkron_percobaan = sinkron_percobaan + 1, sinkron_error = $2
        WHERE id = ANY($1::bigint[])`,
      [syncedIds, message.slice(0, 500)],
    ).catch(() => undefined)
    return { skipped: false, failed: true, message: `Sinkronisasi gagal: ${message}` }
  }
}

export async function getLaporanSettings(): Promise<LaporanSettings> {
  const result = await pool.query<{
    laporan_spreadsheet_url: string | null
    laporan_wa_aktif: boolean
    laporan_wa_nomor: string | null
  }>(
    `SELECT laporan_spreadsheet_url, laporan_wa_aktif, laporan_wa_nomor
       FROM public.adiwiyata_settings WHERE id = 1 LIMIT 1`,
  )
  const row = result.rows[0]
  return {
    spreadsheetUrl: row?.laporan_spreadsheet_url ?? null,
    waAktif: row?.laporan_wa_aktif ?? false,
    waNomor: row?.laporan_wa_nomor ?? null,
  }
}

export async function saveLaporanSettings(input: LaporanSettings): Promise<void> {
  await pool.query(
    `INSERT INTO public.adiwiyata_settings (id, period_start, reset_interval_months, laporan_spreadsheet_url, laporan_wa_aktif, laporan_wa_nomor, updated_at)
       VALUES (1, CURRENT_DATE, 1, $1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET
       laporan_spreadsheet_url = EXCLUDED.laporan_spreadsheet_url,
       laporan_wa_aktif = EXCLUDED.laporan_wa_aktif,
       laporan_wa_nomor = EXCLUDED.laporan_wa_nomor,
       updated_at = NOW()`,
    [input.spreadsheetUrl || null, input.waAktif, input.waNomor || null],
  )
}

// 081234567890 / +62 812-... / 62812... -> '62812...'; null bila invalid.
export function normalizeWaNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '')
  if (digits.startsWith('62')) {
    return digits.length >= 11 && digits.length <= 15 ? digits : null
  }
  if (digits.startsWith('0')) {
    const converted = `62${digits.slice(1)}`
    return converted.length >= 11 && converted.length <= 15 ? converted : null
  }
  return null
}

export function validSpreadsheetUrl(url: string): boolean {
  return /^https:\/\/docs\.google\.com\/spreadsheets\/(?:d\/[^/?#]+\/?.*)?$/.test(url.trim())
}

export async function listStaff(): Promise<{ id: string; name: string; role: string }[]> {
  const result = await pool.query<{ id: string; name: string | null; email: string | null; role: string }>(
    `SELECT u.id::text AS id, u.name, u.email, r.role
       FROM neon_auth."user" u
       JOIN public.adiwiyata_user_roles r ON r.user_id = u.id
      WHERE r.role IN ('admin', 'officer')
      ORDER BY u.name ASC NULLS LAST, u.email ASC`,
  )
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? row.email ?? row.id,
    role: row.role === 'officer' ? 'petugas' : 'admin',
  }))
}
