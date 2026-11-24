# Rencana: Game "Apa itu Adiwiyata" — Tahap 1

Kampanye 6 bab (±60 menit) untuk siswa SMA di Indonesia. Pemain adalah siswa
baru yang menjadikan sekolahnya Adiwiyata. Tokoh: Pak Plastik (pengacau lucu),
Magi (maskot larva maggot). Makna inti: "Tidak ada yang benar-benar sampah,
dan lingkungan adalah budaya bersama." Bahasa Indonesia santai, tidak menggurui;
makna disampaikan lewat pengalaman, bukan ceramah.

Dokumen ini adalah hasil **Tahap 1** (struktur folder, data model, rencana).
Tiap tahap berhenti untuk dicek user sebelum lanjut.

## 1. Cara game ini masuk ke situs yang sudah ada

- Game baru menjadi **kartu ketiga di menu game** (`/game`, komponen
  `components/game/game-hub.tsx`), mengikuti pola yang sudah ada:
  `GAMES` + `RUNNERS` (komponen runner menerima `onExit` dan
  `onFinished(score)`), sama seperti Tangkap Sampah dan Kuis Adiwiyata.
- Tidak ada route baru: kampanye dibuka sebagai runner di dalam `/game`.
- **Tetap di balik login** seperti game lain (siswa login dulu).
- Tombol on/off game mengikuti `game_settings` dengan key baru
  `apa_itu_adiwiyata` (aktif secara default, admin bisa menonaktifkan dari
  Pengaturan Game).
- **Tanpa backend dulu** (sesuai spek): progres, koin, streak, dan lencana
  hanya di `localStorage` dengan skema berversi. Leaderboard kampanye memakai
  data dummy di file konten (mudah diganti API nanti).
- **Tidak menulis ke `game_scores` / leaderboard situs.** Sistem skor situs
  punya cap 300 poin/hari dan anti-cheat server-side; mengaitkan Koin Hijau
  ke sana butuh desain skor server-side terpisah (di luar cakupan ini).
  Kartu "Rekor" di hub untuk game ini menampilkan **progres kampanye**
  (mis. "Bab 2/6"), bukan skor.
- Catatan: `lib/game-scoring.ts` sudah punya key `pilah_sampah`,
  `kebun_virtual`, `memory_daur_ulang`, `lama_terurai` tanpa UI dan skor
  generiknya ditolak (422). Mini-game kampanye TIDAK memakai key itu;
  kampanye punya namespace sendiri (`aia-*`) supaya tidak bentrok.

## 2. Keputusan teknologi (menyesuaikan repo, bukan spek mentah)

| Spek | Keputusan di repo ini | Alasan |
| --- | --- | --- |
| Tailwind CSS | **Tidak dipakai.** Gaya ditulis di `apa-itu-adiwiyata.css` mengikuti pola `components/game/game.css` | Tailwind tidak terpasang di repo; situs memakai CSS kustom |
| Zustand / Context | **React Context + useReducer** (`context.tsx`) | Zustand tidak terpasang; hindari dependensi baru |
| Mini-game Canvas / React DnD | **React + Pointer Events** (touch + mouse) untuk Tas Pagi & Pilah; panel interaktif React untuk Maggot/Kompos/Air-Energi; Canvas hanya bila perlu | Konsisten dengan Tangkap Sampah (canvas) + Kuis (React); drag DOM lebih mudah diakses keyboard |
| Suara | **Web Audio API tersintesis** (AudioManager singleton, tanpa file audio): SFX + musik generatif per bab, slider Musik/Efek + Mute, jeda otomatis saat tab tidak aktif, getar HP | 0 byte aset, tanpa lisensi |
| Animasi | **Motion** (`motion/react`, sudah terpasang) untuk transisi + confetti daun sederhana | Sudah dipakai di situs |
| Ikon | **lucide-react** (sudah terpasang), tanpa emoji | Konsisten dengan audit anti-slop situs |

## 3. Struktur folder

