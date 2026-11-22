// Perbaikan skema: menjalankan ulang migrasi gabungan (idempotent) pada
// database yang dipakai aplikasi ini, supaya tabel yang hilang dibuat
// tanpa mengubah tabel atau data yang sudah ada. Dipakai tombol
// "Perbaiki tabel yang hilang" di /admin/diagnostik (khusus Admin).
import { pool } from '@/lib/db'
import { MIGRATION_SQL } from '@/lib/migrations-sql'

// Tabel yang wajib ada — sama dengan daftar di /api/admin/diagnostik
// dan /api/health.
const requiredTables: Record<string, string> = {
  users: 'neon_auth.user', master_kelas: 'adiwiyata_classes', data_sampah: 'adiwiyata_deposits',
  kuis_soal: 'kuis_soal', item_sampah: 'item_sampah', misi_mingguan: 'misi_mingguan', video_edukasi: 'video_edukasi',
  game_settings: 'game_settings', app_settings: 'app_settings', game_sessions: 'game_sessions', game_scores: 'game_scores',
  leaderboard_periods: 'leaderboard_periods', leaderboard_settings: 'leaderboard_settings', laporan: 'laporan', slider_slides: 'slider_slides',
  dokumen: 'adiwiyata_documents', peran_pengguna: 'adiwiyata_user_roles', struktur_petugas: 'struktur_petugas', hari_libur: 'hari_libur', arsip_tahun_ajaran: 'arsip_tahun_ajaran',
}

export type RepairResult = {
  statementsOk: number
  statementsFailed: number
  failures: { statement: string; error: string }[]
  missingTables: string[]
}

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export async function repairDatabase(): Promise<RepairResult> {
  const statements = splitStatements(MIGRATION_SQL)
  const failures: RepairResult['failures'] = []
  let statementsOk = 0
  const client = await pool.connect()
  try {
    for (const statement of statements) {
      try {
        await client.query(statement)
        statementsOk += 1
      } catch (error) {
        failures.push({
          statement: statement.replace(/\s+/g, ' ').slice(0, 80),
          error: error instanceof Error ? error.message : 'Gagal menjalankan pernyataan.',
        })
      }
    }
  } finally {
    client.release()
  }
  const tables = await pool.query<{ table_schema: string; table_name: string }>(
    `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'neon_auth') AND table_type = 'BASE TABLE'`,
  )
  const present = new Set(tables.rows.map((row) => `${row.table_schema}.${row.table_name}`))
  const missingTables = Object.entries(requiredTables)
    .filter(([, qualifiedName]) => !present.has(qualifiedName.includes('.') ? qualifiedName : `public.${qualifiedName}`))
    .map(([label]) => label)
  return { statementsOk, statementsFailed: failures.length, failures: failures.slice(0, 5), missingTables }
}
