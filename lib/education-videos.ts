// Video edukasi YouTube.
// Sumber baca ganda (redundansi di DB, sengaja dipertahankan seperti
// kode aslinya):
//   1. Tabel utama adiwiyata_education_videos (kolom is_enabled, display_order).
//   2. Tabel mirror adiwiyata_video_display_settings — bila ada baris di
//      sini, nilainya MENANG atas kolom utama (ditulis terakhir oleh
//      saveEducationVideoSettings). Bila tidak ada, pakai kolom utama.
// Fungsi mengembalikan error (bukan throw) sesuai kontrak call-site.
import { pool } from '@/lib/db'
import { allowedVideoCategories } from '@/lib/education-video-categories'

export type EducationVideo = {
  videoId: string
  youtubeUrl: string
  title: string
  category: string
  description: string
  duration: string
  publishedAt: string | null
  order: number
  displayOrder: number
  enabled: boolean
}

export function getYouTubeId(url: string): string {
  if (typeof url !== 'string') return ''
  const match = url.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : ''
}

type VideoRow = {
  video_id: string
  youtube_url: string
  title: string
  category: string
  description: string | null
  duration: string | null
  published_at: string | null
  display_order: number
  is_enabled: boolean
  setting_enabled: boolean | null
  setting_order: number | null
}

async function fetchVideos(): Promise<EducationVideo[]> {
  const result = await pool.query<VideoRow>(
    `SELECT v.video_id, v.youtube_url, v.title, v.category, v.description, v.duration,
            v.published_at::text AS published_at, v.display_order, v.is_enabled,
            s.is_enabled AS setting_enabled, s.display_order AS setting_order
       FROM public.adiwiyata_education_videos v
       LEFT JOIN public.adiwiyata_video_display_settings s ON s.video_id = v.video_id
       ORDER BY COALESCE(s.display_order, v.display_order) ASC, v.title ASC`,
  )
  return result.rows.map((row) => ({
    videoId: row.video_id,
    youtubeUrl: row.youtube_url,
    title: row.title,
    category: row.category,
    description: row.description ?? '',
    duration: row.duration ?? '',
    publishedAt: row.published_at,
    order: row.setting_order ?? row.display_order,
    displayOrder: row.setting_order ?? row.display_order,
    enabled: row.setting_enabled ?? row.is_enabled,
  }))
}

export async function getEducationVideos(): Promise<{ videos: EducationVideo[]; error: string | null }> {
  try {
    const videos = (await fetchVideos()).filter((video) => video.enabled)
    return { videos, error: null }
  } catch (error) {
    console.error('[education-videos]', error)
    return { videos: [], error: 'Video edukasi belum dapat dimuat.' }
  }
}

export async function getEducationVideoAdminList(): Promise<{ videos: EducationVideo[]; error: string | null }> {
  try {
    const videos = await fetchVideos()
    return { videos, error: null }
  } catch (error) {
    console.error('[education-videos admin]', error)
    return { videos: [], error: 'Daftar video belum dapat dimuat.' }
  }
}

// Kategori yang dipakai di tempat lain (filter publik memakai
// lib/education-video-categories; diekspor ulang di sini agar mudah ditemukan).
export { allowedVideoCategories }
