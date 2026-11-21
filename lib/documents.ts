// Dokumen Adiwiyata (tabel adiwiyata_documents).
import { pool } from '@/lib/db'

export type AdiwiyataDocument = {
  id: string
  title: string
  description: string
  category: string
  url: string
  pathname: string
  fileSize: number
}

export async function getAdiwiyataDocuments(): Promise<AdiwiyataDocument[]> {
  try {
    const result = await pool.query<{
      id: string
      title: string
      description: string | null
      category: string | null
      blob_url: string
      blob_pathname: string
      file_size: string | number
    }>(
      `SELECT id::text, title, description, category, blob_url, blob_pathname, file_size
       FROM public.adiwiyata_documents ORDER BY created_at DESC, title ASC`,
    )
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? '',
      category: row.category ?? 'Umum',
      url: row.blob_url,
      pathname: row.blob_pathname,
      fileSize: Number(row.file_size ?? 0),
    }))
  } catch (error) {
    // Halaman publik (tentang/profil/program/dokumen) tidak boleh mati hanya
    // karena query dokumen gagal (mis. koneksi DB bermasalah): kembalikan
    // daftar kosong agar halaman tetap tampil. Detail error tetap dicatat
    // di log server untuk diagnosis.
    console.error('[adiwiyata-documents]', error)
    return []
  }
}
