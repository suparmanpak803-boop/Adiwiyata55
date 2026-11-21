// Konfigurasi Apps Script (Google Sheets) — dibaca dari
// public.adiwiyata_settings baris id=1 (kolom apps_script_url dan
// sheets_secret_token_encrypted), yang diisi lewat panel Pengaturan
// Sheets (app/actions/sheets-config.ts).
//
// ENKRIPSI TOKEN — PERINGATAN:
// Algoritma enkripsi asli TIDAK tersisa di repo mana pun, begitu pula
// kunci yang dipakai untuk mengenkripsi token yang sudah tersimpan.
// Implementasi di sini memakai AES-256-GCM dengan kunci dari env
// SHEETS_TOKEN_KEY (64 karakter hex = 32 byte). Konsekuensinya:
// token lama yang tersimpan di DB TIDAK bisa didekripsi oleh kode
// ini — admin harus menyimpan ulang token sekali lewat panel
// Pengaturan Sheets. Itu satu-satunya jalan yang aman; tidak ada
// cara memulihkan kunci yang hilang.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { pool } from '@/lib/db'

const ALGORITHM = 'aes-256-gcm'
const TOKEN_KEY_ENV = 'SHEETS_TOKEN_KEY'

function getTokenKey(): Buffer {
  const hex = process.env[TOKEN_KEY_ENV]
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'Kunci enkripsi token Sheets belum dikonfigurasi. Isi SHEETS_TOKEN_KEY (64 karakter hex) di environment, lalu simpan ulang token di Pengaturan Sheets.',
    )
  }
  return Buffer.from(hex, 'hex')
}

// Format: base64(iv 12 byte || authTag 16 byte || ciphertext).
export function encryptSheetsToken(token: string): string {
  const key = getTokenKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptSheetsToken(encrypted: string): string {
  const key = getTokenKey()
  const data = Buffer.from(encrypted, 'base64')
  if (data.length < 28) throw new Error('Token tersimpan tidak valid.')
  const iv = data.subarray(0, 12)
  const tag = data.subarray(12, 28)
  const ciphertext = data.subarray(28)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function validateAppsScriptUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/(?:u\/\d+\/)?macros\/s\/[^/]+\/exec\/?$/.test(url.trim())
}

type SheetsRow = { apps_script_url: string | null; sheets_secret_token_encrypted: string | null }

export async function getAppsScriptConfig(): Promise<{ url: string; token: string }> {
  const result = await pool.query<SheetsRow>(
    `SELECT apps_script_url, sheets_secret_token_encrypted FROM public.adiwiyata_settings WHERE id = 1 LIMIT 1`,
  )
  const row = result.rows[0]
  const url = row?.apps_script_url?.trim() ?? ''
  const encrypted = row?.sheets_secret_token_encrypted?.trim() ?? ''
  if (!url || !encrypted) {
    throw new Error('Integrasi Spreadsheet belum dikonfigurasi. Atur URL dan token Apps Script di Pengaturan Sheets.')
  }
  let token: string
  try {
    token = decryptSheetsToken(encrypted)
  } catch {
    throw new Error('Token Apps Script tersimpan tidak dapat dibaca (kunci enkripsi berubah/hilang). Simpan ulang token di Pengaturan Sheets.')
  }
  if (!token) {
    throw new Error('Integrasi Spreadsheet belum dikonfigurasi. Atur URL dan token Apps Script di Pengaturan Sheets.')
  }
  return { url, token }
}

// Tidak pernah throw karena belum dikonfigurasi (dipanggil tanpa
// try/catch di app/page.tsx). Tetap throw bila DB-nya sendiri error.
export async function getSheetsConfigStatus(): Promise<{ url: string; configured: boolean }> {
  const result = await pool.query<SheetsRow>(
    `SELECT apps_script_url, sheets_secret_token_encrypted FROM public.adiwiyata_settings WHERE id = 1 LIMIT 1`,
  )
  const row = result.rows[0]
  const url = row?.apps_script_url?.trim() ?? ''
  return { url, configured: Boolean(url && row?.sheets_secret_token_encrypted) }
}
