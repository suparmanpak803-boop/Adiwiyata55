# Rancangan Row Level Security (RLS) — Adiwiyata55

> **STATUS: RANCANGAN SAJA. Belum diterapkan. Jangan jalankan
> `db/rls-rancangan.sql` di produksi — file itu sepenuhnya berkomentar
> dan hanya untuk pengujian di branch Neon.**
>
> Dokumen ini menjawab temuan audit B-02 (tidak ada RLS): hari ini
> keamanan database sepenuhnya bergantung pada lapisan aplikasi
> (API route + `requirePortalRole`). Bila `DATABASE_URL` bocor,
> tidak ada lapisan kedua di database.

## 1. Temuan: satu koneksi untuk semua akses

### 1.1 Yang terverifikasi dari repo

- **Satu `DATABASE_URL`, satu Pool.** `lib/db.ts` membuat satu
  `Pool` `pg` yang dipakai bersama oleh Drizzle (`db`) dan query SQL
  mentah (`pool`). Keduanya menunjuk connection string yang sama.
  Pool dibuat malas (lazy) lewat Proxy — impor modul saat build
  tidak gagal walau `DATABASE_URL` belum diisi.
- **Tidak ada URL kedua / peran terpisah.** Pencarian di seluruh
  repo (`grep` untuk `DATABASE_URL`, `current_user`, `pg_roles`)
  hanya menemukan `DATABASE_URL` di `lib/db.ts`. Tidak ada
  `REPAIR_DATABASE_URL`, tidak ada peran aplikasi kedua, tidak ada
  `SET ROLE` / `SET LOCAL` di mana pun.
- **Semua query memakai Pool yang sama**, termasuk: route publik,
  route admin, cron (`/api/cron/backup`, `/api/cron/tahun-ajaran`),
  server action, dan `repairDatabase()` (menjalankan ulang
  `MIGRATION_SQL` — berisi `CREATE TABLE` / `ALTER TABLE`, jadi
  butuh hak DDL).
- **Peran aplikasi ditentukan di aplikasi, bukan di database.**
  `lib/auth/access.ts`: sesi Neon Auth → `user_id` → baca
  `public.adiwiyata_user_roles` (`role`: `admin` | `officer` |
  `visitor`; `class_name`; `expires_on`) → dipetakan ke
  `admin` | `petugas` | `pengunjung`. `getPortalUser()` membaca
  tabel peran ini di **setiap request yang butuh login** — peran
  aplikasi nanti wajib tetap bisa `SELECT` tabel ini.
- **Aplikasi membaca `neon_auth."user"` langsung** (SELECT id/name/
  email) di `lib/admin-user-management.ts`, `lib/leaderboard-data.ts`,
  `lib/laporan-admin.ts`, `lib/arsip-excel.ts`. Aplikasi **tidak
  pernah menulis** ke skema `neon_auth` dari kode repo — tulis
  sesi/akun ditangani layanan Neon Auth (Better Auth yang di-host
  Neon) lewat HTTP (`NEON_AUTH_BASE_URL`), bukan lewat `DATABASE_URL`
  aplikasi. Cadangan sengaja melewati `neon_auth.session`,
  `neon_auth.verification`, `neon_auth.account` (H-02).

### 1.2 Yang TIDAK bisa diverifikasi dari repo (harus dicek manual)

- **Peran sebenarnya di balik `DATABASE_URL`.** Kemungkinan besar
  owner proyek Neon (`neondb_owner` atau sejenisnya) — tapi itu
  harus dibuktikan, bukan diasumsikan. Jalankan lewat koneksi
  aplikasi (bukan SQL Editor Neon, karena SQL Editor berjalan
  sebagai owner):

  ```sql
  SELECT current_user;
  SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
  FROM pg_roles WHERE rolname = current_user;
  ```

  Cara menjalankan: sambungkan `psql` memakai connection string
  yang sama dengan `DATABASE_URL` di Vercel (atau skrip satu kali
  yang memakai `pool` aplikasi). Bila hasilnya `rolsuper = true`,
  maka koneksi aplikasi hari ini adalah superuser — itu alasan
  utama rancangan ini ada.

