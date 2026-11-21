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