```
components/game/apa-itu-adiwiyata/
  index.tsx                  # runner: layar menu / peta / bab / ensiklopedia / peringkat / profil
  types.ts                   # tipe data model (lihat §4)
  storage.ts                 # kunci + versi skema + load/save + autosave 30 dtk +
                             # visibilitychange/beforeunload + migrasi skema
  context.tsx                # CampaignProvider (Context + useReducer) + hooks
  suara.ts                   # SFX Web Audio + mute
  menu-utama.tsx             # Lanjutkan / Pilih Bab / Mulai Baru (konfirmasi) +
                             # bar progres kampanye + estimasi waktu tersisa
  peta-sekolah.tsx           # Peta zona: Gerbang, Kantin, Pos Maggot, Kompos, Kebun,
                             # Taman Air, Panel Surya, Pohon (terkunci bila belum dibuka)
  bottom-nav.tsx             # Main, Peta Sekolah, Ensiklopedia, Peringkat, Profil
  bab-shell.tsx              # kerangka bab: dialog awal, 3 tahap, kejadian acak,
                             # checkpoint, refleksi, Pos Hijau (bendera hijau)
  kejadian-acak.tsx          # Badai Sampah, Serangan Lalat, Hujan Deras, dll.
  rapor-sekolah.tsx          # bar 0-100: Sampah, Energi, Air, Hijau, Biodiversitas
  ensiklopedia.tsx           # kartu info + tombol "Pelajari lebih dalam"
  janji-harian.tsx           # pilih janji + check-in "Sudah kulakukan"
  lencana.tsx                # daftar lencana + syarat
  leaderboard.tsx            # dummy antarkelas (tab Mingguan/Bulanan) + individu
                             # (nama panggilan, top 10, posisi sendiri, sembunyikan nama)
  kartu-bagikan.tsx          # kartu hasil -> gambar (canvas) untuk dibagikan/diunduh
  profil.tsx                 # nama panggilan, koin, streak, janji aktif
  tamat.tsx                  # layar tamat + sertifikat "Sekolah Adiwiyata Mandiri"
  apa-itu-adiwiyata.css      # gaya khusus kampanye (mobile-first 360px, tombol >=44px,
                             # focus ring jelas, kontras WCAG AA)
  minigames/
    tas-pagi.tsx             # Bab 1: drag barang benar ke tas, sekali pakai ke "Tinggalkan"
    pilah-sampah.tsx         # Bab 2: lempar sampah ke tong (lintasan lengkung), 2->4 tong
    zona-maggot.tsx          # Bab 3: kelembapan, suhu, bau; beri pakan; panen
    kompos-kebun.tsx         # Bab 4: lapis kompos (cokelat/hijau) + rawat tanaman
    air-energi.tsx           # Bab 5: biopori, tampung hujan, cari lampu/AC/keran boros
    inspeksi.tsx             # Bab 6 (bos akhir): kuis aksi cepat, memakai ulang
                             # semua mekanik bab 1-5

lib/apa-itu-adiwiyata/
  content/
    sampah.ts                # >=20 jenis sampah + tong benar + penjelasan 1-2 kalimat
                             # (termasuk kasus abu-abu: bungkus berminyak, kertas basah,
                             # baterai, lampu bekas, masker, kulit pisang, sisa nasi,
                             # botol bersih, kardus)
    fakta.ts                 # fakta "Tebak dulu" bab 1 + kartu fakta (mis. maggot BSF)
    dialog.ts                # dialog awal tiap bab (Pak Plastik, Magi)
    pertanyaan.ts            # soal kuis Inspeksi + pertanyaan refleksi tiap bab
    janji.ts                 # daftar janji harian
    ensiklopedia.ts          # kartu ensiklopedia (arti Adiwiyata, 4 pilar, jenis sampah,
                             # maggot BSF, kompos, eco enzyme, biopori,
                             # tumbler vs botol plastik, spesies sekolah)
    leaderboard-dummy.ts     # 6-8 kelas dummy + pemain dummy
    spesies.ts               # koleksi spesies (burung, kupu-kupu) yang terbuka di bab 6
  siklus.ts                  # aturan dampak berantai antar bab (carry-over, lihat §5)

Perubahan di file yang sudah ada (kecil, di Tahap 2):
  components/game/game-hub.tsx   # +1 entri GAMES + 1 entri RUNNERS (apa_itu_adiwiyata)
  components/game/game.css       # tidak diubah; gaya kampanye di file CSS sendiri
```

