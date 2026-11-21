# Laporan Perbaikan — Adiwiyata55-main

Tanggal: 22 November 2026 · Bahasa: Indonesia

## Ringkasan

Proyek yang diunggah **tidak bisa jalan sama sekali**: tidak ada
`package.json`, `tsconfig.json`, `next.config.*`, folder `public/`,
dan **seluruh folder `lib/` hilang** (29 modul yang diimpor di
seluruh repo). Semua itu sudah dibuat ulang di paket ini, ditambah
perbaikan 9 bug di kode yang sudah ada.

> Yang masih butuh Anda isi (tidak bisa dipulihkan dari zip):
> daftar 14 kader, teks edukasi/konten situs asli, ID Google Form
> laporan kader, dan token Sheets lama (harus disimpan ulang).
> Detailnya di bagian "Yang harus Anda isi" di bawah.

## 1. File yang hilang — dibuat ulang

| File | Keterangan |
| --- | --- |
| `package.json` | Dependensi dari paket yang diimpor kode. Auth memakai `@neondatabase/auth@0.7.0-beta` — paket ini yang cocok dengan pola `getAuth().handler()` / `authClient.signUp.email` di kode. (Paket baru `@neon/auth` 0.8 API-nya berbeda, jangan upgrade tanpa mengubah kode auth.) |
| `tsconfig.json` | Strict, alias `@/*` ke root proyek. |
| `next.config.ts`, `postcss.config.mjs` | Konfigurasi Next 16 + Tailwind v4. |
| `.env.example` | Daftar env yang dibutuhkan (lihat §4). |
| `public/adiwiyata-logo.svg` | Logo pengganti — file `adiwiyata-logo.jpg` asli tidak ada di zip. Referensi di `app/layout.tsx` dan `components/adiwiyata/logo-mark.tsx` diubah ke SVG ini. Ganti dengan logo asli sekolah bila ada. |
| `lib/*` (29 modul) | Direkonstruksi dari kontrak call-site (import, tipe, SQL, dan migrasi). Daftar lengkap di §2. |
| `db/migrations/0003_slider_tables.sql` | DDL tabel slider (`slider_slides`, `slider_images`, `slider_settings`, `slider_activity_log`) yang tidak punya migrasi. `ensureSliderSchema()` juga membuatnya secara idempotent saat runtime. |
| `db/README.md` | Urutan menjalankan SQL (ada dua file `0002_*`). |

## 2. Modul `lib/` yang direkonstruksi

- `lib/db.ts` + `lib/db/schema.ts` — satu Pool `pg` dipakai Drizzle
  (`db`) dan query mentah (`pool`); dibuat malas (lazy) agar build
  tidak gagal saat `DATABASE_URL` belum diisi. Skema Drizzle hanya
  untuk tabel yang dipakai lewat ORM.
- `lib/auth/server.ts` — `getAuth()` via `createNeonAuth`
  (`@neondatabase/auth/next/server`), env `NEON_AUTH_BASE_URL` dan
  `NEON_AUTH_COOKIE_SECRET`.
- `lib/auth/client.ts` — `authClient` via `createAuthClient`
  (`@neondatabase/auth/next`).
- `lib/auth/access.ts` — `getPortalUser()` / `requirePortalRole()`.
  **Pemetaan peran hanya di sini**: DB `admin/officer/visitor` ↔
  aplikasi `admin/petugas/pengunjung`. Akun petugas yang masa
  berlakunya habis kembali jadi pengunjung.
- `lib/rate-limit.ts` — pembatas laju berbasis tabel
  `public.rate_limits` (kolom `jendela` bertipe timestamptz — awal
  jendela dihitung di SQL).
- `lib/api-client.ts` — `fetchJson` (lempar bila HTTP tidak OK) dan
  `readJsonResponse`.
- `lib/class-codes.ts`, `lib/general-locations.ts`,
  `lib/class-master.ts` — normalisasi kode kelas (algoritma sama
  dengan Code.gs), 5 lokasi umum, master kelas dari Apps Script.
- `lib/sheets-config.ts` — baca konfigurasi dari
  `adiwiyata_settings` id=1; enkripsi token AES-256-GCM (lihat §5).
- `lib/laporan.ts` — kategori/urgensi/status, 24 kelas, lokasi umum,
  `MAX_PHOTOS=3`, `MAX_PHOTO_BYTES=3 MB`, `DAILY_LIMIT=5`.
- `lib/laporan-admin.ts` + `lib/laporan-admin-guard.ts` — daftar,
  ringkasan, statistik, ekspor, detail, update massal, hapus,
  sinkronisasi laporan; penjaga route (401/403/origin).
- `lib/leaderboard-data.ts` — 6 game (`GAME_KEYS`), payload 5 tab
  (pengguna/kelas/game/sampah/riwayat), pengaturan admin, dan
  `resetLeaderboardIfDue` (arsip → periode baru → reset poin/lencana
  bila diatur).
