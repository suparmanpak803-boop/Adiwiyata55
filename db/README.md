# Database Adiwiyata 55

## Urutan menjalankan SQL (penting)

File-file di sini TIDAK semuanya bernama `migrations/*`, dan ada dua
file `0002_*`. Jalankan dengan urutan berikut (semua idempotent —
`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — jadi
aman dijalankan ulang):

1. `migrations/0001_game_leaderboard.sql` — fondasi: settings, kelas,
   deposit, peran pengguna, game, leaderboard, rate limit.
2. `migrations/0002_adiwiyata_public_tables.sql` — dokumen, kelas
   (duplikat 0001, no-op), dan tabel publik lainnya.
3. `migrations/0002_game_admin_content.sql` — kuis, item sampah,
   misi, video edukasi, `app_settings`, kolom `game_settings.konfigurasi`.
4. `migrations/0003_slider_tables.sql` — **baru (perbaikan)**: tabel
   slider beranda yang sebelumnya tidak punya DDL sama sekali.
5. `tahap-2-3-game.sql` — tabel `kebun_siram` (saat ini tidak dipakai
   kode apa pun; dipertahankan agar migrasi lama tetap lengkap).
6. `tahap-5-laporan.sql` — tabel laporan, foto, komentar, riwayat,
   foto unggahan, notifikasi.
7. `tahap-6-admin-laporan.sql` — kolom admin laporan
   (`saran_terbaik`, `sinkron_*`, `diperbarui_pada`, kolom settings
   laporan di `adiwiyata_settings`).

Dua file `0002_*` tidak konflik (definisi `adiwiyata_classes` identik),
tetapi urutan antar-runner bisa berbeda — bila suatu saat migrasi
dirapikan, gabungkan keduanya menjadi satu file `0002` dan perbarui
urutan di sini.

## Tabel yang dibuat di luar migrasi

- `neon_auth."user"` — diprovisi Neon Auth, bukan oleh repo ini.
- Tabel slider — selain migrasi 0003 di atas, juga dibuat secara
  idempotent oleh `ensureSliderSchema()` di `lib/slider/data.ts`
  setiap kali action slider dijalankan (jadi slider tetap jalan
  walau migrasi 0003 belum sempat dijalankan).

## Data awal (seed)

- `0001` sudah mengisi `leaderboard_settings`, satu periode aktif,
  `leaderboard_sampah_settings`, dan 6 baris `game_settings`.
- Konten game (soal kuis, item sampah, misi) di-seed runtime oleh
  `lib/game-content-seed.ts` (`ensureStarterGameContent` /
  `seedGameDefaults`) dan tidak menimpa data yang sudah ada.
