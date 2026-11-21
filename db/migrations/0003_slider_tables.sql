-- Migrasi 0003: tabel slider beranda.
-- Tabel-tabel ini TIDAK ada di db/ pada zip asli, tetapi dipakai
-- Drizzle (lib/db/schema.ts) dan dibuat ulang secara idempotent oleh
-- ensureSliderSchema() (lib/slider/data.ts) setiap kali action slider
-- dijalankan. Migrasi ini adalah sumber kebenaran untuk setup awal;
-- pastikan skema di sini tetap sama dengan ensureSliderSchema().
-- FK slider_images.slide_id ON DELETE CASCADE: menghapus slide ikut
-- menghapus gambarnya (sesuai janji UI admin slider).

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
