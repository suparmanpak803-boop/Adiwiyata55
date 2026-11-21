// Slider beranda. Gambar disimpan sebagai bytea di DB (bukan Vercel
// Blob) dan disajikan lewat /api/slider/images/[id].
//
// ensureSliderSchema() membuat keempat tabel slider bila belum ada.
// Ini perlu karena DDL tabel-tabel ini TIDAK ada di db/ pada zip asli
// (ditambahkan juga sebagai migrasi 0003_slider_tables.sql).
// Fungsi ini idempotent dan dipanggil di awal setiap action slider.
import { pool } from '@/lib/db'

export type SliderTransition = 'fade' | 'slide'

export type SliderSettings = {
  intervalDetik: number
  transisi: SliderTransition
  autoplay: boolean
  tampilPanah: boolean
  tampilDots: boolean
}

export type SliderSlide = {
  id: string
  imageUrl: string
  altText: string
  judul: string | null
  deskripsi: string | null
  ctaTeks: string | null
  ctaUrl: string | null
  urutan: number
  aktif: boolean
  tanggalMulai: string | null
  tanggalSelesai: string | null
}

export type SliderPageData = {
  slides: SliderSlide[]
  settings: SliderSettings
}

// Nilai default saat settings belum pernah disimpan.
// (Nilai asli tidak tersisa di repo — ini keputusan rekonstruksi.)
export const DEFAULT_SLIDER_SETTINGS: SliderSettings = {
  intervalDetik: 5,
  transisi: 'fade',
  autoplay: true,
  tampilPanah: true,
  tampilDots: true,
}

export function getSliderToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

export async function ensureSliderSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.slider_slides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      image_url text NOT NULL,
      alt_text text NOT NULL,
      judul text,
      deskripsi text,
      cta_teks text,
      cta_url text,
      urutan bigint NOT NULL DEFAULT 0,
      aktif boolean NOT NULL DEFAULT true,
      tanggal_mulai date,
      tanggal_selesai date,
      dibuat_oleh uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS public.slider_images (
      slide_id uuid PRIMARY KEY REFERENCES public.slider_slides(id) ON DELETE CASCADE,
      image_data bytea NOT NULL,
      image_type text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS public.slider_settings (
      id boolean PRIMARY KEY,
      interval_detik integer NOT NULL DEFAULT 5,
      transisi text NOT NULL DEFAULT 'fade',
      autoplay boolean NOT NULL DEFAULT true,
      tampil_panah boolean NOT NULL DEFAULT true,
      tampil_dots boolean NOT NULL DEFAULT true,
      updated_by uuid NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS public.slider_activity_log (
      id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      actor_id uuid NOT NULL,
      action text NOT NULL,
      slide_id uuid,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
}

type SlideRow = {
  id: string
  image_url: string
  alt_text: string
  judul: string | null
  deskripsi: string | null
  cta_teks: string | null
  cta_url: string | null
  urutan: string | number
  aktif: boolean
  tanggal_mulai: string | null
  tanggal_selesai: string | null
}

function toSlide(row: SlideRow): SliderSlide {
  return {
    id: row.id,
    imageUrl: row.image_url,
    altText: row.alt_text,
    judul: row.judul,
    deskripsi: row.deskripsi,
    ctaTeks: row.cta_teks,
    ctaUrl: row.cta_url,
    urutan: Number(row.urutan ?? 0),
    aktif: row.aktif,
    tanggalMulai: row.tanggal_mulai,
    tanggalSelesai: row.tanggal_selesai,
  }
}

async function readSettings(): Promise<SliderSettings> {
  await ensureSliderSchema()
  const result = await pool.query<{
    interval_detik: number
    transisi: string
    autoplay: boolean
    tampil_panah: boolean
    tampil_dots: boolean
  }>(`SELECT interval_detik, transisi, autoplay, tampil_panah, tampil_dots FROM public.slider_settings WHERE id = true LIMIT 1`)
  const row = result.rows[0]
  if (!row) return { ...DEFAULT_SLIDER_SETTINGS }
  return {
    intervalDetik: row.interval_detik,
    transisi: row.transisi === 'slide' ? 'slide' : 'fade',
    autoplay: row.autoplay,
    tampilPanah: row.tampil_panah,
    tampilDots: row.tampil_dots,
  }
}

// Admin: semua slide, apa pun status/jadwalnya.
export async function getAdminSliderData(): Promise<SliderPageData> {
  await ensureSliderSchema()
  const [slidesResult, settings] = await Promise.all([
    pool.query<SlideRow>(
      `SELECT id::text, image_url, alt_text, judul, deskripsi, cta_teks, cta_url,
              urutan, aktif, tanggal_mulai::text AS tanggal_mulai, tanggal_selesai::text AS tanggal_selesai
         FROM public.slider_slides ORDER BY urutan ASC, created_at ASC`,
    ),
    readSettings(),
  ])
  return { slides: slidesResult.rows.map(toSlide), settings }
}

// Beranda (publik): hanya slide aktif dan di dalam jadwal tampil.
export async function getSliderHomepageData(): Promise<SliderPageData> {
  await ensureSliderSchema()
  const today = getSliderToday()
  const [slidesResult, settings] = await Promise.all([
    pool.query<SlideRow>(
      `SELECT id::text, image_url, alt_text, judul, deskripsi, cta_teks, cta_url,
              urutan, aktif, tanggal_mulai::text AS tanggal_mulai, tanggal_selesai::text AS tanggal_selesai
         FROM public.slider_slides
        WHERE aktif = true
          AND (tanggal_mulai IS NULL OR tanggal_mulai <= $1::date)
          AND (tanggal_selesai IS NULL OR tanggal_selesai >= $1::date)
        ORDER BY urutan ASC, created_at ASC`,
      [today],
    ),
    readSettings(),
  ])
  return { slides: slidesResult.rows.map(toSlide), settings }
}