- `lib/game-scoring.ts` — rumus skor server (lihat §5).
- `lib/game-content-seed.ts` — seed soal kuis, item sampah, misi;
  video edukasi sengaja tidak diisi.
- `lib/admin-user-management.ts` — daftar akun dari
  `neon_auth.user` + `adiwiyata_user_roles`.
- `lib/documents.ts`, `lib/education-videos.ts`,
  `lib/education-video-categories.ts` — dokumen & video. Video
  membaca dua sumber: kolom utama menang bila tidak ada baris di
  tabel mirror `adiwiyata_video_display_settings`.
- `lib/slider/data.ts` — data slider + `ensureSliderSchema()`.
- `lib/adiwiyata-site-content.ts` +
  `lib/adiwiyata-site-content.server.ts` — tipe, konten default, dan
  parser (string ≤ 3000 karakter, judul item wajib isi).
- `lib/edu-defaults.ts`, `lib/kader-report-tasks.ts`,
  `lib/kader-report-gform.ts`, `lib/waste-items.ts` — konten default
  (lihat §5, semuanya placeholder bertanda).
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge).

## 3. Bug di kode yang sudah ada — diperbaiki

| # | Bug | Perbaikan |
| --- | --- | --- |
| B-02 | **Tombol Aktifkan/Nonaktifkan konten game selalu gagal.** `game-content-manager.tsx` mengirim update parsial `{aktif: …}`, tetapi route menjalankan validasi create (semua kolom required) → selalu 400. | `app/api/admin/game/content/route.ts`: `validate()` mendapat mode update — kolom required yang tidak dikirim tidak wajib; pemeriksaan per-jenis hanya untuk kolom yang dikirim. |
| B-03 | **Setoran lokasi umum ditolak Apps Script.** `GENERAL_LOCATIONS = []` di `Code.gs`, padahal Next.js menganggap Kantin/Halaman/Lab/Perpustakaan/Taman valid. Setoran tersimpan lokal (`sync_status='pending'`) tapi tidak pernah tersinkron. | `apps-script/Code.gs`: diisi kelima lokasi — sama dengan `lib/general-locations.ts`. |
| B-05 | Dua workflow GitHub identik (`Agenai.yml` dan `ai-assistant.yml`) — setiap issue `ai-task` memicu 2 run agen (2 PR + biaya API ganda). | Hapus `ai-assistant.yml`, sisakan `Agenai.yml`. Tidak ada secret yang bocor (kunci hanya lewat `${{ secrets… }}`). |
| B-06 | Validasi `jenis` di `game/content/route.ts` memakai `in`, sehingga `constructor`/`__proto__` lolos → 500. | Ganti ke `Object.hasOwn(definitions, type)` di GET/POST/DELETE. |
| B-07 | Filter navigasi desktop vs drawer tidak konsisten: desktop menyaring `item.enabled`, drawer tidak (menampilkan label "Nanti"). | Satu fungsi `visibleNavigation(role)` dipakai keduanya di `components/adiwiyata/portal.tsx`. |
| B-08 | Link "Baca dokumen" di beranda bisa tanpa `href` bila tidak ada dokumen yang cocok. | Fallback ke `/adiwiyata/dokumen` di `components/adiwiyata/public-hub.tsx`. |
| OTP | Setelah daftar, form OTP langsung tampil **tanpa kode pernah dikirim** (`sendVerificationOtp` hanya dipanggil saat "Kirim ulang"). | `components/auth-form.tsx`: kirim kode pertama setelah `signUp` berhasil; bila gagal, tampilkan form OTP + pesan agar pengguna memakai kirim ulang. |
| 403 | `app/api/admin/game/route.ts` memetakan **semua** error (termasuk gangguan DB) menjadi 403, sehingga admin mengira tidak punya akses. | Hanya `FORBIDDEN` → 403; `UNAUTHORIZED` → 401; lainnya → 500. |
| Logo | `public/adiwiyata-logo.jpg` tidak ada → logo + favicon 404 di semua halaman. | Logo SVG baru + referensi diubah (lihat §1). |

## 4. Cara menjalankan

```bash
cp .env.example .env.local   # lalu isi (wajib: DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET)
npm install
npm run typecheck            # tsc --noEmit
npm run build
npm run dev
```

Lalu jalankan SQL di database (urutan lengkap di `db/README.md`),
dan di Apps Script ganti `Code.gs` dengan versi di `apps-script/`
(plus isi `SHEETS_SECRET_TOKEN` di Script Properties seperti semula).

## 5. Yang harus Anda isi / keputusan rekonstruksi

Nilai-nilai di bawah ini **tidak ada salinannya di zip** — yang
tertulis di kode adalah placeholder/rekonstruksi yang wajar, dan
semuanya ditandai dengan komentar `PERINGATAN` di file terkait.
Jangan menganggapnya data resmi sekolah.