- **Apakah layanan Neon Auth memakai koneksi sendiri atau
  `DATABASE_URL` yang sama.** Dari kode repo, login/logout/session
  lewat HTTP ke `NEON_AUTH_BASE_URL`, jadi kemungkinan besar
  layanannya punya koneksi sendiri. Bila ternyata berbagi koneksi
  aplikasi, mempersempit hak di skema `neon_auth` bisa merusak
  login — karena itu pengujian di branch (bagian 4) wajib
  mencakup login/logout sebelum apa pun disentuh di produksi.

- **Daftar akses per route yang lengkap.** Klasifikasi di bagian 2
  disusun dari DDL + pencarian `INSERT`/`UPDATE`/`DELETE` di repo.
  Sebelum menerapkan, tiap route harus dicek satu per satu
  (terutama route yang memakai `pool.connect()` + transaksi).

## 2. Klasifikasi tabel

Skema `public` punya 36 tabel (dari `db/semua-migrasi.sql`) + tabel
`backup_log` baru. Klasifikasi berikut menentukan GRANT + kebijakan.

### 2.1 Dibaca publik, tulis hanya admin/petugas

| Tabel | Baca | Tulis |
|---|---|---|
| `adiwiyata_documents`, `adiwiyata_education_videos`, `adiwiyata_video_display_settings` | publik | admin |
| `slider_slides`, `slider_images`, `slider_settings`, `slider_activity_log` | publik | admin |
| `struktur_petugas` | publik (di balik login halaman) | admin |
| `hari_libur` | publik | admin |
| `adiwiyata_classes` | publik | admin / rollover |
| `video_edukasi`, `item_sampah`, `kuis_soal`, `misi_mingguan` | publik | admin |
| `game_settings`, `app_settings`, `adiwiyata_settings`, `leaderboard_settings`, `leaderboard_periods`, `leaderboard_sampah_settings`, `leaderboard_archive` | publik | admin / cron |
| `badges`, `user_badges` | publik | sistem |

### 2.2 Ditulis pengguna yang login / sistem

| Tabel | Keterangan |
|---|---|
| `game_scores`, `game_sessions` | tulis saat game mengirim skor (pengguna login) |
| `adiwiyata_deposits` | tulis petugas saat input setoran sampah |
| `laporan`, `laporan_foto`, `laporan_foto_unggahan`, `laporan_komentar`, `laporan_riwayat_status` | tulis petugas; baca admin + petugas terkait |
| `notifikasi`, `log_aktivitas`, `rate_limits` | tulis sistem (aplikasi sendiri) |
| `arsip_tahun_ajaran` | tulis cron rollover |
| `backup_log` | tulis cron backup; baca admin |
| `adiwiyata_user_roles` | **baca tiap request login** (`getPortalUser`); tulis hanya admin |
| `kebun_siram` | tidak dipakai kode apa pun (dipertahankan demi migrasi lama) |

### 2.3 Skema `neon_auth` (dikelola Neon Auth)

| Tabel | Akses aplikasi |
|---|---|
| `neon_auth."user"` | SELECT (id, name, email) — dipakai banyak tempat |
| `neon_auth.session`, `neon_auth.account`, `neon_auth.verification` | **tidak disentuh aplikasi**; jangan beri hak ke peran aplikasi; jangan aktifkan RLS dari file ini |

## 3. Rancangan

### 3.1 Prinsip: dua peran, bukan satu

- **`neondb_owner` (atau owner proyek) — tetap ada, untuk DDL.**
  Migrasi (`db/semua-migrasi.sql` lewat SQL Editor) dan
  `repairDatabase()` tetap berjalan sebagai owner. DDL tidak
  pernah lewat peran aplikasi.
- **`app_adiwiyata` (baru, LOGIN, tanpa superuser)** — satu-satunya
  peran yang dipakai `DATABASE_URL` aplikasi setelah perubahan.
  Haknya minimal, sesuai klasifikasi bagian 2.

### 3.2 GRANT minimal (peran aplikasi)

- `USAGE` pada skema `public` dan `neon_auth`.
- `SELECT` pada semua tabel `public` yang dibaca aplikasi +
  `neon_auth."user"`.
