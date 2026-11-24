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

## 14. Misi Kader, gestur langsung, dan shell visual (24 Nov)

Atas permintaan user ("Samakan misi dengan tugas kader", lalu spesifikasi INTERAKSI MISI 24 Nov 20:00, "Semua 14 misi", dan penolakan tampilan BabShell lama + gambar cover anime): 8 tim kader yang tersisa jadi Misi Kader, semua 14 misi dimainkan dengan gestur langsung, dan BabShell diganti shell visual baru.

- **Misi Kader — trek paralel** (`lib/apa-itu-adiwiyata/tugas.ts`, `content/tugas.ts`, `lib/apa-itu-adiwiyata/types.ts`, `storage.ts`, `context.tsx`): 8 misi penuh 3 tahap (Bank Sampah dan Daur Ulang, Lingkungan Sehat, Edu-Lingkungan, Inovasi Hijau, Kantin Hijau, Data Hijau, Eco-Communication, Jejaring Hijau) dengan judul/deskripsi dari `duties` asli tiap tim di `lib/adiwiyata-site-content.ts`; NPC pemberi misi tokoh fiktif (Kak Bimo, Pak Sehat, Kak Lala, Kak Raka, Mbak Dewi, Kak Fajar, Kak Naya, Pak Jaka) — BUKAN nama koordinator asli SK. Trek paralel, bukan bab 7–14: `isSaveValid` tidak memeriksa field `tugas`, `loadSave` menggabungkan `freshSave()` sehingga save lama tetap jalan; `selectTugasUnlocked` selalu true (tidak berantai); reducer `COMPLETE_TUGAS_STAGE`/`COMPLETE_TUGAS` (koin + pengali streak, tanpa checkpoint Pos Hijau); tamat kampanye utama tidak berubah (hanya 6 bab).
- **Gestur langsung** (`components/game/apa-itu-adiwiyata/interaksi/`, `lib/apa-itu-adiwiyata/content/interaksi.ts`): semua misi dikerjakan dengan Pointer Events (tap, drag, swipe, tahan, putar) — bukan menu/tombol pilihan. Pustaka bersama: DragDrop (target menyala, snap), ThrowAim (lintasan titik-titik), HoldAction (cincin progres), RotateDial, SliderLever, TapSpam, PipePuzzle, HiddenObject + umpan balik (EfekBenar confetti daun, EfekSalah, PetunjukMagi 1 kalimat, TanganPenunjuk). Pemetaan `INTERAKSI_MISI`: 14 misi × 3 tahap = 42 spesifikasi (jenis interaksi, objek, target, hasil benar/salah, petunjuk Magi, tutorial tahap 1) supaya guru bisa menambah misi tanpa ubah kode; semua kuis/pilih diterjemahkan ke drag-drop kartu jawaban (0 jenis 'pilihan'). Aturan: respons <100 ms, salah = akibat visual jelas + petunjuk Magi tanpa hukuman keras, kesulitan adaptif (target membesar setelah 2 gagal), target ≥44px, `prefers-reduced-motion` dihormati. Ke-14 mini-game ditulis ulang ke gestur dengan kontrak props TETAP + prop opsional `modeSatuKetukan` (true = versi tombol lama sebagai alternatif aksesibilitas).
- **Batasan pustaka yang diketahui**: `DragDrop` hanya menerima satu benda → tahap multi-kartu memakai pola "pilih lalu seret" (satu DragDrop) atau helper lokal `SeretKartu` (diduplikasi di bank-sampah, lingkungan-sehat, edu-lingkungan) atau drag lokal (inspeksi, eco-communication, jejaring-hijau). `ThrowAim` tidak punya pemilihan target sendiri → tahap lempar memakai pola bidik-dulu-baru-lempar. `bersihPetunjuk` diduplikasi di tas-pagi + pilah-sampah. `TugasMiniGameSlotProps` didefinisikan per file mini-game tugas + satu lagi di misi-shell — belum disatukan. Bukan bug; refactor menunggu kesempatan.
- **Shell visual baru** (`components/game/apa-itu-adiwiyata/misi-shell.tsx`, menggantikan `bab-shell.tsx`): misi dibuka dengan gambar cover + 1 baris tugas, lalu langsung masuk permainan gestur; indikator 3 titik (bukan daftar tahap); tahap berjalan berurutan otomatis; tombol "Main lagi" kecil untuk tahap selesai; petunjuk Magi maks 1 kalimat di dalam permainan; Pos Hijau di akhir (bab: bonus rapor pertama kali, lencana, kartu ensiklopedia, janji, spesies Bab 6, KejadianAcak; tugas: lencana tugas + 'kader-lengkap' bila semua 8 selesai). `bab-shell.tsx` tidak lagi dipakai — tipe `MiniGameSlotProps` dipindah ke `misi-shell.tsx` (isi sama) supaya file lama bisa dihapus.
- **Cover gaya bersih** (`public/images/game/misi/<id>.jpg`, 14 file, 2048×1152): gaya yang disetujui user 24 Nov 20:13 — latar krem polos, banyak ruang kosong, objek misi sederhana di tengah, Magi kecil di pojok, tanpa orang dan tanpa teks (gaya "Tantangan 3 detik"). Menggantikan 14 cover gaya anime yang ditolak user 20:11.
- **Mode satu-ketukan** (aksesibilitas): toggle di Profil → tersimpan di save (`modeSatuKetukan`, default false; save lama mendapat false dari `freshSave()` saat `loadSave`) → disalurkan `MisiShell` ke semua mini-game. Dipertahankan juga saat `START_NEW` (seperti pengaturan suara).
- **Integrasi (G3)**: `index.tsx` memakai `MisiShell` untuk layar 'bab' + layar baru 'tugas'; tab Misi (`misi.tsx`) tambah seksi Misi Kader (informatif, tanpa tombol mulai); dunia (`jelajah.tsx`): tanda "!" + tombol dialog "Mulai misi" untuk NPC tugas, HUD Misi Kader bila misi utama sudah selesai; helper status di `lib/apa-itu-adiwiyata/misi.ts` (`pemberiTugas`, `statusTugas`, `tugasSaatIni`, `jumlahTugasSelesai`).
- **Lencana baru** (`lib/apa-itu-adiwiyata/lencana.ts`): 8 lencana tugas (`juragan-bank-sampah`, `penjaga-sehat`, `guru-lingkungan`, `inovator-hijau`, `penjaga-kantin`, `juru-data`, `duta-komunikasi`, `duta-jejaring`) + `kader-lengkap`; ekspor `TUGAS_BADGE: Record<TugasKaderId, string>`.

