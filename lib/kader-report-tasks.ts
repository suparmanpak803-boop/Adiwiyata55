// Tugas 15 jenis kader Adiwiyata 2026.
// Sumber: "DAFTAR URAIAN TUGAS TIAP KADER ADIWIYATA 2026" (spreadsheet
// sekolah) + SK Kepala SMA Negeri 55 Jakarta Nomor 027 Tahun 2026 —
// daftar yang sama dengan halaman Kader Adiwiyata
// (lib/adiwiyata-site-content.ts). Uraian tugas di bawah ini disalin
// kata per kata dari spreadsheet tersebut.
// PENGECUALIAN: Kader Edu-Lingkungan TIDAK punya uraian tugas di
// dokumen mana pun (SK hanya daftar nama, spreadsheet hanya 14 kader).
// Dua tugasnya di bawah ini SEMENTARA — hanya parafrasa ringkasan
// resminya ("Mengedukasi warga sekolah tentang lingkungan hidup dan
// perilaku ramah lingkungan"). Ganti dengan daftar tugas resmi bila
// pengguna sudah mengirimkannya.
// Catatan pemetaan Google Form: formulir mengirim nama kategori
// (selectedKader.name) dan uraian tugas sebagai teks bebas ke
// entry Form (lib/kader-report-gform.ts) — bukan berdasarkan indeks
// atau nama lama — jadi perubahan daftar ini tidak merusak pemetaan
// apa pun. formId + entry Form sendiri masih kosong.
export const KADER_REPORT_TASKS: { name: string; tasks: string[]; sementara?: boolean }[] = [
  {
    name: 'Kader Pilah',
    tasks: [
      'Mengoordinasikan jadwal pengumpulan sampah harian dari seluruh titik ke Tempat Penampungan Sementara (TPS)/Bank Sampah Sekolah.',
      'Memilah kembali sampah yang tercampur agar wadah penampungan sesuai kategorinya.',
      'Memilah sampah anorganik berdasarkan jenisnya (plastik PET, kertas/karton, kaleng, kaca) untuk memudahkan proses daur ulang (recycle) dan penggunaan kembali (reuse).',
      'Mengangkut sampah terpilah ke Bank Sampah Sekolah untuk kemudian ditimbang oleh Kader Bank Sampah.',
      'Mempromosikan dan mengawal gerakan pengurangan penggunaan plastik sekali pakai (single-use plastic) di lingkungan kantin dan kegiatan sekolah.',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan Kader Pilah.',
    ],
  },
  {
    name: 'Kader Olah Organik',
    tasks: [
      'Mengoperasikan dan merawat fasilitas komposter sekolah (seperti biopori atau bak komposting).',
      'Melakukan pencacahan, pembalikan, pencampuran aktivator (EM4/molase), dan pencapaian tingkat kelembapan serta suhu kompos secara berkala.',
      'Mengemas dan memanen pupuk organik padat maupun Pupuk Organik Cair (POC) hasil komposting.',
      'Mendistribusikan pupuk hasil olahan untuk kebutuhan kebun sekolah (Kader TOGA dan Taman) atau dimanfaatkan dalam program kewirausahaan lingkungan (Ecopreneurship).',
      'Membuat dan mencatat tanggal pembuatan larutan Eco Enzyme dalam wadah kedap udara yang sesuai standar safety.',
      'Melakukan pemantauan dan perawatan berkala selama masa fermentasi minimum 3 bulan (termasuk membukakan wadah secara berkala di minggu-minggu awal untuk membuang gas).',
      'Memanen, menyaring, dan mengemas cairan Eco Enzyme serta ampasnya setelah masa fermentasi selesai.',
      'Mengaplikasikan hasil Eco Enzyme untuk kebutuhan operasional sekolah, seperti untuk cairan pembersih lantai dan kaca ramah lingkungan, penghilang bau tak sedap di area toilet/saluran air, serta cairan penyubur tanaman/pengusir hama tanaman.',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan Kader Olah Organik.',
    ],
  },
  {
    name: 'Kader Maggot',
    tasks: [
      'Mengumpulkan dan memilah sampah dapur/kantin sekolah (sisa nasi, lauk, dan buah) yang cocok dijadikan pakan larva maggot.',
      'Melakukan pencacahan atau pemrosesan awal pakan organik agar konsistensinya sesuai untuk konsumsi larva.',
      'Mengelola fasilitas biopond (area pembesaran), kandang lalat BSF dewasa, serta tempat penetasan telur.',
      'Mengatur dan memberi pakan maggot secara teratur serta menjaga tingkat kelembapan media biopond.',
      'Memanen maggot segar/kering untuk dimanfaatkan sebagai pakan ternak (ikan di kolam sekolah, unggas) atau diolah menjadi produk Ecopreneur.',
      'Mencatat timbangan berkala sampah organik yang berhasil dihabiskan oleh larva maggot (data volume pengurangan sampah sekolah).',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan terkait Budidaya Maggot.',
    ],
  },
  {
    name: 'Kader Bank Sampah dan Daur Ulang',
    tasks: [
      'Mengoordinasikan jadwal pengumpulan sampah harian dari seluruh titik ke Tempat Penampungan Sementara (TPS)/Bank Sampah Sekolah.',
      'Mengelola operasional Bank Sampah Sekolah (penimbangan, penataan, pencatatan/pembukuan tabungan sampah murid dan kelas).',
      'Mengintegrasikan hasil olahan sampah anorganik ke dalam program kewirausahaan lingkungan (ecopreneurship) atau pajangan edukasi sekolah (daur ulang).',
      'Membimbing Kader Adiwiyata murid dalam pencatatan debit sampah dan operasional harian Bank Sampah.',
      'Menghitung dan mengarsipkan data tonase/berat sampah yang berhasil dikurangi, didaur ulang, atau dijual ke Bank Sampah (sebagai indikator kinerja penghematan TPA).',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan Kader Bank Sampah dan Daur Ulang.',
    ],
  },
  {
    name: 'Kader Lingkungan Sehat',
    tasks: [
      'Melakukan pemeriksaan rutin terhadap kebersihan, kelayakan, dan kesegaran toilet/jamban sekolah (ketersediaan air, sabun cuci tangan, dan gayung/toilet flush).',
      'Memantau kelancaran saluran air limbah/drainase sekolah agar bebas dari genangan, sampah, maupun potensi sarang nyamuk.',
      'Menjadi pelopor dan mengoordinasikan kegiatan kebersihan rutin, seperti piket kelas harian Pra KBM Pertamanan dan kerja bakti lingkungan.',
      'Melakukan penyiraman, pemangkasan daun kering, dan penyiangan rumput liar/gulma di area taman sekolah secara rutin.',
      'Melakukan pemupukan berkala menggunakan pupuk organik padat/cair buatan Kader Komposting dan Eco-Enzyme.',
      'Membantu penanaman bibit tanaman hias, pohon pelindung, atau vegetasi baru untuk meningkatkan variasi tanaman di sekolah.',
      'Mengawasi dan mengingatkan warga sekolah agar tidak membuang sampah sembarangan di area koridor, taman, lapangan, maupun sudut-sudut sekolah.',
      'Mengedukasi dan mengampanyekan budaya PHBS kepada teman sebaya, seperti tata cara mencuci tangan 6 langkah yang benar dan etika penggunaan toilet bersama.',
      'Memasang dan merawat media edukasi visual (poster/stiker imbauan) mengenai kebersihan dan sanitasi di area strategis.',
      'Melakukan pemantauan keberadaan jentik nyamuk (Jumantik) secara berkala di bak mandi, penampungan air, dan tempat yang berpotensi menampung air hujan.',
      'Melaporkan dengan cepat kepada Guru Pembina/Ketua Tim Adiwiyata jika ditemukan kerusakan fasilitas sanitasi (seperti kran bocor, saluran tersumbat, atau ketersediaan air bersih terganggu).',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan terkait Kader Lingkungan Sehat.',
    ],
  },
  {
    name: 'Kader Hijau dan Biodiversitas',
    tasks: [
      'Melakukan proses penyemaian benih tanaman (seperti kangkung, bayam, pakcoy, atau selada) pada media semai (rockwool atau spons) secara berkala.',
      'Memindahkan bibit yang telah tumbuh ke instalasi hidroponik (netpot).',
      'Mengukur dan mengatur tingkat kepekatan nutrisi (PPM) serta derajat keasaman (pH) air nutrisi pada tanaman Hidroponik secara rutin.',
      'Memeriksa dan memastikan kelancaran sirkulasi air pada sistem instalasi (pompa, pipa, atau talang hidroponik).',
      'Menjaga kebersihan bak penampung nutrisi dan instalasi dari lumut, jentik nyamuk, serta kotoran.',
      'Melakukan penanaman tanaman TOGA baru sehingga memenuhi target sekolah yaitu memiliki minimal 100 jenis tanaman TOGA.',
      'Melakukan penyiraman, pemupukan organik (menggunakan kompos dari Tim 3P), dan pemangkasan tanaman obat (TOGA) secara rutin.',
      'Merawat media tanam serta membersihkan area kebun TOGA dari gulma, rumput liar, dan hama tanaman.',
      'Memanen hasil tanaman obat (TOGA) dan hidroponik yang sudah siap panen.',
      'Berpartisipasi dalam pengolahan hasil TOGA menjadi produk herbal sederhana ramah lingkungan (seperti minuman jamu tradisional, teh herbal, atau olahan pembersih alami) serta hasil Hidroponik.',
      'Mengedukasi dan mengampanyekan pentingnya keanekaragaman hayati dan manfaat tanaman obat (TOGA) dan Hidroponik kepada rekan sejawat/murid.',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan terkait Kader Hijau dan Biodiversitas.',
    ],
  },
  {
    name: 'Kader Energi Lestari',
    tasks: [
      'Melakukan patroli rutin untuk mematikan lampu, kipas angin, AC, dan proyektor di kelas atau ruang operasional yang tidak sedang digunakan.',
      'Memastikan peralatan elektronik dalam posisi off (bukan standby) saat kepulangan sekolah, dan akhir pekan.',
      'Memasang dan merawat media edukasi visual (stiker/label imbauan hemat energi) di dekat sakelar listrik, AC, dan perangkat elektronik.',
      'Membantu memantau pengaturan suhu standar AC sekolah (disarankan pada suhu efisien 24°C–26°C).',
      'Mengedukasi dan mengampanyekan Gerakan Hemat Energi kepada warga sekolah melalui aksi sosialisasi antarkelas atau kampanye digital.',
      'Berpartisipasi aktif dalam pengorganisasian agenda berkala sekolah seperti "Hari Bebas Kendaraan Bermotor Sekolah" (School Car-Free Day).',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan terkait Kader Energi Lestari.',
    ],
  },
  {
    name: 'Kader Air Lestari',
    tasks: [
      'Melakukan pemantauan rutin ke area tempat cuci tangan (CTPS), toilet/jamban, kantin, dan kebun sekolah untuk memastikan kran air ditutup rapat setelah digunakan.',
      'Mengawasi penggunaan air agar warga sekolah tidak membuang-buang air (water wasting) saat berwudhu, mencuci tangan, atau membersihkan alat kebersihan.',
      'Memasang dan merawat media edukasi visual (stiker/label imbauan hemat air) di dekat seluruh titik kran air dan wastafel sekolah.',
      'Membantu memantau keberfungsian dan kebersihan sarana konservasi air sekolah, seperti penampungan air hujan (rainwater harvesting), sumur resapan, dan lubang biopori.',
      'Membantu pemanfaatan kembali air bekas (greywater), seperti air bekas wudhu atau air buangan AC (condensate water) untuk menyiram tanaman atau mengepel lantai.',
      'Mengajak warga sekolah berpartisipasi dalam kampanye perilaku hemat air dalam operasional sehari-hari.',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan terkait Kader Air Lestari.',
    ],
  },
  {
    // SEMENTARA — lihat komentar di atas: belum ada dokumen sumber
    // yang memuat uraian tugas Kader Edu-Lingkungan. Dua tugas di bawah
    // ini hanya parafrasa ringkasan resminya ("Mengedukasi warga
    // sekolah tentang lingkungan hidup dan perilaku ramah lingkungan").
    // Ganti dengan daftar tugas resmi bila sudah ada dari pengguna.
    name: 'Kader Edu-Lingkungan', sementara: true,
    tasks: [
      'Mengedukasi warga sekolah tentang lingkungan hidup',
      'Mengajak warga sekolah berperilaku ramah lingkungan',
    ],
  },
  {
    name: 'Kader Budaya Lingkungan',
    tasks: [
      'Mengoordinasi dan memantau pelaksanaan piket kelas, pemilahan sampah harian, serta gerakan kebersihan lingkungan sekolah.',
      'Mengajak dan memastikan warga sekolah membiasakan diri membawa tempat makan dan tempat minum guna ulang (tumbler dan lunchbox) sendiri dari rumah.',
      'Mengelola kegiatan Lomba Kebersihan berkala serta memberikan penghargaan atau pengakuan (Adiwiyata Award tingkat kelas) bagi kelas paling bersih dan konsisten menjaga lingkungan.',
      'Memperbarui media edukasi visual seperti poster, infografis, atau slogan ajakan menjaga lingkungan di area strategis sekolah.',
      'Mengadakan aksi kampanye interaktif, pertunjukan seni lingkungan, atau ajakan langsung (orasi pendek/flashmob) saat apel atau kegiatan sekolah.',
    ],
  },
  {
    name: 'Kader Inovasi Hijau',
    tasks: [
      'Membuat poster, infografis, atau slogan ajakan mengenai isu ekologi dan Gerakan Literasi dan Inovasi Lingkungan.',
      'Mengajak dan mendampingi murid dalam kegiatan membedah buku, diskusi, atau kajian bertema lingkungan hidup.',
      'Mengidentifikasi permasalahan lingkungan di sekolah dan merancang ide/alat inovatif sederhana sebagai solusinya.',
      'Terlibat dalam pembuatan produk riset lingkungan sederhana berbasis sains, teknologi, dan bahan ulang.',
      'Mengembangkan produk inovasi olahan lingkungan yang ramah ekosistem untuk mendukung program ecopreneurship sekolah.',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan terkait Kader Literasi dan Inovasi Lingkungan.',
    ],
  },
  {
    name: 'Kader Kantin Hijau',
    tasks: [
      'Memantau kebersihan area penyajian, tempat makan, dapur pengolahan, serta sarana cuci piring/tangan di kantin.',
      'Memastikan penjual kantin menggunakan peralatan penyaji yang higienis (seperti penutup makanan, penjepit makanan, atau sarung tangan).',
      'Mengawasi dan mengedukasi pengelola kantin agar tidak menggunakan wadah/kemasan sekali pakai (seperti kantong plastik, styrofoam, dan sedotan plastik).',
      'Memastikan kantin tidak menjual makanan/minuman yang mengandung bahan kimia berbahaya (pengawet, pewarna sintetis mencolok, pemanis buatan, atau penyedap berlebihan).',
      'Mendorong penggunaan kemasan ramah lingkungan, wadah guna ulang, serta membiasakan murid membawa wadah makan dan botol minum sendiri (misting & tumbler).',
      'Memastikan ketersediaan dan pemisahan tempat sampah (organik dan anorganik) yang memadai di area kantin.',
      'Mengoordinasikan penanganan sisa makanan kantin bersama Tim 3P (untuk disalurkan ke Komposting atau Budidaya Maggot).',
      'Memasang dan merawat media edukasi visual (poster/label imbauan) mengenai jajanan sehat, budaya antre, serta larangan menyisakan makanan.',
      'Mengampanyekan budaya konsumsi makanan sehat, bergizi seimbang, dan bebas bahan berbahaya.',
      'Mendokumentasikan serta membuat kolase dokumentasi seluruh kegiatan terkait Kader Kantin Hijau.',
    ],
  },
  {
    name: 'Kader Data Hijau',
    tasks: [
      'Mengumpulkan dan mencatat data dasar (baseline data) terkait pengelolaan lingkungan sekolah, seperti volume sampah harian, jumlah penggunaan listrik/air, serta jumlah dan jenis tanaman.',
      'Menyusun dan memperbarui database program Adiwiyata secara rapi, terstruktur, dan terintegrasi dalam bentuk rekapitulasi digital/fisik termasuk membuat dan memasang atau melakukan peremajaan label nama (papan deskripsi/QR Code) pada setiap jenis tanaman yang memuat nama latin, nama lokal, serta khasiat utamanya.',
      'Memastikan validitas dan akurasi data yang dihimpun dari setiap unit atau kader kelompok kerja (pokja) lain.',
      'Bersama tim Adiwiyata menetapkan target kuantitatif dan kualitatif (misal: persentase penurunan sampah plastik, tingkat efisiensi energi).',
      'Melakukan pemantauan secara rutin terhadap ketercapaian indikator-indikator Adiwiyata di setiap divisi atau kelas.',
      'Menyusun laporan berkala mengenai ketercapaian target Adiwiyata sebagai bahan refleksi bagi Tim Pembina Adiwiyata Sekolah.',
      'Memberikan masukan berbasis data (data-driven) kepada pihak sekolah dan kader lain guna meningkatkan efektivitas program Adiwiyata secara berkelanjutan.',
    ],
  },
  {
    name: 'Kader Eco-Communication',
    tasks: [
      'Mengelola seluruh akun media sosial resmi Adiwiyata/sekolah.',
      'Mengoordinasi forum Adiwiyata melalui media sosial.',
      'Merancang dan membuat konten edukatif (infografis, poster, poster digital, video pendek/reels) terkait budaya ramah lingkungan.',
      'Menayangkan kampanye serta ajakan aksi lingkungan (seperti zero waste, hemat energi, dan pengolahan sampah) secara konsisten.',
      'Mengoordinasi kerjasama dengan pihak/instansi Kesehatan dan Lingkungan Hidup.',
      'Mengelola dan menyusun arsip digital (foto/video kegiatan) secara rapi sebagai bukti fisik/portofolio penilaian dokumen Adiwiyata.',
    ],
  },
  {
    name: 'Kader Jejaring Hijau',
    tasks: [
      'Menjadi penghubung utama antara sekolah dan DLH terkait kebijakan, pedoman, serta pembinaan program Adiwiyata.',
      'Mengoordinasi penyampaian laporan kegiatan lingkungan sekolah ke DLH serta memfasilitasi program bantuan (seperti bibit tanaman, pemilah sampah, atau pelatihan) dari pemerintah.',
      'Memfasilitasi kehadiran narasumber atau verifikator dari DLH saat peninjauan atau penilaian Adiwiyata.',
      'Menyusun proposal kemitraan (sponsorship/CSR) dengan perusahaan atau pelaku usaha lokal untuk mendukung pendanaan dan sarana lingkungan sekolah.',
      'Menjaga transparansi dan memberikan laporan pertanggungjawaban kegiatan (progress report) kepada pihak mitra dunia usaha.',
      'Membangun kemitraan dengan LSM lingkungan, komunitas daur ulang, bank sampah lokal, atau kelompok pemuda lingkungan.',
      'Mengajak komunitas untuk terlibat dalam aksi lingkungan sekolah atau sebaliknya (seperti program bersih sungai, penghijauan wilayah sekitar, atau lokakarya daur ulang).',
      'Melibatkan warga di sekitar lingkungan sekolah dalam gerakan pembiasaan pemilahan sampah dan pengelolaan lingkungan hidup.',
    ],
  },
]