- `INSERT` / `UPDATE` / `DELETE` hanya pada tabel bagian 2.2,
  dan `DELETE` sesedikit mungkin (mis. hanya `rate_limits`,
  `game_sessions`, `notifikasi` bila memang ada kodenya).
- `USAGE, SELECT` pada semua sequence (PK `serial`/`identity` —
  tanpa ini `INSERT` gagal walau `INSERT` sudah di-GRANT; ini
  jebakan paling umum).
- `REVOKE ALL` dari `PUBLIC` pada skema dan tabel sensitif, dan
  **tidak ada** hak pada `neon_auth.session` /
  `neon_auth.account` / `neon_auth.verification` untuk peran aplikasi.
- `REVOKE CREATE ON SCHEMA public` untuk peran aplikasi — aplikasi
  tidak boleh membuat tabel sendiri.

### 3.3 RLS: kebijakan setingkat peran dulu, bukan per pengguna

Fakta penting: koneksi aplikasi memakai **satu Pool bersama**.
RLS yang membedakan *pengguna* (`user_id = ...`) hanya mungkin
bila tiap request menyetel variabel sesi (`SET LOCAL
app.user_id = ...`) di dalam transaksi — dan itu berarti
membungkus semua query aplikasi dalam transaksi yang menyetel
variabel. Itu perubahan besar dan berisiko; **bukan langkah
pertama**.

