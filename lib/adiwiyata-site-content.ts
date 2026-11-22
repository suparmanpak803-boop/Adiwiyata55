// Konten situs Informasi Adiwiyata (halaman /adiwiyata/*).
// Modul ini client-safe: tanpa akses DB. Pembacaan dari DB ada di
// lib/adiwiyata-site-content.server.ts (key app_settings
// 'adiwiyata_site_content').
//
// PERINGATAN: string default di bawah ini adalah rekonstruksi —
// tidak ada salinan teks aslinya yang tersisa di repo (lihat
// PERBAIKAN.md). Satu-satunya petunjuk yang tersisa: ada aktivitas
// default yang judulnya mengandung "Drainase". Admin dapat mengubah
// semua teks ini lewat panel "Atur Informasi Adiwiyata" tanpa
// menyentuh kode.
export type AdiwiyataSiteContent = {
  home: {
    eyebrow: string
    title: string
    emphasis: string
    description: string
    primaryAction: string
    secondaryAction: string
    caption: string
    visualLabel: string
    visualTitle: string
    visualSchool: string
    activitiesEyebrow: string
    activitiesTitle: string
    activitiesLink: string
    profileEyebrow: string
    profileTitle: string
    profileDescription: string
    footerText: string
  }
  pages: {
    profil: {
      title: string
      intro: string
      historyEyebrow: string
      historyTitle: string
      historyBody: string
      programsEyebrow: string
      programsTitle: string
      programsBody: string
      noteTitle: string
      noteBody: string
    }
    program: { title: string; intro: string }
    dokumentasi: { title: string; intro: string }
    struktur: { title: string; intro: string }
    publikasi: { title: string; intro: string }
    dokumen: { title: string; intro: string; noteTitle: string; noteBody: string }
  }
  activities: { title: string; category: string; date: string; description: string; images?: string[] }[]
  divisions: { name: string; focus: string; duties: string; tasks?: string[] }[]
  articles: { title: string; category: string; date: string; description: string; source: string }[]
}