## 4. Data model

```ts
// lib/apa-itu-adiwiyata — types.ts (ringkas; tipe lengkap ditulis di Tahap 2)
type ChapterId =
  | 'gerbang' | 'kantin' | 'maggot' | 'kompos' | 'air-energi' | 'biodiversitas'

type StageStatus = 'locked' | 'open' | 'done'

interface StageProgress {
  status: StageStatus
  bestScore: number // skor terbaik tahap itu (Koin Hijau)
}

interface ChapterProgress {
  stages: [StageProgress, StageProgress, StageProgress] // 3 tahap per bab
  done: boolean
  badgeEarned: boolean
}

interface Checkpoint {
  chapterId: ChapterId
  stageId: number // 0..2
  state: unknown // state mini-game saat checkpoint (tipe per game)
  savedAt: string // ISO
}

interface PromiseItem {
  id: string
  text: string
  chapterId: ChapterId
  done: boolean
  createdAt: string
}

interface Report { sampah: number; energi: number; air: number; hijau: number; biodiversitas: number } // 0-100

interface Carryover { // dampak berantai antar bab (§5)
  maggotKenaMinyak: boolean // salah pilah di Kantin -> maggot terganggu di Pos Maggot
  komposBau: boolean        // pakan salah -> kompos bermasalah di Bab 4
  kebunLayu: boolean         // kompos buruk -> kebun layu di Bab 4
}

interface CampaignSave {
  version: 1
  nickname: string
  hideName: boolean
  coins: number // Koin Hijau
  streak: { count: number; lastDay: string | null; multiplierActive: boolean } // hari ke-5 = x2
  chapters: Record<ChapterId, ChapterProgress>
  checkpoint: Checkpoint | null
  bestScores: Record<string, number> // kunci "bab:tahap" -> skor terbaik
  unlockedCards: string[] // id kartu ensiklopedia yang sudah terbuka
  badges: string[] // id lencana
  promises: PromiseItem[]
  report: Report
  carryover: Carryover
  species: string[] // spesies yang sudah dikoleksi (bab 6)
  muted: boolean
  completedAt: string | null // terisi saat tamat -> sertifikat
  updatedAt: string
}
```

Penyimpanan:

- Kunci localStorage: `aia-save-v1` (versi di dalam nama kunci + di field
  `version`, supaya skema bisa dimigrasi tanpa merusak save lama).
- Checkpoint 3 lapis (sesuai spek):
  1. **Checkpoint tahap** — otomatis saat tahap selesai. Nyawa habis -> ulang
     dari awal tahap itu (bukan awal bab). Setelah 2x gagal -> tawarkan mode
     mudah (tong lebih sedikit / petunjuk muncul).
  2. **Pos Hijau** — akhir bab (bendera hijau): simpan progres, tampilkan
     rapor sekolah, buka kartu ensiklopedia, pilih janji harian, beri lencana.
     Pemain boleh berhenti dengan tenang di sini.
  3. **Autosave** — tengah mini-game panjang tiap 30 detik + saat tab
     ditutup (`visibilitychange` / `beforeunload`); dipulihkan saat game
     dibuka lagi.
- Menu utama: **Lanjutkan** (checkpoint terakhir), **Pilih Bab** (hanya bab
  yang sudah dibuka; boleh diulang untuk memperbaiki skor; skor terbaik
  tersimpan), **Mulai Baru** (dengan konfirmasi). Bar progres kampanye +
  estimasi waktu tersisa tampil di menu.

## 5. Siklus tertutup (dampak berantai antar bab)

Sisa makanan kantin -> maggot -> pakan ikan + kasgot -> pupuk kebun ->
sayur -> kembali ke kantin. Disimpan di `carryover`:

- Salah memilah di Bab 2 (mis. bungkus berminyak masuk organik) ->
  `maggotKenaMinyak` -> di Bab 3 maggot rewel (bau naik, lalat datang),
  pemain harus memperbaikinya sebelum panen.
