ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS saran_terbaik BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS sinkron_percobaan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS sinkron_error TEXT;
ALTER TABLE public.laporan ADD COLUMN IF NOT EXISTS diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS laporan_pj_idx ON public.laporan (penanggung_jawab);
CREATE INDEX IF NOT EXISTS laporan_sinkron_idx ON public.laporan (status_sinkron);
ALTER TABLE public.adiwiyata_settings ADD COLUMN IF NOT EXISTS laporan_spreadsheet_url TEXT;
ALTER TABLE public.adiwiyata_settings ADD COLUMN IF NOT EXISTS laporan_wa_aktif BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.adiwiyata_settings ADD COLUMN IF NOT EXISTS laporan_wa_nomor TEXT;