export const DEFAULT_ADIWIYATA_SITE_CONTENT: AdiwiyataSiteContent = {
  home: {
    eyebrow: 'PROGRAM ADIWIYATA',
    title: 'Sekolah Peduli',
    emphasis: 'dan Berbudaya Lingkungan',
    description:
      'SMAN 55 Jakarta mengajak seluruh warga sekolah memilah sampah, menghemat energi, dan merawat lingkungan — setiap hari, bukan hanya saat lomba.',
    primaryAction: 'Lihat program & kegiatan',
    secondaryAction: 'Unduh dokumen',
    caption: 'Aksi nyata, tercatat bersama.',
    visualLabel: 'GERAKAN SEKOLAH',
    visualTitle: 'Adiwiyata 55',
    visualSchool: 'SMAN 55 Jakarta',
    activitiesEyebrow: 'KEGIATAN TERKINI',
    activitiesTitle: 'Aksi nyata warga sekolah',
    activitiesLink: 'Lihat semua kegiatan',
    profileEyebrow: 'TENTANG KAMI',
    profileTitle: 'Sekolah yang belajar dari alam',
    profileDescription:
      'Adiwiyata SMAN 55 Jakarta adalah gerakan warga sekolah untuk hidup bersih, memilah sampah, dan menjaga lingkungan sekolah tetap hijau.',
    footerText: 'Adiwiyata SMAN 55 Jakarta — Sekolah Peduli dan Berbudaya Lingkungan.',
  },
  pages: {
    profil: {
      title: 'Profil',
      intro: 'Sejarah, praktik, dan komitmen SMAN 55 Jakarta sebagai sekolah Adiwiyata.',
      historyEyebrow: 'SEJARAH',
      historyTitle: 'Perjalanan Adiwiyata 55',
      historyBody:
        'Gerakan Adiwiyata di SMAN 55 Jakarta dimulai dari kebiasaan sederhana: memilah sampah di kelas, membawa tumbler, dan merawat taman sekolah. Dari kebiasaan itu tumbuh program yang melibatkan seluruh warga sekolah.',
      programsEyebrow: 'PRAKTIK SEKOLAH',
      programsTitle: 'Yang kami lakukan setiap hari',
      programsBody:
        'Setiap kelas memilah sampah dan mencatat setoran hariannya. Kader lingkungan memantau kebersihan, drainase, dan taman. Hasilnya dipantau lewat dashboard dan diapresiasi lewat leaderboard.',
      noteTitle: 'Catatan kelengkapan',
      noteBody: 'Dokumen pendukung program Adiwiyata tersedia di halaman Dokumen & Arsip.',
    },
    program: {
      title: 'Program & kegiatan',
      intro: 'Program dan kegiatan lingkungan yang dijalankan warga SMAN 55 Jakarta.',
    },
    dokumentasi: {
      title: 'Kader Adiwiyata',
      intro: 'Daftar 15 kader Adiwiyata SMAN 55 Jakarta beserta uraian tugas masing-masing (2026).',
    },
    struktur: {
      title: 'Struktur Petugas Adiwiyata',
      intro: 'Batang, cabang, dan daun — kenali pembina, pengurus inti, dan tim yang merawat SMAN 55 Jakarta.',
    },
    publikasi: {
      title: 'Artikel & berita',
      intro: 'Artikel dan kabar terbaru seputar gerakan Adiwiyata SMAN 55 Jakarta.',
    },
    dokumen: {
      title: 'Dokumen & arsip',
      intro: 'Arsip dokumen resmi program Adiwiyata SMAN 55 Jakarta.',
      noteTitle: 'Pemberitahuan',
      noteBody: 'Dokumen diunggah oleh Admin. Bila tautan tidak dapat dibuka, hubungi Admin Adiwiyata.',
    },
  },
  activities: [
    {
      title: 'Pembibitan TOGA',
      category: 'Penghijauan',
      date: 'Juli 2024 & Agustus 2025',
      description:
        'Pembibitan TOGA dalam dua tahap (Juli 2024 dan Agustus 2025) untuk memastikan bibit berkualitas. Kader TOGA (siswa dan guru) belajar langsung membenih dan merawat tanaman obat keluarga.',
      images: ['/dokumentasi/pembibitan-toga-1.jpg', '/dokumentasi/pembibitan-toga-2.jpg'],
    },
    {
      title: 'Pemeliharaan Hidroponik',
      category: 'Hidroponik',
      date: 'Juli 2024 – Januari 2025',
      description:
        'Piket harian kader guru dan siswa: membuat cairan nutrisi AB Mix, mengecek tanaman, serta memantau pH dan suhu air. Periode 1 (17 Juli 2024) dan periode 2 (23 Januari 2025).',
      images: ['/dokumentasi/pemeliharaan-hidroponik-1.jpg', '/dokumentasi/pemeliharaan-hidroponik-2.jpg'],
    },
    {
      title: 'Penanaman & Peremajaan TOGA',
      category: 'Penghijauan',
      date: 'September 2024',
      description:
        'Penanaman dari bibit hasil pembenihan dan benih Agrowisata, dilanjutkan peremajaan berkala: mengganti tanaman yang tidak produktif, memangkas, dan memupuk. Melibatkan siswa, guru, orang tua, kepala sekolah, dan Kasubag TU.',
      images: ['/dokumentasi/penanaman-peremajaan-toga-1.jpg', '/dokumentasi/penanaman-peremajaan-toga-2.jpg'],
    },
    {
      title: 'Membersihkan Lapangan',
      category: 'Kebersihan',
      date: '17 & 20 September 2024',
      description:
        'Kerja bakti warga sekolah dua minggu sekali dan petugas kebersihan setiap hari. Pembersihan detail juga dilakukan sebelum kegiatan kesiswaan yang dikoordinir OSIS.',
      images: ['/dokumentasi/membersihkan-lapangan-1.jpg', '/dokumentasi/membersihkan-lapangan-2.jpg'],
    },
    {
      title: 'Membersihkan Selasar',
      category: 'Kebersihan',
      date: '18 & 20 September 2024',
      description: 'Setiap hari oleh petugas caraka dan piket harian siswa sepulang sekolah.',
      images: ['/dokumentasi/membersihkan-selasar-1.jpg', '/dokumentasi/membersihkan-selasar-2.jpg'],
    },
    {
      title: 'Membersihkan Toilet',
      category: 'Kebersihan',
      date: 'Setiap hari & 13 Agustus 2024',
      description:
        'Rutin setiap hari oleh petugas kebersihan (caraka); peserta didik membantu saat kerja bakti dua mingguan. 9 peserta. Bentuk kesadaran bersama menjaga toilet tetap bersih.',
      images: ['/dokumentasi/membersihkan-toilet-1.jpg', '/dokumentasi/membersihkan-toilet-2.jpg'],
    },
    {
      title: 'Membersihkan Kelas',
      category: 'Kebersihan',
      date: 'Setiap hari & 2 minggu sekali',
      description:
        'Piket harian sepulang sekolah dan kerja bakti dua minggu sekali dengan pantauan guru/wali kelas. Setiap kelas: 7 siswa merawat taman, sisanya membersihkan kelas.',
      images: ['/dokumentasi/membersihkan-kelas-1.jpg', '/dokumentasi/membersihkan-kelas-2.jpg'],
    },
    {
      title: 'Pemeliharaan Lahan TOGA',
      category: 'Penghijauan',
      date: 'Rutin setiap hari',
      description:
        'Piket bergilir perwakilan siswa, orang tua, dan guru: menyiram tanaman, memangkas yang layu atau lebat, serta membersihkan lahan dari gulma dan sampah.',
      images: ['/dokumentasi/pemeliharaan-toga-1.jpg', '/dokumentasi/pemeliharaan-toga-2.jpg'],
    },
    {
      title: 'Sosialisasi Sekolah Bebas Plastik',
      category: 'Pengelolaan Sampah',
      date: '2024',
      description:
        'Sosialisasi ke peserta didik, orang tua, guru, pihak kantin, dan kepala sekolah: memahami pengelolaan sampah plastik dan beralih dari plastik sekali pakai ke wadah yang dapat digunakan kembali atau didaur ulang.',
      images: ['/dokumentasi/sekolah-bebas-plastik-1.jpg', '/dokumentasi/sekolah-bebas-plastik-2.jpg'],
    },
    {
      title: 'Kebersihan oleh Beberapa Unsur Warga',
      category: 'Kebersihan',
      date: '2024',
      description: 'Kegiatan kebersihan yang melibatkan berbagai unsur warga sekolah.',
      images: ['/dokumentasi/kebersihan-warga-1.jpg'],
    },
  ],
  divisions: [
    {
      name: 'Kader Pilah',
      focus: 'Pemilahan sampah',
      duties: 'Mengumpulkan dan memilah sampah harian dari seluruh titik ke TPS/Bank Sampah Sekolah.',
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
      focus: 'Kompos & Eco Enzyme',
      duties: 'Mengolah sampah organik menjadi kompos, pupuk organik cair, dan Eco Enzyme.',
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
      focus: 'Budidaya maggot BSF',
      duties: 'Mengolah sampah dapur/kantin menjadi pakan larva maggot (BSF).',
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
      focus: 'Bank sampah & daur ulang',
      duties: 'Mengelola operasional Bank Sampah Sekolah dan pemanfaatan sampah anorganik.',
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
      focus: 'Kebersihan & sanitasi',
      duties: 'Menjaga kebersihan toilet, drainase, dan taman sekolah serta budaya PHBS.',
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
      focus: 'TOGA & hidroponik',
      duties: 'Merawat tanaman TOGA dan hidroponik serta keanekaragaman hayati sekolah.',
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
      focus: 'Hemat energi',
      duties: 'Mengawal penghematan listrik dan Gerakan Hemat Energi di sekolah.',
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
      focus: 'Hemat air',
      duties: 'Mengawal penghematan dan konservasi air di sekolah.',
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
      name: 'Kader Edu-Lingkungan',
      focus: 'Edukasi lingkungan',
      duties: 'Mengedukasi warga sekolah tentang lingkungan hidup dan perilaku ramah lingkungan.',
    },
    {
      name: 'Kader Budaya Lingkungan',
      focus: 'Budaya & lomba kebersihan',
      duties: 'Membangun budaya peduli lingkungan melalui piket, lomba, dan kampanye.',
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
      focus: 'Literasi & inovasi lingkungan',
      duties: 'Mengembangkan literasi, riset, dan produk inovasi ramah lingkungan.',
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
      focus: 'Kantin sehat',
      duties: 'Memastikan kantin bersih, higienis, dan bebas plastik sekali pakai.',
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
      focus: 'Data & pelaporan',
      duties: 'Mengumpulkan, memvalidasi, dan melaporkan data program Adiwiyata.',
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
      focus: 'Media sosial & kampanye',
      duties: 'Mengelola media sosial dan konten edukasi lingkungan sekolah.',
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
      focus: 'Kemitraan & DLH',
      duties: 'Menjadi penghubung sekolah dengan DLH, mitra usaha, dan komunitas lingkungan.',
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
  ],
  articles: [
    {
      title: 'SMAN 55 Jakarta Terus Bergerak Menuju Sekolah Adiwiyata',
      category: 'Berita',
      date: 'November 2026',
      description: 'Warga sekolah menjalankan program pemilahan sampah, bank sampah, dan kebun sekolah secara rutin.',
      source: 'Tim Adiwiyata SMAN 55 Jakarta',
    },
  ],
}

const MAX_TEXT = 3000

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validText(value: unknown, { required = true }: { required?: boolean } = {}): value is string {
  if (typeof value !== 'string') return false
  if (value.length > MAX_TEXT) return false
  if (required && !value.trim()) return false
  return true
}

function parseStringFields(record: Record<string, unknown>, fields: string[]): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const field of fields) {
    if (!validText(record[field])) return null
    out[field] = record[field] as string
  }
  return out
}