## 15. Dunia yang hidup + cerita bercabang (24 Nov)

Atas permintaan user ("Tolong jangan gestur aja, buat yang lain yang lebih inovatif dan interaktif") — user memilih DUA arah: Dunia yang hidup dan Cerita bercabang. Dikerjakan dalam gelombang (A desain+data → B UI dunia → C UI cerita → D verifikasi + tombol keluar).

- **Dunia Hidup — simulasi** (`lib/apa-itu-adiwiyata/dunia-hidup.ts`, semua fungsi murni): state di save (`dunia`): 3 petak kebun (kangkung, cabai, bayam; tahap 0 benih, 1 tunas, 2 semak, 3 berbunga; `layu` bila tidak disiram ≥2 hari, pulih dengan disiram), maggot (`lapar` 0–100, tahap 0–2, naik tiap 3× diberi makan), `sampahLiar` 0–12, `hariTerakhirKunjung` (YYYY-MM-DD lokal). `majukanDunia(dunia, sekarang, adaMisiBelumSelesai)` — hitung hari berlalu (clamp 0–30): tanaman yang disiram dalam 2 hari terakhir naik 1 tahap/hari, yang tidak disiram ≥2 hari layu; lapar maggot +25/hari (maks 100); sampah liar +1/hari (maks 12) selama masih ada misi utama yang belum selesai; kembalikan state baru + daftar `peristiwa` untuk Laporan Pagi. Aksi murni `siramTanaman` / `beriMakanMaggot` / `bersihkanSampah` / `panenTanaman` / `panenKasgot` (kembalikan `{ dunia, koin, pesan }`; koin siram/makan/bersih +5, panen/kasgot +20; bersihkan saat sampah 0 → koin 0 supaya tidak difarming; panen kasgot memupuk petak tahap terendah +1). Posisi dunia: petak di zona Kebun di luar dinding bedeng (petak-1 digeser ke (450,60) supaya tidak menumpuk NPC Pak Kebun di (440,90)), kotak maggot di (760,400) di zona Pos Maggot.
- **Dunia Hidup — UI** (`components/game/apa-itu-adiwiyata/jelajah.tsx`, `laporan-pagi.tsx`, `index.tsx`): Canvas menggambar petak per tahap tumbuh + layu (daun cokelat + tetes air), kotak maggot (larva sebanyak tahap+1, bar lapar hijau/kuning/merah + "!" bila lapar ≥75), sampah liar (N titik pertama `DUNIA.sampah`, N = `sampahLiar`), dan tint waktu dari jam nyata (pagi hangat, siang netral, sore jingga, malam biru gelap tipis). Perawatan lewat ketuk sederhana (bukan gestur rumit): petak → siram (atau panen bila tahap 3), kotak maggot → beri makan (atau panen kasgot bila tahap 2, target otomatis petak tahap terendah), sampah → bersihkan; ketuk hanya bila pemain ≤70 unit dari objek. Pungut sampah lama digabung ke sistem baru (jalan mendekat atau ketuk → `PERAWATAN_DUNIA 'bersihkan'`, koin +5 dari reducer, tidak ada `EARN_COINS` ganda); HUD kini "Sampah liar: N". `majukanDunia` dipanggil sekali per sesi dari runner `index.tsx` (Shell pemilik `hydrated`, jalan apa pun tab awalnya); `LaporanPagi` tampil di atas tab peta bila ada peristiwa hari baru (1× per sesi, bisa ditutup). Catatan: ketukan tepat di petak-1 bisa membuka dialog Pak Kebun dulu (NPC dicek dulu, radius ketuk 46) — petak tetap bisa diketuk dengan sedikit bergeser.
- **Cerita Bercabang — data** (`lib/apa-itu-adiwiyata/content/cerita.ts`): `PILIHAN_CERITA`: 6 misi utama × 2 titik (titik 1 `kapan:'npc'` di dialog NPC pemberi misi, titik 2 `kapan:'tengah'` sebelum tahap ke-3); tiap opsi: teks singkat (maks ~8 kata), akibat 1 kalimat, dan sebagian membawa `pakPlastik`. Alur Pak Plastik: status `netral`/`dibujuk`/`dilawan`/`dijebak`, ditentukan opsi di misi 1–3 (misi 1 wajib melibatkan Pak Plastik langsung), misi 4–6 hanya merespons. `EPILOG_MISI` + helper `pilihEpilog`: 2 varian akhir per misi berdasarkan pilihan (bonus 30 vs 15 koin). `DIALOG_PAK_PLASTIK` (netral disalin verbatim dari `npc.ts`) + `DIALOG_MAGI_PAK_PLASTIK` (komentar Magi per status). Semua teks dari nol, konsisten dengan tokoh dan isi misi; tidak ada fakta baru tentang sekolah.
- **Cerita Bercabang — UI** (`pilihan-cerita.tsx`, `misi-shell.tsx`, `jelajah.tsx`, `content/npc.ts`): komponen `PilihanCerita({ titik, onSelesai })` — situasi 1 kalimat + 2–3 tombol opsi (≥44px), lalu akibat 1 kalimat + tombol "Lanjut". Titik 1 muncul di akhir dialog NPC pemberi misi utama (bila misi terbuka dan pilihan belum dibuat); titik 2 menggantikan slot mini-game sebelum tahap ke-3. Epilog tampil di Pos Hijau (bab saja) dengan keterangan bonus; bonus diberikan sekali saat pertama menyelesaikan misi (`EARN_COINS` di `selesaikanMisi`, main ulang tidak dapat lagi). `dialogDenganIngatan(id, pakPlastik)` di `npc.ts`: Pak Plastik memakai varian per status, Magi mendapat tambahan baris komentar tentang Pak Plastik. Pilihan TIDAK pernah memblokir misi — semua opsi mengarah ke misi yang sama; yang berbeda hanya teks, epilog, dan bonus. Pemain yang membuka misi lewat tab Misi tanpa bicara ke NPC melewatkan titik 1 (epilog jatuh ke varian lain + 15 koin).
- **Save + context**: `CampaignSave` + `dunia: DuniaHidup`, `cerita: Record<string,string>` (kunci `${misi}:${titikId}` → id opsi), `pakPlastik: PakPlastikStatus`; `freshSave()` mengisi default (dunia segar, cerita kosong, pakPlastik 'netral'); `loadSave` menggabungkan default sehingga save lama tetap valid + normalisasi sempit bila `dunia` tersimpan rusak; `isSaveValid` tidak diubah. Aksi baru `MAJUKAN_DUNIA`, `PERAWATAN_DUNIA` (koin internal, satu dispatch), `PILIH_CERITA`. `START_NEW` ikut me-reset dunia/cerita (fresh save).
- **Tombol Keluar** (tambahan user, Gelombang D): bar atas runner `index.tsx` — tombol "Keluar" (ikon + teks, ≥44px, kelas `.aia-btn` yang sama sehingga terbaca di mode gelap) selalu terlihat di semua layar, di atas HUD dunia dan tombol bisu. Ketuk → dialog konfirmasi "Keluar dari game? Progresmu tersimpan otomatis." dengan tombol "Keluar" (ke `/` — portal, tempat game dibuka, terverifikasi `portal.tsx:311` `router.push('/game')` dari `app/page.tsx`) dan "Tetap main". Musik berhenti sendiri saat runner unmount (cleanup `stopMusic` yang sudah ada).