- Pakan salah di Bab 3 -> `komposBau` -> di Bab 4 kompos perlu
  diperbaiki (tambah bahan cokelat / aduk) sebelum bisa dipakai.
- Kompos buruk -> `kebunLayu` -> tanaman di Bab 4 tumbuh lambat sampai
  pemain memberi pupuk benar.
- Carry-over bisa **diperbaiki di dalam bab yang bersangkutan** (bukan
  hukuman permanen): pemain merasakan akibatnya, lalu memperbaikinya.
  Skor terbaik tahap tetap bisa dikejar dengan mengulang bab.

## 6. Isi tiap bab (ringkas; detail konten di file `content/`)

| Bab | Waktu | Mini-game | Yang dipelajari |
| --- | --- | --- | --- |
| 1 Gerbang Sekolah | ±8 mnt | Tas Pagi (drag ke tas / "Tinggalkan"); layar "Tebak dulu" + fakta | Bawa tumbler, lunch box, tas kain; tinggalkan sekali pakai |
| 2 Kantin | ±10 mnt | Pilah Sampah gaya basket (2->4 tong, tong bergerak di level 3) | 4 tong SMAN 55; kasus abu-abu; organik jadi stok pakan maggot |
| 3 Pos Maggot | ±10 mnt | Zona Maggot (kelembapan, suhu, bau; beri pakan; panen) | Maggot BSF: pakan ikan + kasgot |
| 4 Kompos dan Kebun | ±10 mnt | Susun lapis kompos (cokelat/hijau, rasio tepat); rawat cabai & kangkung (air, cahaya, pupuk) | Siklus tertutup mulai terlihat |
| 5 Air dan Energi | ±10 mnt | Biopori ("mengebor", lihat banjir berkurang); tampung hujan; cari lampu/AC/keran boros | Hemat air & energi |
| 6 Biodiversitas & Inspeksi | ±12 mnt | Tanam pohon -> burung & kupu-kupu datang (koleksi spesies); bos akhir Inspeksi Tim Adiwiyata (kuis aksi cepat, memakai ulang mekanik bab 1-5) | Keanekaragaman hayati; ujian akhir |

Tamat: sekolah naik menjadi **"Sekolah Adiwiyata Mandiri"** + kartu
sertifikat yang bisa dibagikan (nama panggilan, skor, kalimat mis.
"Aku menghindari 20 botol plastik minggu ini").

Kejadian acak tiap bab (1x): Badai Sampah, Serangan Lalat, Hujan Deras, dll.
— muncul sebagai interupsi singkat di tengah tahap.

## 7. Sistem pendukung

- **Koin Hijau + streak harian**: benar +10 (Tas Pagi; Pilah menyesuaikan),
  combo beruntun memberi bonus; hari ke-5 berturut-turut = pengali x2.
- **Rapor Sekolah** (bar 0-100): Sampah, Energi, Air, Hijau, Biodiversitas.
  Naik sesuai bab yang diselesaikan. Yang belum terbuka tampil terkunci
  (membuat penasaran).
- **Ensiklopedia Adiwiyata**: kartu terbuka setelah topik dimainkan. Tiap
  tahap ada tombol "Pelajari lebih dalam".
- **Lencana** (8): Master Pilah, Pejuang Tumbler, Juragan Maggot, Petani
  Muda, Penjaga Air, Pahlawan Energi, Penjaga Biodiversitas, Streak 5 Hari.
- **Janji Harian**: di akhir tiap bab pemain memilih satu janji nyata
  ("Besok bawa tumbler", "Pilah sisa makanan di kantin"). Ditampilkan saat
  game dibuka lagi, dengan tombol "Sudah kulakukan" (check-in).
- **Leaderboard**: antarkelas (dummy 6-8 kelas, skor kelas = total poin /
  jumlah siswa), tab Mingguan & Bulanan, lencana "Kelas Paling Berkembang";
  individu pakai nama panggilan, top 10 + posisi pemain, opsi sembunyikan
  nama.
