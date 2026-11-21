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