function parseItemList<T extends Record<string, unknown>>(
  value: unknown,
  fields: string[],
  extra?: (item: Record<string, unknown>, parsed: Record<string, unknown>) => boolean,
): T[] | null {
  if (!Array.isArray(value) || value.length > 50) return null
  const out: T[] = []
  for (const item of value) {
    if (!isStringRecord(item)) return null
    const parsed = parseStringFields(item, fields)
    if (!parsed) return null
    if (extra && !extra(item, parsed)) return null
    out.push(parsed as T)
  }
  return out
}

// Daftar alamat foto lokal (mis. /dokumentasi/....jpg). Opsional per item;
// bila ada harus berupa array berisi alamat lokal.
function parseImageList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) return null
  for (const item of value) {
    if (typeof item !== 'string' || !item.startsWith('/') || item.startsWith('//') || item.length > 3000) return null
  }
  return value as string[]
}

// null bila input tidak valid (dipakai route PUT: 400).
export function parseAdiwiyataSiteContent(input: unknown): AdiwiyataSiteContent | null {
  if (!isStringRecord(input)) return null
  const home = isStringRecord(input.home)
    ? parseStringFields(input.home, [
        'eyebrow', 'title', 'emphasis', 'description', 'primaryAction', 'secondaryAction', 'caption',
        'visualLabel', 'visualTitle', 'visualSchool', 'activitiesEyebrow', 'activitiesTitle', 'activitiesLink',
        'profileEyebrow', 'profileTitle', 'profileDescription', 'footerText',
      ])
    : null
  if (!home) return null
  if (!isStringRecord(input.pages)) return null
  const pages = input.pages
  const profil = isStringRecord(pages.profil)
    ? parseStringFields(pages.profil, [
        'title', 'intro', 'historyEyebrow', 'historyTitle', 'historyBody',
        'programsEyebrow', 'programsTitle', 'programsBody', 'noteTitle', 'noteBody',
      ])
    : null
  const program = isStringRecord(pages.program) ? parseStringFields(pages.program, ['title', 'intro']) : null
  const dokumentasi = isStringRecord(pages.dokumentasi) ? parseStringFields(pages.dokumentasi, ['title', 'intro']) : null
  // 'struktur' halaman baru: bila konten lama (disimpan admin sebelum halaman
  // ini ada) belum memilikinya, pakai nilai bawaan supaya parse tidak gagal.
  const struktur = isStringRecord(pages.struktur) ? parseStringFields(pages.struktur, ['title', 'intro']) : null
  const publikasi = isStringRecord(pages.publikasi) ? parseStringFields(pages.publikasi, ['title', 'intro']) : null
  const dokumen = isStringRecord(pages.dokumen) ? parseStringFields(pages.dokumen, ['title', 'intro', 'noteTitle', 'noteBody']) : null
  if (!profil || !program || !dokumentasi || !publikasi || !dokumen) return null

  const activities = parseItemList(input.activities, ['title', 'category', 'date', 'description'], (item, parsed) => {
    if (item.images === undefined) return true
    const images = parseImageList(item.images)
    if (!images) return false
    parsed.images = images
    return true
  })
  const divisions = parseItemList(input.divisions, ['name', 'focus', 'duties'], (item, parsed) => {
    if (item.tasks === undefined) return true
    if (!Array.isArray(item.tasks) || item.tasks.length === 0 || item.tasks.length > 15) return false
    for (const task of item.tasks) {
      if (!validText(task)) return false
    }
    parsed.tasks = item.tasks
    return true
  })
  const articles = parseItemList(input.articles, ['title', 'category', 'date', 'description', 'source'])
  if (!activities || !divisions || !articles) return null

  return {
    home: home as AdiwiyataSiteContent['home'],
    pages: {
      profil: profil as AdiwiyataSiteContent['pages']['profil'],
      program: program as AdiwiyataSiteContent['pages']['program'],
      dokumentasi: dokumentasi as AdiwiyataSiteContent['pages']['dokumentasi'],
      struktur: (struktur ?? DEFAULT_ADIWIYATA_SITE_CONTENT.pages.struktur) as AdiwiyataSiteContent['pages']['struktur'],
      publikasi: publikasi as AdiwiyataSiteContent['pages']['publikasi'],
      dokumen: dokumen as AdiwiyataSiteContent['pages']['dokumen'],
    },
    activities: activities as AdiwiyataSiteContent['activities'],
    divisions: divisions as AdiwiyataSiteContent['divisions'],
    articles: articles as AdiwiyataSiteContent['articles'],
  }
}