## 16. Variasi mekanik — tiap misi cara mainnya beda (24 Nov)

Atas umpan balik user (screenshot misi Edu-Lingkungan, "Bentuk interaktif lainnya lah bosen ini mulu"): 30 dari 42 tahap memakai pola seret-kartu yang sama. User menyetujui peta variasi ("Ya, buat semua") — tiap misi mendapat mekanik berbeda, isi misi tetap sama. Dikerjakan dalam gelombang (V1 pustaka → V2 tulis ulang 14 mini-game → V3 pemetaan + verifikasi).

- **V1 — pustaka mekanik baru** (`components/game/apa-itu-adiwiyata/interaksi/`, 13 komponen generik baru, tanpa isi misi): TangkapJatuh (objek jatuh, keranjang ikut pointer/panah keyboard), SortirCepat (ban berjalan + bar waktu per item + ketuk target), KuisKilat (soal + bar waktu + bonus beruntun), KartuMemori (balik 2 kartu, pasangkan), PuzzleGeser (grid 3×3, ketuk 2 petak untuk tukar; skor 100 − 5 per tukar di atas minimal), CariPerbedaan (dua panel, ketuk sel yang berbeda), GambarGrafik (ketuk naik/turun batang sampai sesuai data + tombol Periksa), SusunCerita (ketuk frame sesuai urutan), BalasCepat (pesan masuk + timer, ketuk balasan terbaik), SimulasiKantin (pesanan datang bergantian + timer, ketuk tindakan), SusunMenara (ketuk kandidat lapisan, tumpuk selang-seling), SiramRitme (ketuk mengikuti metronom berbasis `performance.now()`, penilaian Sempurna ±150ms / Bagus ±350ms), PanenKetuk (objek muncul bergantian, ketuk yang matang). Semua: `'use client'`, style inline `.aia-gi-*`, SFX dari `suara.ts`, `onSelesai` tepat satu kali, target ≥44px, hormat `prefers-reduced-motion`, terekspor dari barrel `index.ts`. PipePuzzle + TapSpam dipakai ulang (tidak dibuat ulang).
- **V2 — peta per misi** (kontrak props + nama ekspor TETAP, versi tombol lama dipertahankan sebagai `modeSatuKetukan`): Gerbang T1–T2 TangkapJatuh (T3 ThrowAim tetap; sub-bagian "Tebak dulu" tetap DragDrop); Kantin T1–T2 SortirCepat (T3 ThrowAim tetap); Maggot T1 TangkapJatuh (T2 SliderLever + T3 HoldAction tetap); Kompos T1 SusunMenara, T2 SiramRitme, T3 PanenKetuk; Air & Energi T2 PipePuzzle 3×3 (T1 RotateDial + T3 HiddenObject tetap); Biodiversitas T1–T3 KuisKilat; Bank Sampah T1 SortirCepat, T2 ketuk-sel-tabel lokal, T3 KuisKilat; Lingkungan Sehat T1–T3 CariPerbedaan + ketuk kartu tindakan; Edu-Lingkungan T1–T3 KartuMemori (4 pasang per tahap); Inovasi Hijau T1–T3 PuzzleGeser; Kantin Hijau T1–T3 SimulasiKantin; Data Hijau T1–T3 GambarGrafik + KuisKilat soal tabel (skor 50/50); Eco-Communication T1–T3 SusunCerita; Jejaring Hijau T1–T3 BalasCepat.
- **Bug pustaka yang diperbaiki koordinator saat V2**: `BalasCepat` dan `SimulasiKantin` mengacak urutan tombol di badan render — timer (re-render tiap 100 ms) membuat tombol berpindah-pindah dan tidak bisa diketuk. Diperbaiki dengan `useMemo` per pesan/pesanan; komponen lain diperiksa dan aman (acak hanya di initializer state / handler / fungsi petunjuk).
- **Pemetaan yang perlu diketahui** (terdokumentasi di komentar tiap file): komponen pustaka hanya melaporkan skor akhir, bukan hasil per item — jadi aturan per-item dipetakan ke ambang skor (TasPagi skor <45 = gagal; Pilah skor <64 = gagal; carryover Pilah didekati: bila ada jawaban salah dan deck berisi item pemicu, pemicu dicatat lalu `hitungDampak` + `SET_CARRYOVER` jalan); jumlah tangkapan salah maggot T1 diurai kembali dari rumus skor komponen; `PetunjukMagi` tampil sebagai petunjuk tetap / tombol "Minta petunjuk Magi" / di kartu atas tahap pada komponen tanpa callback salah per aksi (bukan otomatis setelah 2 gagal); KuisKilat tanpa callback per jawaban (inspeksi); Data Hijau T2 memakai nilai yang dihemat (2/15/2), bukan nilai mentah 180; `modeSatuKetukan` komponen pustaka dipakai juga sebagai mode mudah (jatuh lebih pelan / waktu 2× / toleransi lebih longgar) — dikomentari di kode supaya tidak tertukar dengan mode satu-ketukan mini-game.
- **V3 — pemetaan + verifikasi**: `content/interaksi.ts` diperbarui — `JenisInteraksi` bertambah 14 jenis baru (tangkap-jatuh, sortir-cepat, kuis-kilat, kartu-memori, puzzle-geser, cari-perbedaan, gambar-grafik, susun-cerita, balas-cepat, simulasi-kantin, susun-menara, siram-ritme, panen-ketuk, ketuk-sel); tetap 42 spesifikasi, 0 jenis 'pilihan', 0 tahap berjenis 'drag-drop' (drag-drop tetap ada di union + dipakai sub-bagian "Tebak dulu" Gerbang T1); `target`/`langkah`/`hasilBenar`/`hasilSalah`/`petunjukMagi` yang masih menyebut "seret" diganti sesuai mekanik baru (sisa 2: kosakata di komentar header + langkah tebak-dulu yang memang masih seret). Verifikasi akhir koordinator: `npx tsc --noEmit` 0 error; kontrak ke-14 mini-game tidak berubah.
