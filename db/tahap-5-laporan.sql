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