- **Refleksi**: penutup tiap bab satu pertanyaan (mis. "Hari ini kamu
  mengubah sisa makanan jadi pupuk. Apa lagi yang bisa kamu ubah besok?").

## 8. UI dan gaya

- Ceria dan hangat: palet hijau, kuning, putih; ilustrasi flat / kartun
  sederhana (SVG + bentuk CSS, tanpa aset gambar baru).
- Animasi kecil tiap aksi benar (confetti daun, suara pop).
- Bottom nav: Main, Peta Sekolah, Ensiklopedia, Peringkat, Profil.
- Mobile-first (360px), tetap rapi di desktop; tombol minimal 44px;
  focus ring jelas; kontras WCAG AA; tombol mute suara.

## 9. Rencana tahap berikutnya (berhenti tiap tahap untuk dicek)

1. **Tahap 1 — Rencana (dokumen ini).** Dicek: struktur, data model, asumsi.
2. **Tahap 2 — Kerangka.** Halaman + navigasi (bottom nav, peta sekolah),
   menu utama, AudioManager + pengaturan suara, sistem checkpoint + localStorage, kerangka `context.tsx`,
   `storage.ts`, `types.ts`, CSS dasar. Belum ada mini-game (tombol bab
   menampilkan "segera hadir"). Dicek: navigasi jalan, Lanjutkan/Pilih
   Bab/Mulai Baru jalan, progres tersimpan dan pulih setelah refresh.
3. **Tahap 3 — Bab 1 dan 2.** Tas Pagi + Pilah Sampah sampai berjalan penuh
   (skor, nyawa, combo, mode mudah setelah 2x gagal, kejadian acak,
   checkpoint tahap, Pos Hijau, rapor, kartu ensiklopedia terkait).
   Dicek: kedua mini-game bisa dimainkan sampai tamat bab di HP.
4. **Tahap 4 — Bab 3 dan 4.** Zona Maggot + Kompos/Kebun, termasuk
   carry-over dari Bab 2 (maggot kena minyak, kompos bau) dan stok pakan
   dari hasil pilah Bab 2. Dicek: rantai kantin -> maggot -> kebun terasa.
5. **Tahap 5 — Bab 5 dan 6 + tamat.** Air/Energi, Biodiversitas, bos akhir
   Inspeksi, layar tamat + sertifikat. Dicek: kampanye bisa ditamatkan
   ujung ke ujung (±60 menit).
6. **Tahap 6 — Sistem pendukung.** Ensiklopedia lengkap, janji harian,
   lencana, leaderboard (dummy), kartu bagikan, profil. Dicek: semua menu
   bottom nav berfungsi.
7. **Tahap 7 — Rapikan.** Sambungkan musik per bab, UI + aksesibilitas (kontras, focus, 44px, mute),
   uji di 360px + desktop, ringkasan hasil + daftar asumsi. Lalu deploy.

## 10. Asumsi yang dicatat (dipilih yang paling sederhana)

1. Kampanye hidup di dalam `/game` sebagai kartu ketiga (bukan halaman /
   route baru) dan tetap butuh login.
2. Progres hanya di localStorage; tidak ada sinkronisasi antar perangkat
   dan tidak masuk leaderboard situs.
3. Tanpa Tailwind dan tanpa Zustand (tidak terpasang); Context + CSS kustom
   mengikuti pola repo.
4. Mini-game memakai React + Pointer Events (bukan Canvas penuh), kecuali
   bila satu mekanik terbukti butuh Canvas — diputuskan di tahapnya.
5. Konten memakai file `.ts` bertipe (bukan `.json`) supaya type-safe dan
   konsisten dengan konten situs yang sudah ada (`lib/adiwiyata-site-content.ts`).
6. Tong sampah memakai sistem asli SMAN 55 (4 tong: Organik hijau,
   Anorganik daur ulang kuning, Residu abu-abu, B3 merah; plastik masuk
   Anorganik) — sama seperti gambar Anatomy dan video edukasi.
7. "Tebak dulu" Bab 1 memakai angka yang jujur: bila tidak ada data asli
   sekolah, pertanyaan memakai kisaran/estimasi yang diberi label jelas
   sebagai perkiraan (tidak mengarang angka pasti atas nama sekolah).
8. Estimasi waktu per bab (±8-12 menit) adalah target desain; waktu nyata
   diukur saat uji Tahap 5 dan disesuaikan di Tahap 7 bila meleset jauh.
9. Semua suara disintesis dengan Web Audio API (tanpa file mp3/ogg): 0 byte
   aset, tanpa urusan lisensi; CREDITS.md tidak diperlukan untuk audio.
   Musik latar generatif per bab (bukan rekaman).

## 11. Sistem suara (tambahan user 24 Nov 18:23)

- AudioManager terpusat (singleton) di `components/game/apa-itu-adiwiyata/suara.ts`:
  SFX + musik generatif per bab, dibuat di Tahap 2. SFX disambungkan di tiap
  mini-game saat mini-game itu dibuat; musik per bab disambungkan di Tahap 7.
- Audio baru dimulai setelah interaksi pertama (blokir autoplay browser).
  Jeda musik otomatis saat tab tidak aktif (`visibilitychange`), lanjut saat kembali.
- Pengaturan di menu Profil: slider Musik, slider Efek, tombol Mute semua;
  tersimpan di save kampanye (`volumeMusik`, `volumeEfek`, `muted`).
  Tombol mute juga ada di setiap layar mini-game.
- Musik latar per suasana: menu/peta santai, Bab 1-2 riang, Bab 3 bubbly,
  Bab 4 tenang, Bab 5 mengalir, Bab 6 tegang (tempo naik saat waktu menipis),
  tamat meriah.
- SFX: klik, ambil/lepas, benar (nada naik saat combo), salah (bonk lucu),
  whoosh + plop (basket), koin, nyawa, lalat, hujan, badai, maggot, panen,
  siram, tumbuh, burung, checkpoint bendera, lencana, naik level, fanfare
  sertifikat, tik timer.
- Gumam karakter Magi (nada tinggi) dan Pak Plastik (nada rendah) tiap dialog,
  gaya Animal Crossing, tanpa voice acting.
- Aksesibilitas: tiap SFX penting punya pasangan visual (getaran layar kecil,
  ikon, atau teks); hormati `prefers-reduced-motion`; opsi getar
  (`navigator.vibrate`) di HP.
- Keputusan: tanpa file audio sama sekali (sintesis Web Audio) — lihat asumsi 9.

## 12. Mode Jelajah (dunia yang bisa dijelajahi, ditambahkan 24 Nov)

Atas permintaan user ("rubah semuanya jadi seperti itu bisa keliling dan interaksi"), tab Peta Sekolah diganti dunia top-down yang bisa dijelajahi. Mini-game, progres, dan sistem pendukung tidak berubah — dunia adalah cara baru masuk ke bab.

- **Dunia** (`lib/apa-itu-adiwiyata/dunia.ts`): 960×640 unit, 8 zona (Gerbang, Kantin, Pos Maggot, Kompos, Kebun, Taman Air, Panel Surya, Pohon) dipetakan ke 6 bab; 23 dinding (tepi, bangunan zona, pohon); 12 titik sampah; 8 NPC. Geometri terverifikasi BFS: semua zona/NPC/sampah terjangkau dari spawn Gerbang.
- **NPC** (`lib/apa-itu-adiwiyata/content/npc.ts`): Magi, Pak Plastik, Kang Kantin, Pak Kebun, Mbak Rani, Bu Sari, Dimas, Sinta — masing-masing sapaan + 3 baris + tips. NPC dengan `chapterId` membuka babnya bila sudah terbuka (aturan `selectChapterUnlocked` yang sama).
- **Explorer** (`components/game/apa-itu-adiwiyata/jelajah.tsx`): Canvas + rAF, kamera mengikuti pemain, joystick virtual + WASD/panah + E/Enter/Spasi, tabrakan AABB (geser di dinding), dialog overlay DOM (role=dialog, terbaca pembaca layar), sampah dipungut +5 Koin Hijau (EARN_COINS), toast nama zona, zona terkunci digelapkan + label "Terkunci", `prefers-reduced-motion` mematikan goyangan.
- **Integrasi** (`components/game/apa-itu-adiwiyata/index.tsx`): tab 'peta' merender `Jelajah`; tombol "Jelajahi Sekolah" di menu utama; bab yang dibuka dari dunia kembali ke dunia saat keluar (kecuali tamat); label tab jadi "Jelajah". Komponen lama `peta-sekolah.tsx` (grid zona statis) dihapus karena tidak terpakai.
- **Asumsi**: posisi pemain tidak disimpan (spawn ulang di Gerbang tiap masuk dunia); sampah muncul lagi tiap masuk dunia (12 per kunjungan); zona terkunci tetap bisa dimasuki pejalan kaki, hanya babnya yang tidak bisa dimulai dari NPC-nya.

## 13. Dunia + misi menggantikan menu bab; 2 game lama dihapus (24 Nov)

Atas permintaan user ("Hanya game apa itu Adiwiyata" + "rubah cara mainnya lewat menjelajah sekolah dan menjalankan misi-misinya"): game Tangkap Sampah dan Kuis Adiwiyata dihapus, menu kartu GameHub dihapus, dan /game langsung membuka kampanye. Menu "Pilih Bab" kampanye juga dihapus — cara mainnya kini: menjelajah sekolah dan menjalankan misi.

- **Misi = 6 bab yang sama** (`lib/apa-itu-adiwiyata/misi.ts`): tidak ada misi baru yang dikarang. Tiap bab adalah satu misi yang diberikan NPC di zonanya — Gerbang (Pak Plastik), Kantin (Kang Kantin), Pos Maggot (Magi), Kompos dan Kebun (Pak Kebun), Air dan Energi (Mbak Rani), Biodiversitas dan Inspeksi (Bu Sari). Status misi: selesai / tersedia / terkunci, dihitung dari save yang sama (`selectChapterUnlocked`).
- **Runner** (`components/game/apa-itu-adiwiyata/index.tsx`, tanpa props): layar awal langsung dunia (setelah gerbang nama bila belum ada nama panggilan). Tab bawah: Jelajah, Misi, Ensiklopedia, Peringkat, Profil. Bab hanya bisa dimulai dari dialog NPC di dunia; selesai bab kembali ke dunia + kabar "Misi selesai" (kecuali tamat). MenuUtama dihapus (gerbang nama dipindah ke `gerbang-nama.tsx`).
- **Dunia** (`jelajah.tsx`): NPC dengan misi tersedia bertanda "!" emas di atas kepala; bar HUD misi saat ini ("Misi 2/6: Kantin — temui Kang Kantin di Kantin") + tombol "Lihat semua misi"; tombol dialog "Mulai misi" (atau "Main lagi" bila sudah selesai).
- **Tab Misi** (`misi.tsx`): daftar 6 misi + progres + pemberi misi dan lokasinya. Daftar ini informatif saja — misi tidak bisa dimulai dari sini.
- **Dihapus**: `game-hub.tsx`, `tangkap-sampah.tsx`, `kuis-adiwiyata.tsx`, `menu-utama.tsx` (semua via trash, bisa dipulihkan). `app/game/page.tsx` langsung me-render `<ApaItuAdiwiyata />` tanpa props, proteksi login tetap (`getPortalUser` → redirect /sign-in). `game.css` TIDAK dihapus — masih dipakai error boundary dan form laporan.
- **Sisa yang sengaja belum dibersihkan** (tidak rusak, hanya mati): tab leaderboard "Tangkap Sampah"/"Kuis Adiwiyata" (skor lama tetap tampil; tab default masih tangkap_sampah), toggle game di panel admin, endpoint API `/api/game/*` untuk kedua kunci, `lib/game-scoring.ts`/`lib/game-content-seed.ts`, hook `useGameSession` tanpa konsumen. Keputusan pembersihan menunggu user.
- **Asumsi yang dipertahankan**: urutan misi mengikuti urutan bab (buka bab berikutnya butuh bab sebelumnya selesai); checkpoint Pos Hijau tetap berlaku saat misi dilanjutkan lewat NPC; progres lama pemain (localStorage `aia-save-v1`) tetap terbaca.
