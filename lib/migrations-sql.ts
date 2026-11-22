// Dibuat otomatis dari db/semua-migrasi.sql (472 baris) — jangan edit manual.
// Dipakai tombol "Perbaiki tabel yang hilang" di /admin/diagnostik untuk
// menjalankan ulang migrasi idempotent pada database yang dipakai aplikasi.
// Isi file ini harus selalu sama dengan db/semua-migrasi.sql.
export const MIGRATION_SQL = `-- ================================================================
-- Adiwiyata 55 — SEMUA MIGRASI DALAM SATU FILE
-- Dibuat otomatis dari 7 file migrasi, urutan sesuai db/README.md.
-- Cara pakai: buka SQL Editor di Neon Console, tempel seluruh isi
-- file ini, lalu klik Run. Aman dijalankan ulang (idempotent).
-- ================================================================

-- ---------- migrations/0001_game_leaderboard.sql ----------
-- Tahap 1: fondasi data Adiwiyata + game + leaderboard.
-- Idempotent: aman dijalankan ulang. Tidak mengubah data lama.

CREATE TABLE IF NOT EXISTS public.adiwiyata_settings (
  id integer PRIMARY KEY,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  reset_interval_months integer NOT NULL DEFAULT 1,
  apps_script_url text,
  sheets_secret_token_encrypted text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- student_count = jumlah_siswa kelas (diisi lewat menu kelas Admin)
CREATE TABLE IF NOT EXISTS public.adiwiyata_classes (
  name text PRIMARY KEY,
  school_id text NOT NULL DEFAULT 'SMAN55',
  student_count integer CHECK (student_count IS NULL OR student_count BETWEEN 1 AND 100),
  homeroom_teacher text NOT NULL DEFAULT '',
  officer_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.adiwiyata_user_roles (
  user_id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'visitor' CHECK (role IN ('admin', 'officer', 'visitor')),
  class_name text,
  total_poin integer NOT NULL DEFAULT 0,
  tampil_inisial boolean NOT NULL DEFAULT false,
  diblokir_leaderboard boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adiwiyata_user_roles ADD COLUMN IF NOT EXISTS total_poin integer NOT NULL DEFAULT 0;
ALTER TABLE public.adiwiyata_user_roles ADD COLUMN IF NOT EXISTS tampil_inisial boolean NOT NULL DEFAULT false;
ALTER TABLE public.adiwiyata_user_roles ADD COLUMN IF NOT EXISTS diblokir_leaderboard boolean NOT NULL DEFAULT false;
ALTER TABLE public.adiwiyata_user_roles ADD COLUMN IF NOT EXISTS expires_on date;

-- Kolom paper (Kertas) dan residual (Residu) sudah menjadi kolom numerik terpisah.
CREATE TABLE IF NOT EXISTS public.adiwiyata_deposits (
  id text PRIMARY KEY,
  date date NOT NULL,
  class_name text NOT NULL,
  student_count integer,
  organic numeric(8,2) NOT NULL DEFAULT 0,
  inorganic numeric(8,2) NOT NULL DEFAULT 0,
  paper numeric(8,2) NOT NULL DEFAULT 0,
  residual numeric(8,2) NOT NULL DEFAULT 0,
  hazardous numeric(8,2) NOT NULL DEFAULT 0,
  tumbler integer NOT NULL DEFAULT 0,
  lunchbox integer NOT NULL DEFAULT 0,
  shift text NOT NULL DEFAULT 'Siang',
  user_id uuid NOT NULL,
  submitter_name text NOT NULL DEFAULT '',
  sync_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, class_name)
);
ALTER TABLE public.adiwiyata_deposits ADD COLUMN IF NOT EXISTS paper numeric(8,2) NOT NULL DEFAULT 0;
ALTER TABLE public.adiwiyata_deposits ADD COLUMN IF NOT EXISTS residual numeric(8,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS adiwiyata_deposits_kelas_tanggal_idx ON public.adiwiyata_deposits (class_name, date);
CREATE INDEX IF NOT EXISTS adiwiyata_deposits_tanggal_idx ON public.adiwiyata_deposits (date);

CREATE TABLE IF NOT EXISTS public.adiwiyata_video_display_settings (
  video_id text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.adiwiyata_education_videos (
  video_id text PRIMARY KEY,
  title text NOT NULL,
  youtube_url text NOT NULL,
  category text NOT NULL DEFAULT 'Pemilahan Sampah',
  description text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  published_at date,
  display_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Log aktivitas umum
CREATE TABLE IF NOT EXISTS public.log_aktivitas (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  aksi text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS log_aktivitas_waktu_idx ON public.log_aktivitas (dibuat_pada DESC);

-- Rate limit ringan berbasis database (serverless-friendly)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  kunci text NOT NULL,
  jendela timestamptz NOT NULL,
  jumlah integer NOT NULL DEFAULT 1,
  PRIMARY KEY (kunci, jendela)
);

-- Leaderboard & game
CREATE TABLE IF NOT EXISTS public.leaderboard_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mulai timestamptz NOT NULL DEFAULT now(),
  selesai timestamptz,
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'arsip')),
  dibuat_oleh text NOT NULL DEFAULT 'otomatis',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_periods_satu_aktif_idx ON public.leaderboard_periods (status) WHERE status = 'aktif';

CREATE TABLE IF NOT EXISTS public.leaderboard_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  mode text NOT NULL DEFAULT 'mingguan',
  hari smallint NOT NULL DEFAULT 1,
  tanggal smallint NOT NULL DEFAULT 1,
  jam time NOT NULL DEFAULT '00:00',
  tanggal_mulai_semester date,
  tanggal_akhir_semester date,
  cakupan text NOT NULL DEFAULT 'semua',
  reset_poin_total boolean NOT NULL DEFAULT false,
  reset_lencana boolean NOT NULL DEFAULT false,
  hadiah_otomatis boolean NOT NULL DEFAULT true,
  reset_berikutnya timestamptz,
  terakhir_dijalankan timestamptz,
  game_key text,
  period_id uuid REFERENCES public.leaderboard_periods(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_settings (
  game_key text PRIMARY KEY,
  aktif boolean NOT NULL DEFAULT true,
  durasi_detik integer NOT NULL DEFAULT 60,
  tingkat_kesulitan integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_key text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  dimulai_pada timestamptz NOT NULL DEFAULT now(),
  kedaluwarsa_pada timestamptz NOT NULL,
  dipakai boolean NOT NULL DEFAULT false,
  log_aksi jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS game_sessions_user_idx ON public.game_sessions (user_id, dimulai_pada DESC);

CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_key text NOT NULL,
  skor integer NOT NULL DEFAULT 0,
  poin_didapat integer NOT NULL DEFAULT 0,
  durasi_detik integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  period_id uuid REFERENCES public.leaderboard_periods(id),
  mencurigakan boolean NOT NULL DEFAULT false,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_scores_period_game_user_idx ON public.game_scores (period_id, game_key, user_id);
CREATE INDEX IF NOT EXISTS game_scores_period_skor_idx ON public.game_scores (period_id, skor DESC);

CREATE TABLE IF NOT EXISTS public.leaderboard_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.leaderboard_periods(id),
  papan text NOT NULL,
  peringkat integer NOT NULL,
  user_id uuid,
  kode_kelas text,
  skor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leaderboard_archive_period_idx ON public.leaderboard_archive (period_id, papan, peringkat);

CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key text NOT NULL UNIQUE,
  nama text NOT NULL,
  deskripsi text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  diperoleh_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.leaderboard_sampah_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  metrik_default text NOT NULL DEFAULT 'total' CHECK (metrik_default IN ('total', 'per_siswa')),
  min_hari_input integer NOT NULL DEFAULT 3,
  periode_default text NOT NULL DEFAULT 'bulan_ini',
  tampil_terbanyak boolean NOT NULL DEFAULT true,
  tampil_tersedikit boolean NOT NULL DEFAULT true
);

-- Data awal
INSERT INTO public.leaderboard_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.leaderboard_periods (status, dibuat_oleh)
  SELECT 'aktif', 'otomatis' WHERE NOT EXISTS (SELECT 1 FROM public.leaderboard_periods WHERE status = 'aktif');
UPDATE public.leaderboard_settings
  SET period_id = (SELECT id FROM public.leaderboard_periods WHERE status = 'aktif' LIMIT 1)
  WHERE id = true AND period_id IS NULL;
INSERT INTO public.leaderboard_sampah_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.game_settings (game_key) VALUES
  ('pilah_sampah'), ('tangkap_sampah'), ('memory_daur_ulang'), ('kuis_adiwiyata'), ('kebun_virtual'), ('lama_terurai')
  ON CONFLICT (game_key) DO NOTHING;
INSERT INTO public.badges (badge_key, nama, deskripsi) VALUES
  ('pahlawan_pilah', 'Pahlawan Pilah', '100 sampah dipilah dengan benar'),
  ('jagoan_kompos', 'Jagoan Kompos', 'Ahli memilah sampah organik'),
  ('kuis_master', 'Kuis Master', 'Skor sempurna pada Kuis Adiwiyata'),
  ('rajin_menyiram', 'Rajin Menyiram', 'Menyiram kebun 7 hari beruntun'),
  ('juara_pekan_ini', 'Juara Pekan Ini', 'Peringkat 1 pada periode berjalan'),
  ('leaderboard_juara_1', 'Juara 1 Periode', 'Peringkat 1 pada periode leaderboard'),
  ('leaderboard_juara_2', 'Juara 2 Periode', 'Peringkat 2 pada periode leaderboard'),
  ('leaderboard_juara_3', 'Juara 3 Periode', 'Peringkat 3 pada periode leaderboard')
  ON CONFLICT (badge_key) DO NOTHING;

-- ---------- migrations/0002_adiwiyata_public_tables.sql ----------
-- Skema idempoten untuk direktori kelas dan arsip publik Adiwiyata.
CREATE TABLE IF NOT EXISTS public.adiwiyata_classes (
  name text PRIMARY KEY,
  school_id text NOT NULL DEFAULT 'SMAN55',
  student_count integer CHECK (student_count IS NULL OR student_count BETWEEN 1 AND 100),
  homeroom_teacher text NOT NULL DEFAULT '',
  officer_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.adiwiyata_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Umum',
  blob_url text NOT NULL,
  blob_pathname text NOT NULL UNIQUE,
  content_type text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- migrations/0002_game_admin_content.sql ----------
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

-- ---------- migrations/0003_slider_tables.sql ----------
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

-- ---------- tahap-2-3-game.sql ----------
CREATE TABLE IF NOT EXISTS public.kebun_siram (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tanggal DATE NOT NULL,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tanggal)
);
UPDATE public.game_settings SET durasi_detik = 240 WHERE game_key = 'memory_daur_ulang' AND durasi_detik = 60;
UPDATE public.game_settings SET durasi_detik = 200 WHERE game_key = 'kuis_adiwiyata' AND durasi_detik = 60;
UPDATE public.game_settings SET durasi_detik = 90 WHERE game_key = 'lama_terurai' AND durasi_detik = 60;

-- ---------- tahap-5-laporan.sql ----------
CREATE TABLE IF NOT EXISTS public.laporan (
  id BIGSERIAL PRIMARY KEY,
  nomor_tiket TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  anonim BOOLEAN NOT NULL DEFAULT false,
  nama_pelapor TEXT,
  kategori TEXT NOT NULL CHECK (kategori IN ('kondisi_lapangan','pelanggaran','saran','apresiasi','kendala_teknis')),
  lokasi TEXT,
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  isi_hash TEXT NOT NULL,
  urgensi TEXT NOT NULL DEFAULT 'rendah' CHECK (urgensi IN ('rendah','sedang','tinggi')),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru','diproses','selesai','ditolak')),
  penanggung_jawab TEXT,
  tanggapan_admin TEXT,
  catatan_internal TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  status_sinkron TEXT NOT NULL DEFAULT 'tertunda',
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  diselesaikan_pada TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS laporan_status_urgensi_idx ON public.laporan (status, urgensi, dibuat_pada DESC);
CREATE INDEX IF NOT EXISTS laporan_user_idx ON public.laporan (user_id);
CREATE TABLE IF NOT EXISTS public.laporan_foto (
  id BIGSERIAL PRIMARY KEY,
  laporan_id BIGINT NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  pathname TEXT NOT NULL,
  nama_file TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.laporan_komentar (
  id BIGSERIAL PRIMARY KEY,
  laporan_id BIGINT NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  dari_admin BOOLEAN NOT NULL DEFAULT false,
  isi TEXT NOT NULL,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.laporan_riwayat_status (
  id BIGSERIAL PRIMARY KEY,
  laporan_id BIGINT NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  catatan TEXT,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.laporan_foto_unggahan (
  pathname TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notifikasi (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  tautan TEXT,
  dibaca BOOLEAN NOT NULL DEFAULT false,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifikasi_user_idx ON public.notifikasi (user_id, dibaca, dibuat_pada DESC);

-- ---------- tahap-6-admin-laporan.sql ----------
ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS saran_terbaik BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS sinkron_percobaan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS sinkron_error TEXT;
ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS laporan_pj_idx ON public.laporan (penanggung_jawab);
CREATE INDEX IF NOT EXISTS laporan_sinkron_idx ON public.laporan (status_sinkron);
ALTER TABLE public.adiwiyata_settings ADD COLUMN IF NOT EXISTS laporan_spreadsheet_url TEXT;
ALTER TABLE public.adiwiyata_settings ADD COLUMN IF NOT EXISTS laporan_wa_aktif BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.adiwiyata_settings ADD COLUMN IF NOT EXISTS laporan_wa_nomor TEXT;

-- ---------- migrations/0004_struktur_petugas.sql ----------
-- Tabel struktur petugas Adiwiyata (satu baris, id = 'utama').
-- Halaman publik /adiwiyata/struktur memakai data ini bila ada;
-- bila baris belum ada, halaman memakai data default dari SK
-- (STRUKTUR_PETUGAS di lib/struktur-petugas-data.ts). Editor admin
-- ada di /admin/struktur.
CREATE TABLE IF NOT EXISTS public.struktur_petugas (
  id text PRIMARY KEY DEFAULT 'utama',
  data jsonb NOT NULL,
  diperbarui_pada timestamptz NOT NULL DEFAULT now()
);
`