1. **Token Sheets lama tidak bisa dipakai lagi.** Algoritma + kunci
   enkripsi token aslinya hilang. Token kini dienkripsi AES-256-GCM
   dengan kunci dari env `SHEETS_TOKEN_KEY` (64 hex, buat dengan
   `openssl rand -hex 32`). Setelah kunci diisi, **simpan ulang
   token sekali** lewat panel Pengaturan Sheets.
2. **14 kader Adiwiyata** (`lib/kader-report-tasks.ts` dan
   `KADER_LIST` di `lib/edu-defaults.ts`): nama + tugas diisi contoh
   umum. Ganti dengan daftar resmi sekolah.
3. **Google Form laporan kader** (`lib/kader-report-gform.ts`):
   `formId` dan 7 ID entry masih kosong. Selama kosong, form
   menampilkan catatan "belum dikonfigurasi" dan tombol kirim
   nonaktif — itu disengaja. Isi dari URL pre-filled Form asli.
4. **Teks konten situs** (`lib/adiwiyata-site-content.ts`) dan
   **teks edukasi** (`lib/edu-defaults.ts`): ditulis ulang dengan
   bahasa yang wajar; admin dapat mengubah konten situs lewat panel
   "Atur Informasi Adiwiyata" tanpa menyentuh kode.
5. **Rumus skor game** (`lib/game-scoring.ts`): direkonstruksi agar
   cocok dengan rumus client yang masih ada (Tangkap Sampah:
   +10 + bonus streak maks 20; Kuis: +10 + sisa detik). Poin =
   skor/10 dibatasi `maxPoints`. Bila aturan asli berbeda, ubah di
   satu file ini saja.
6. **Konten seed game** (`lib/game-content-seed.ts`): 10 soal kuis,
   item sampah dari `lib/waste-items.ts`, 3 misi contoh. Tambah/ubah
   lewat panel konten game.
7. **Nilai yang diputuskan** (tercatat di kode): `DAILY_LIMIT = 5`
   laporan/hari; laporan terlambat bila baru/diproses > 72 jam;
   `pageSize = 20`; default slider 5 detik, fade, autoplay;
   kepatuhan sampah = rata-rata `(tumbler+lunchbox)/(2×jumlah
   siswa)`; petugas hanya melihat laporan yang ditugaskan kepadanya.
8. **Sinkronisasi laporan**: Apps Script sebelumnya tidak punya
   handler laporan sama sekali. Ditambahkan action `sync_laporan`
   di `Code.gs` (sheet `Laporan`, upsert per nomor tiket).
   `syncReports` mengembalikan "dilewati" (bukan error) bila Apps
   Script belum dikonfigurasi.

## 6. Yang diperiksa dan TIDAK terbukti bug

- Semua `fetch`/`href`/`router.push` punya route/halaman yang
  cocok; tidak ada halaman hilang.
- Tidak ada SQL injection: semua query memakai placeholder `$1…$n`;
  nama tabel/order di `game/content` berasal dari konstanta/whitelist.
- Duplikat migrasi `0002_*` aman (definisi identik, `IF NOT EXISTS`).
- Nomor tiket laporan aman dari race: `MAX()+1` dalam transaksi +
  retry pada `23505`.
- Inkonsistensi laten (bukan bug aktif, dibiarkan apa adanya):
  dua konvensi timestamp (`created_at` vs `dibuat_pada`), `user_id`
  bertipe `uuid` (game) vs `text` (laporan), `kode_kelas` vs
  `class_name`, dua tabel video paralel (`video_edukasi` vs
  `adiwiyata_education_videos`), dan game Tangkap Sampah membaca
  `WASTE_ITEMS` statis — bukan tabel `item_sampah` yang dikelola
  admin (item baru dari panel tidak muncul di game sampai daftar
  `lib/waste-items.ts` ikut diperbarui).

## 7. Hasil verifikasi

Dilakukan 22 November 2026 di VM ini (tanpa database dan tanpa
akun Neon — jadi yang diverifikasi adalah kompilasi, bukan
perilaku runtime terhadap DB sungguhan):

- `npm install` — berhasil, 558 paket terpasang.
- `npx tsc --noEmit` — **0 error** (2 error awal diperbaiki:
  tipe `EducationVideo` di `portal.tsx` diselaraskan dengan panel
  video, dan `Map` label kategori di `lib/laporan-admin.ts`
  diketik `Map<string, string>`).
- `npm run build` — **berhasil** ("Compiled successfully",
  TypeScript selesai, 52 route terdaftar). Satu-satunya pesan
  error di log build adalah pesan yang diharapkan: halaman
  `/edukasi` mencoba membaca video saat build tanpa `DATABASE_URL`,
  dan ditangani dengan benar oleh kontrak `getEducationVideos`
  (mengembalikan `error`, bukan melempar) sehingga build tetap
  lolos.
- Yang **belum** bisa diverifikasi di sini (butuh database Neon +
  akun Neon Auth + Apps Script asli): login, setoran ke Sheets,
  game + leaderboard, laporan, dan sinkronisasi laporan.
  Jalankan migrasi dari `db/README.md` lalu uji dengan
  `.env.local` yang terisi sebelum deploy.
