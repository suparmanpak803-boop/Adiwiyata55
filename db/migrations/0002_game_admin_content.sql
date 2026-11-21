CREATE TABLE IF NOT EXISTS public.kuis_soal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pertanyaan text NOT NULL,
  opsi_a text NOT NULL,
  opsi_b text NOT NULL,
  opsi_c text NOT NULL,
  opsi_d text NOT NULL,
  jawaban text NOT NULL CHECK (jawaban IN ('a', 'b', 'c', 'd')),
  penjelasan text NOT NULL DEFAULT '',
  kategori text NOT NULL DEFAULT 'Umum',
  tingkat_kesulitan text NOT NULL DEFAULT 'mudah' CHECK (tingkat_kesulitan IN ('mudah', 'sedang', 'sulit')),
  link_video text,
  aktif boolean NOT NULL DEFAULT true,
  dibuat_oleh uuid,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS kuis_soal_pertanyaan_unik_idx ON public.kuis_soal (lower(pertanyaan));
CREATE INDEX IF NOT EXISTS kuis_soal_aktif_kategori_idx ON public.kuis_soal (aktif, kategori);
CREATE INDEX IF NOT EXISTS kuis_soal_kesulitan_idx ON public.kuis_soal (tingkat_kesulitan);

CREATE TABLE IF NOT EXISTS public.item_sampah (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  emoji text NOT NULL DEFAULT '♻️',
  gambar_url text,
  jenis text NOT NULL CHECK (jenis IN ('organik', 'anorganik', 'kertas', 'residu', 'b3')),
  penjelasan text NOT NULL DEFAULT '',
  tingkat_kesulitan text NOT NULL DEFAULT 'mudah' CHECK (tingkat_kesulitan IN ('mudah', 'sedang', 'sulit')),
  aktif boolean NOT NULL DEFAULT true,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS item_sampah_nama_unik_idx ON public.item_sampah (lower(nama));
CREATE INDEX IF NOT EXISTS item_sampah_aktif_jenis_idx ON public.item_sampah (aktif, jenis);

CREATE TABLE IF NOT EXISTS public.misi_mingguan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  deskripsi text NOT NULL DEFAULT '',
  poin integer NOT NULL DEFAULT 0 CHECK (poin BETWEEN 0 AND 10000),
  mulai timestamptz NOT NULL,
  selesai timestamptz NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  dibuat_oleh uuid,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now(),
  CHECK (selesai >= mulai)
);
CREATE INDEX IF NOT EXISTS misi_mingguan_aktif_periode_idx ON public.misi_mingguan (aktif, mulai, selesai);

CREATE TABLE IF NOT EXISTS public.video_edukasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  youtube_url text NOT NULL,
  youtube_id text NOT NULL UNIQUE,
  kategori text NOT NULL DEFAULT 'Adiwiyata',
  deskripsi text NOT NULL DEFAULT '',
  durasi text NOT NULL DEFAULT '',
  tampil boolean NOT NULL DEFAULT true,
  urutan integer NOT NULL DEFAULT 0,
  dibuat_oleh uuid,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS video_edukasi_tampil_urutan_idx ON public.video_edukasi (tampil, urutan);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  diubah_oleh uuid,
  diubah_pada timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_settings ADD COLUMN IF NOT EXISTS konfigurasi jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.game_settings ADD COLUMN IF NOT EXISTS diubah_pada timestamptz NOT NULL DEFAULT now();