Karena itu rancangan ini memakai **RLS setingkat peran**:

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` pada semua tabel
  `public` (kecuali `kebun_siram` yang tidak dipakai — tetap
  amankan juga, murah).
- Kebijakan per tabel untuk peran `app_adiwiyata`, contoh:
  - tabel baca-publik: `FOR SELECT USING (true)`.
  - tabel tulis-pengguna: `FOR INSERT/UPDATE USING (true)` —
    pembatasan *siapa* tetap di lapisan aplikasi
    (`requirePortalRole` + cek kepemilikan di route).
  - tabel admin-saja (`adiwiyata_user_roles` tulis,
    `struktur_petugas` tulis, `arsip_tahun_ajaran`): **tanpa**
    kebijakan tulis untuk peran aplikasi — tulis dilakukan
    lewat koneksi owner terpisah (lihat 3.4) atau tetap
    diblokir dan dipindah ke SQL Editor.
- **Tanpa kebijakan = akses ditolak.** Mengaktifkan RLS tanpa
  kebijakan pada tabel yang dibaca aplikasi akan membuat halaman
  itu 500. Setiap tabel yang dibaca wajib punya kebijakan SELECT.
- **Tidak ada RLS di skema `neon_auth` dari rancangan ini.**
  Tabel auth dikelola layanan Neon Auth; RLS di sana berisiko
  merusak login. Perlindungan untuk skema auth adalah GRANT
  (hanya SELECT pada `neon_auth."user"`), bukan RLS.

Keuntungan yang *benar-benar* didapat dari tahap ini: bila
`DATABASE_URL` bocor, penyerang hanya mendapat hak peran aplikasi
(tidak bisa DDL, tidak bisa baca sesi/token auth, tidak bisa
`TRUNCATE`/`DROP`). Yang **tidak** didapat: pemisahan antar
pengguna di dalam database — itu tetap tugas lapisan aplikasi.

### 3.4 Konsekuensi: `repairDatabase()` butuh koneksi owner terpisah

Hari ini tombol "Perbaiki tabel yang hilang" menjalankan
`MIGRATION_SQL` (DDL) lewat Pool aplikasi. Setelah peran aplikasi
dipersempit, tombol itu akan gagal (tidak ada hak DDL) — **itu
perilaku yang benar**, bukan bug. Pilih salah satu sebelum
menerapkan:

- **Opsi A (disarankan):** perbaikan skema hanya lewat SQL Editor
  Neon dengan `db/semua-migrasi.sql` (idempotent). Tombol di
  `/admin/diagnostik` diubah menjadi petunjuk, atau
- **Opsi B:** tambah env `REPAIR_DATABASE_URL` (connection string
  owner) yang **hanya** dipakai `repairDatabase()`, tidak pernah
  dipakai route lain. Env ini sama sensitifnya dengan
  `DATABASE_URL` dan tidak boleh bocor ke log.

Keputusan ini harus diambil sebelum RLS diterapkan — jangan
menerapkan RLS lalu kaget tombol perbaikan mati.

## 4. Urutan penerapan yang aman

1. **Buat branch Neon** dari produksi (branch = salinan
   copy-on-write; aman untuk diutak-atik).
2. **Di branch:** buat role `app_adiwiyata` + GRANT sesuai
   `db/rls-rancangan.sql` (lengkapi dulu daftar kebijakan
   per tabel — file itu baru berisi pola + contoh).
3. **Di branch:** aktifkan RLS + kebijakan, satu kelompok tabel
   per sekali uji (jangan sekaligus 36 tabel).
4. **Uji di branch dengan connection string branch:**
   login + logout, buka halaman publik, buat + ubah laporan,
   kirim skor game, buka semua halaman admin, jalankan
   `/api/cron/backup` (cek isi cadangan lengkap — tabel yang
   lupa di-GRANT akan diam-diam hilang dari cadangan, hanya
   tercatat di `notes`), jalankan rollover pratinjau.
5. **Ganti `DATABASE_URL` di Vercel Preview** (bukan produksi)
   ke connection string branch + role baru; uji lagi alur
   yang sama di deployment preview.
6. **Baru ganti `DATABASE_URL` produksi.** Siapkan rollback:
   kembalikan env ke connection string lama (owner) — satu
   perubahan env, tanpa deploy ulang kode.
7. **DDL/migrasi tetap lewat SQL Editor** dengan role owner,
   bukan lewat aplikasi.

## 5. Risiko bila diterapkan sembarangan

- **Aplikasi mendadak 500.** Penyebab paling umum: lupa kebijakan
  SELECT pada tabel yang dibaca (mis. `neon_auth."user"` —
  hampir semua halaman yang menampilkan nama akan rusak);
  lupa GRANT sequence (semua `INSERT` gagal); lupa
  `adiwiyata_user_roles` (semua halaman login gagal karena
  `getPortalUser()` tidak bisa membaca peran).
- **RLS tanpa ganti role = tidak ada efek.** Owner dan superuser
  **bypass RLS**. Mengaktifkan RLS sambil aplikasi tetap memakai
  koneksi owner hanya memberi rasa aman palsu.
- **Login bisa rusak** bila hak di skema `neon_auth` dipersempit
  tanpa memastikan koneksi apa yang dipakai layanan Better Auth.
- **Cadangan bisa diam-diam tidak lengkap.** Route backup
  mencatat tabel yang gagal dibaca di `notes` dan tetap
  mengembalikan 200 — jadi cadangan yang kehilangan tabel tidak
  terlihat sebagai error kecuali `notes`-nya dibaca.
- **Tombol "Perbaiki tabel yang hilang" mati** (lihat 3.4) bila
  tidak disiapkan koneksi owner terpisah.
- **Kebijakan per pengguna yang setengah jalan** lebih berbahaya
  daripada tidak ada: bila `current_setting('app.user_id')`
  tidak disetel di satu jalur, kebijakan bisa menolak semua
  baris (halaman kosong) atau — lebih buruk — menerima semua
  baris bila kebijakan memakai nilai default yang longgar.

## 6. Daftar periksa sebelum produksi

- [ ] Peran di balik `DATABASE_URL` saat ini sudah dicek (bagian 1.2).
- [ ] Koneksi yang dipakai layanan Neon Auth sudah dipastikan
      (dashboard Neon Auth).
- [ ] Daftar kebijakan per tabel sudah lengkap (36 tabel public +
      `neon_auth."user"`), bukan hanya contoh.
- [ ] Semua alur diuji di branch (bagian 4 langkah 4).
- [ ] Keputusan soal `repairDatabase()` sudah diambil (3.4).
- [ ] Rollback (kembalikan `DATABASE_URL` lama) sudah dicoba
      sekali di Preview.
- [ ] Cadangan terbaru sudah diunduh dan dicek isinya sebelum
      perubahan (cadangan = jaring pengaman bila harus pulih).
