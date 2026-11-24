// Konten data trek paralel "Misi Kader": 3 tahap per misi untuk 8 tim kader.
// Isi tugas diambil dari lib/adiwiyata-site-content.ts (divisions: duties/tasks).
// Khusus Edu-Lingkungan, sumber hanya punya duties (tanpa tasks) — isi kuisnya
// adalah materi ajar dari kampanye yang sudah ada (pilah, kompos, maggot,
// hemat air-energi), sesuai duties "mengedukasi warga sekolah tentang
// lingkungan hidup dan perilaku ramah lingkungan".
// Angka berat, harga, dan data tabel di sini adalah CONTOH fiktif untuk
// permainan, bukan data asli sekolah. Nada santai, tidak menggurui.
// Dipakai agen mini-game nanti; file ini hanya data.
import type { TugasKaderId } from '../types'
import type { DialogNpc } from './npc'

export type JenisTahapTugas = 'pilah' | 'kuis' | 'inspeksi' | 'pilih' | 'catat'

export interface SoalKuisTugas {
  pertanyaan: string
  pilihan: [string, string, string]
  jawaban: number
  penjelasan: string
}

export interface ItemPilahTugas {
  nama: string
  kelompok: string
}

export interface TemuanInspeksiTugas {
  masalah: string
  tindakan: string
  pilihanSalah: [string, string]
}

export interface PilihanTugas {
  teks: string
  benar: boolean
  alasan: string
}

export interface TabelDataTugas {
  judul: string
  kolom: string[]
  baris: string[][]
}

export type TahapTugas =
  | { judul: string; instruksi: string; jenis: 'pilah'; kelompok: string[]; items: ItemPilahTugas[] }
  | { judul: string; instruksi: string; jenis: 'kuis'; soal: SoalKuisTugas[] }
  | { judul: string; instruksi: string; jenis: 'inspeksi'; temuan: TemuanInspeksiTugas[] }
  | { judul: string; instruksi: string; jenis: 'pilih'; brief: string; pilihan: PilihanTugas[] }
  | { judul: string; instruksi: string; jenis: 'catat'; tabel: TabelDataTugas; soal?: SoalKuisTugas[] }

export interface KontenTugasKader {
  id: TugasKaderId
  tahapan: [TahapTugas, TahapTugas, TahapTugas]
}

export const KONTEN_TUGAS: Record<TugasKaderId, KontenTugasKader> = {
  'bank-sampah': {
    id: 'bank-sampah',
    tahapan: [
      {
        judul: 'Pilah Anorganik per Jenis',
        instruksi: 'Pilah sampah anorganik ke jenisnya: PET, kertas, kaleng, atau kaca.',
        jenis: 'pilah',
        kelompok: ['PET', 'Kertas', 'Kaleng', 'Kaca'],
        items: [
          { nama: 'Botol air mineral bekas', kelompok: 'PET' },
          { nama: 'Botol teh kemasan bekas', kelompok: 'PET' },
          { nama: 'Gelas plastik bening bekas', kelompok: 'PET' },
          { nama: 'Kardus bekas', kelompok: 'Kertas' },
          { nama: 'Buku tulis bekas', kelompok: 'Kertas' },
          { nama: 'Koran bekas', kelompok: 'Kertas' },
          { nama: 'Kaleng minuman bekas', kelompok: 'Kaleng' },
          { nama: 'Kaleng biskuit bekas', kelompok: 'Kaleng' },
          { nama: 'Toples kaca bekas', kelompok: 'Kaca' },
          { nama: 'Botol kaca bekas', kelompok: 'Kaca' },
        ],
      },
      {
        judul: 'Timbang dan Catat',
        instruksi: 'Catat berat tiap jenis sampah anorganik ke buku tabungan bank sampah.',
        jenis: 'catat',
        tabel: {
          judul: 'Timbangan hari ini (contoh)',
          kolom: ['Jenis sampah', 'Berat'],
          baris: [
            ['PET', '4,2 kg'],
            ['Kertas', '6,5 kg'],
            ['Kaleng', '1,8 kg'],
            ['Kaca', '3,0 kg'],
          ],
        },
      },
      {
        judul: 'Hitung Tabungan',
        instruksi: 'Hitung tabungan sampah tiap kelas dari berat dan harga per kilonya.',
        jenis: 'kuis',
        soal: [
          {
            pertanyaan: 'Bank sampah membeli PET Rp2.000 per kg. Kelas 10-A menabung 3 kg PET. Berapa rupiah tabungannya?',
            pilihan: ['Rp5.000', 'Rp6.000', 'Rp9.000'],
            jawaban: 1,
            penjelasan: '3 kg dikali Rp2.000 sama dengan Rp6.000.',
          },
          {
            pertanyaan: 'Kertas dijual Rp1.500 per kg. Kalau kelas 10-B menabung 4 kg kertas, berapa tabungannya?',
            pilihan: ['Rp4.500', 'Rp6.000', 'Rp7.500'],
            jawaban: 1,
            penjelasan: '4 kg dikali Rp1.500 sama dengan Rp6.000.',
          },
          {
            pertanyaan: 'Kaleng Rp3.000 per kg. Berapa tabungan dari 2 kg kaleng ditambah 1 kg PET seharga Rp2.000 per kg?',
            pilihan: ['Rp6.000', 'Rp8.000', 'Rp10.000'],
            jawaban: 1,
            penjelasan: '2 kg kaleng sama dengan Rp6.000, ditambah Rp2.000 untuk PET, jadi Rp8.000.',
          },
          {
            pertanyaan: 'Tabungan kelas 10-D: PET Rp6.000 dan kertas Rp4.500. Berapa totalnya?',
            pilihan: ['Rp9.500', 'Rp10.500', 'Rp11.500'],
            jawaban: 1,
            penjelasan: 'Rp6.000 ditambah Rp4.500 sama dengan Rp10.500.',
          },
        ],
      },
    ],
  },
  'lingkungan-sehat': {
    id: 'lingkungan-sehat',
    tahapan: [
      {
        judul: 'Cek Toilet',
        instruksi: 'Temukan masalah di toilet, lalu pilih tindakan yang benar.',
        jenis: 'inspeksi',
        temuan: [
          {
            masalah: 'Keran wastafel menetes terus',
            tindakan: 'Tutup keran rapat-rapat; kalau masih menetes, laporkan ke guru pembina supaya diperbaiki.',
            pilihanSalah: ['Biarkan saja, airnya sedikit kok.', 'Tutup kerannya dengan lakban lalu pergi.'],
          },
          {
            masalah: 'Sabun cuci tangan habis',
            tindakan: 'Isi ulang sabunnya dan ingatkan teman untuk cuci tangan pakai sabun.',
            pilihanSalah: ['Cuci tangan pakai air saja sudah cukup.', 'Beli sabun sendiri, jangan peduli yang lain.'],
          },
          {
            masalah: 'Lantai toilet licin dan becek',
            tindakan: 'Pel lantainya dan laporkan genangan ke petugas kebersihan.',
            pilihanSalah: ['Lompati saja genangannya.', 'Tunggu sampai kering sendiri.'],
          },
          {
            masalah: 'Gayung pecah',
            tindakan: 'Ganti dengan gayung yang baru dan buang yang pecah ke tempat sampah.',
            pilihanSalah: ['Pakai gayung pecah apa adanya.', 'Sembunyikan gayung pecahnya di balik pintu.'],
          },
          {
            masalah: 'Tempat sampah toilet penuh',
            tindakan: 'Kosongkan ke tempat penampungan dan pilah isinya.',
            pilihanSalah: ['Tekan-tekan sampahnya supaya muat lagi.', 'Buang sampahnya ke dalam toilet.'],
          },
        ],
      },
      {
        judul: 'Cek Drainase',
        instruksi: 'Temukan masalah di saluran air dan selokan, lalu pilih tindakan yang benar.',
        jenis: 'inspeksi',
        temuan: [
          {
            masalah: 'Selokan mampet sampah',
            tindakan: 'Angkat sampahnya, buang ke tempat sampah, dan cek lagi aliran airnya.',
            pilihanSalah: ['Dorong sampahnya lebih dalam ke selokan.', 'Biarkan saja, nanti hujan yang bawa pergi.'],
          },
          {
            masalah: 'Genangan air di halaman',
            tindakan: 'Bersihkan sumbatannya dan laporkan kalau genangan tidak surut.',
            pilihanSalah: ['Main saja di genangannya.', 'Tutup genangan dengan papan lalu lupakan.'],
          },
          {
            masalah: 'Jentik nyamuk di bak penampungan air',
            tindakan: 'Kuras baknya dan tutup rapat supaya nyamuk tidak bertelur lagi.',
            pilihanSalah: ['Tambah air saja biar jentiknya tenggelam.', 'Biarkan, jentik kan kecil.'],
          },
          {
            masalah: 'Daun kering menumpuk di saluran air',
            tindakan: 'Sapu dan kumpulkan daunnya untuk kompos.',
            pilihanSalah: ['Bakar daunnya di tempat.', 'Buang daunnya ke selokan sebelah.'],
          },
          {
            masalah: 'Bau tidak sedap dari saluran air',
            tindakan: 'Bersihkan salurannya dan siram dengan Eco Enzyme.',
            pilihanSalah: ['Tutup hidung dan cepat-cepat lewat.', 'Semprot parfum ke salurannya.'],
          },
        ],
      },
      {
        judul: 'Cek Taman dan PHBS',
        instruksi: 'Temukan masalah di taman dan kebiasaan sehat, lalu pilih tindakan yang benar.',
        jenis: 'inspeksi',
        temuan: [
          {
            masalah: 'Tanaman kering dan layu',
            tindakan: 'Siram tanamannya dan cek jadwal piket penyiraman.',
            pilihanSalah: ['Cabut saja tanamannya.', 'Tunggu hujan, siapa tahu hidup lagi.'],
          },
          {
            masalah: 'Rumput liar menumpuk di bedeng',
            tindakan: 'Siangi rumput liarnya supaya tanaman tidak berebut nutrisi.',
            pilihanSalah: ['Semprot rumputnya dengan cairan kimia.', 'Biarkan saja, rumput liar juga tanaman.'],
          },
          {
            masalah: 'Sampah berserakan di taman',
            tindakan: 'Pungut, pilah, dan buang ke tong yang benar.',
            pilihanSalah: ['Tendang sampahnya ke balik semak.', 'Itu bukan tugasku, biar petugas saja.'],
          },
          {
            masalah: 'Poster imbauan cuci tangan rusak',
            tindakan: 'Ganti posternya dan tempel di tempat yang mudah terlihat.',
            pilihanSalah: ['Copot posternya, tidak ada yang baca juga.', 'Tulis imbauan di dinding dengan spidol.'],
          },
          {
            masalah: 'Teman tidak cuci tangan setelah dari toilet',
            tindakan: 'Ingatkan dengan ramah: cuci tangan 6 langkah pakai sabun.',
            pilihanSalah: ['Ejek dia di depan teman-teman.', 'Diam saja, bukan urusanku.'],
          },
        ],
      },
    ],
  },
  'edu-lingkungan': {
    id: 'edu-lingkungan',
    tahapan: [
      {
        judul: 'Ajar Pilah Sampah',
        instruksi: 'Jawab pertanyaan temanmu tentang pilah sampah dengan benar.',
        jenis: 'kuis',
        soal: [
          {
            pertanyaan: 'Sisa nasi dan kulit buah masuk tong apa?',
            pilihan: ['Organik', 'Anorganik', 'Residu'],
            jawaban: 0,
            penjelasan: 'Sisa makanan dan kulit buah itu organik, bisa jadi kompos atau pakan maggot.',
          },
          {
            pertanyaan: 'Botol plastik bekas yang sudah bersih masuk tong apa?',
            pilihan: ['Organik', 'Anorganik', 'B3'],
            jawaban: 1,
            penjelasan: 'Botol plastik bersih itu anorganik, bisa didaur ulang.',
          },
          {
            pertanyaan: 'Bungkus makanan berminyak masuk tong apa?',
            pilihan: ['Organik', 'Anorganik', 'Residu'],
            jawaban: 2,
            penjelasan: 'Bungkus berminyak tidak bisa didaur ulang, jadi masuk Residu.',
          },
          {
            pertanyaan: 'Baterai bekas masuk tong apa?',
            pilihan: ['Residu', 'Anorganik', 'B3'],
            jawaban: 2,
            penjelasan: 'Baterai itu limbah berbahaya (B3), jangan dicampur dengan sampah lain.',
          },
        ],
      },
      {
        judul: 'Ajar Kompos dan Maggot',
        instruksi: 'Jawab pertanyaan temanmu tentang kompos dan maggot dengan benar.',
        jenis: 'kuis',
        soal: [
          {
            pertanyaan: 'Apa yang dimakan maggot?',
            pilihan: ['Sisa nasi dan sayur bersih', 'Plastik dan styrofoam', 'Baterai bekas'],
            jawaban: 0,
            penjelasan: 'Maggot makan sisa makanan yang bersih. Plastik dan baterai bukan makanannya.',
          },
          {
            pertanyaan: 'Kenapa kompos perlu diaduk?',
            pilihan: ['Supaya dapat udara dan tidak bau', 'Supaya warnanya bagus', 'Supaya cepat kering'],
            jawaban: 0,
            penjelasan: 'Kompos butuh udara; kalau tidak diaduk, jadi bau dan lambat matang.',
          },
          {
            pertanyaan: 'Bahan apa yang bagus untuk kompos?',
            pilihan: ['Daun kering dan sisa sayur', 'Kantong plastik', 'Kaleng bekas'],
            jawaban: 0,
            penjelasan: 'Daun kering dan sisa sayur itu bahan organik yang bisa terurai jadi kompos.',
          },
          {
            pertanyaan: 'Kasgot itu apa?',
            pilihan: ['Kotoran maggot yang jadi pupuk', 'Nama lain kompos cair', 'Makanan maggot'],
            jawaban: 0,
            penjelasan: 'Kasgot adalah kotoran maggot — pupuk yang bagus untuk kebun.',
          },
        ],
      },
      {
        judul: 'Ajar Hemat Air dan Energi',
        instruksi: 'Jawab pertanyaan temanmu tentang hemat air dan energi dengan benar.',
        jenis: 'kuis',
        soal: [
          {
            pertanyaan: 'Suhu AC yang hemat energi itu sekitar berapa?',
            pilihan: ['16°C', '24–26°C', '30°C'],
            jawaban: 1,
            penjelasan: 'AC 24–26°C sudah cukup sejuk dan hemat listrik.',
          },
          {
            pertanyaan: 'Keran menetes sebaiknya diapakan?',
            pilihan: ['Dibiarkan, airnya sedikit', 'Ditutup rapat dan dilaporkan kalau rusak', 'Ditampung pakai ember saja'],
            jawaban: 1,
            penjelasan: 'Keran menetes yang dibiarkan bisa menghabiskan banyak air dalam sehari.',
          },
          {
            pertanyaan: 'Apa gunanya lubang biopori?',
            pilihan: ['Biar air hujan meresap ke tanah', 'Biar tanah makin kering', 'Tempat buang sampah'],
            jawaban: 0,
            penjelasan: 'Biopori membantu air hujan meresap ke tanah, jadi halaman tidak gampang banjir.',
          },
          {
            pertanyaan: 'Kelas kosong tapi lampu menyala. Apa yang dilakukan?',
            pilihan: ['Matikan lampunya', 'Biarkan, nanti juga mati sendiri', 'Tutup pintu kelasnya'],
            jawaban: 0,
            penjelasan: 'Lampu di ruangan kosong itu listrik yang terbuang percuma.',
          },
        ],
      },
    ],
  },
  'inovasi-hijau': {
    id: 'inovasi-hijau',
    tahapan: [
      {
        judul: 'Poster Sekolah Bebas Plastik',
        instruksi: 'Pilih desain poster yang paling efektif untuk kampanye bebas plastik.',
        jenis: 'pilih',
        brief: 'Buat poster yang mengajak warga sekolah berhenti memakai plastik sekali pakai.',
        pilihan: [
          {
            teks: 'Poster: "Bawa Tumbler, Gaya Tetap Jalan" dengan gambar tumbler warna-warni.',
            benar: true,
            alasan: 'Ajakannya jelas, solusinya konkret, dan bahasanya dekat dengan anak SMA.',
          },
          {
            teks: 'Poster penuh teks kecil tentang jenis-jenis plastik.',
            benar: false,
            alasan: 'Terlalu banyak teks, orang lewat tidak sempat membacanya.',
          },
          {
            teks: 'Poster gambar tempat sampah penuh dengan tulisan "Kotor!".',
            benar: false,
            alasan: 'Hanya menyalahkan, tidak memberi tahu apa yang bisa dilakukan.',
          },
        ],
      },
      {
        judul: 'Infografis Hemat Energi',
        instruksi: 'Pilih desain infografis yang paling efektif untuk hemat listrik di kelas.',
        jenis: 'pilih',
        brief: 'Buat infografis satu halaman tentang hemat listrik di kelas.',
        pilihan: [
          {
            teks: 'Infografis: "Matikan Kalau Tidak Dipakai" — 3 langkah singkat dengan ikon lampu, AC, dan proyektor.',
            benar: true,
            alasan: 'Singkat, visual, dan langsung bisa dipraktikkan di kelas.',
          },
          {
            teks: 'Infografis tabel tarif listrik per kWh yang panjang.',
            benar: false,
            alasan: 'Angka teknis bikin orang malas membaca.',
          },
          {
            teks: 'Infografis foto panel surya tanpa penjelasan.',
            benar: false,
            alasan: 'Bagus dilihat, tapi tidak ada ajakan yang jelas.',
          },
        ],
      },
      {
        judul: 'Ide Alat Sederhana',
        instruksi: 'Pilih ide alat sederhana dari bahan bekas yang paling masuk akal.',
        jenis: 'pilih',
        brief: 'Rancang ide alat sederhana dari bahan bekas untuk mengatasi masalah di sekolah.',
        pilihan: [
          {
            teks: 'Tempat sampah pilah dari kardus bekas dengan label warna, ditaruh di tiap kelas.',
            benar: true,
            alasan: 'Murah, mudah dibuat, dan langsung menyelesaikan masalah pilah di kelas.',
          },
          {
            teks: 'Robot pemilah sampah otomatis.',
            benar: false,
            alasan: 'Keren, tapi terlalu rumit dan mahal untuk dibuat sekarang.',
          },
          {
            teks: 'Tong sampah raksasa di tengah lapangan.',
            benar: false,
            alasan: 'Tidak menyelesaikan masalah pilah — sampah tetap tercampur.',
          },
        ],
      },
    ],
  },
  'kantin-hijau': {
    id: 'kantin-hijau',
    tahapan: [
      {
        judul: 'Cek Kebersihan Kantin',
        instruksi: 'Temukan masalah kebersihan di kantin, lalu pilih tindakan yang benar.',
        jenis: 'inspeksi',
        temuan: [
          {
            masalah: 'Meja makan lengket dan kotor',
            tindakan: 'Lap meja dengan kain bersih dan pastikan ada jadwal lap berkala.',
            pilihanSalah: ['Tutup meja dengan koran.', 'Biarkan saja, nanti juga kering.'],
          },
          {
            masalah: 'Tempat cuci piring kotor',
            tindakan: 'Bersihkan bak cucinya dan pastikan air mengalir lancar.',
            pilihanSalah: ['Cuci piring di wastafel toilet.', 'Pakai piring sekali pakai saja.'],
          },
          {
            masalah: 'Lantai kantin licin berminyak',
            tindakan: 'Pel lantai dengan cairan pembersih dan pasang tanda licin.',
            pilihanSalah: ['Taburi pasir di atasnya.', 'Biarkan, yang jatuh salah sendiri.'],
          },
          {
            masalah: 'Tempat sampah kantin tercampur',
            tindakan: 'Pisahkan tong Organik dan Anorganik dan beri label yang jelas.',
            pilihanSalah: ['Satukan saja, nanti dipilah di TPS.', 'Sembunyikan tongnya supaya tidak terlihat.'],
          },
        ],
      },
      {
        judul: 'Cek Plastik Sekali Pakai',
        instruksi: 'Temukan plastik sekali pakai di kantin, lalu pilih tindakan yang benar.',
        jenis: 'inspeksi',
        temuan: [
          {
            masalah: 'Penjual membungkus makanan dengan kantong plastik',
            tindakan: 'Ingatkan penjual untuk memakai wadah guna ulang atau kertas.',
            pilihanSalah: ['Minta kantong plastik dobel biar kuat.', 'Diam saja, itu urusan penjual.'],
          },
          {
            masalah: 'Sedotan plastik di setiap gelas',
            tindakan: 'Ajak kantin menyediakan sedotan guna ulang atau minum langsung dari gelas.',
            pilihanSalah: ['Minta sedotan dua supaya lebih cepat.', 'Buang sedotannya ke tong Organik.'],
          },
          {
            masalah: 'Styrofoam untuk makanan panas',
            tindakan: 'Usulkan pengganti: wadah guna ulang atau piring yang bisa dicuci.',
            pilihanSalah: ['Styrofoam kan praktis, biarkan saja.', 'Lipat styrofoamnya supaya muat di tong.'],
          },
          {
            masalah: 'Kemasan sekali pakai menumpuk di tong',
            tindakan: 'Catat dan laporkan ke tim kantin, lalu ajak murid bawa wadah sendiri.',
            pilihanSalah: ['Bakar kemasannya biar tidak menumpuk.', 'Pindahkan ke tong kelas lain.'],
          },
        ],
      },
      {
        judul: 'Cek Jajanan Sehat',
        instruksi: 'Temukan masalah pada jajanan kantin, lalu pilih tindakan yang benar.',
        jenis: 'inspeksi',
        temuan: [
          {
            masalah: 'Minuman warna mencolok dijual bebas',
            tindakan: 'Ingatkan kantin soal jajanan sehat dan usulkan minuman yang lebih aman.',
            pilihanSalah: ['Beli yang paling mencolok, warnanya lucu.', 'Sebarkan ke teman-teman biar viral.'],
          },
          {
            masalah: 'Makanan tidak ditutup, dihinggapi lalat',
            tindakan: 'Minta penjual menutup makanan dengan penutup atau tudung saji.',
            pilihanSalah: ['Usir lalatnya lalu makan saja.', 'Pilih makanan yang paling ujung.'],
          },
          {
            masalah: 'Penjual tidak pakai sarung tangan atau penjepit',
            tindakan: 'Ingatkan penjual memakai penjepit atau sarung tangan saat menyajikan.',
            pilihanSalah: ['Tidak apa-apa, tangannya kelihatan bersih.', 'Makan saja, perut sudah kebal.'],
          },
          {
            masalah: 'Sisa makanan kantin dibuang begitu saja',
            tindakan: 'Koordinasikan sisa makanan ke kompos atau maggot bersama tim terkait.',
            pilihanSalah: ['Buang ke selokan biar cepat hilang.', 'Kasih ke kucing liar di halaman.'],
          },
        ],
      },
    ],
  },
  'data-hijau': {
    id: 'data-hijau',
    tahapan: [
      {
        judul: 'Catat Sampah Harian',
        instruksi: 'Catat data sampah tiap kelas, lalu jawab soal dari tabelnya.',
        jenis: 'catat',
        tabel: {
          judul: 'Setoran sampah hari ini (contoh, kg)',
          kolom: ['Kelas', 'Organik (kg)', 'Anorganik (kg)'],
          baris: [
            ['10-A', '3,0', '2,0'],
            ['10-B', '2,5', '3,5'],
            ['10-C', '4,0', '1,5'],
          ],
        },
        soal: [
          {
            pertanyaan: 'Kelas mana yang sampah organiknya paling berat?',
            pilihan: ['10-A', '10-B', '10-C'],
            jawaban: 2,
            penjelasan: '10-C mencatat 4,0 kg organik, paling berat di antara ketiganya.',
          },
          {
            pertanyaan: 'Berapa total sampah anorganik tiga kelas itu?',
            pilihan: ['6,0 kg', '7,0 kg', '8,0 kg'],
            jawaban: 1,
            penjelasan: '2,0 + 3,5 + 1,5 sama dengan 7,0 kg.',
          },
          {
            pertanyaan: 'Kelas mana yang total sampahnya paling sedikit?',
            pilihan: ['10-A (5,0 kg)', '10-B (6,0 kg)', '10-C (5,5 kg)'],
            jawaban: 0,
            penjelasan: '10-A totalnya 5,0 kg — paling sedikit di antara ketiganya.',
          },
        ],
      },
      {
        judul: 'Catat Air dan Listrik',
        instruksi: 'Catat pemakaian air dan listrik, lalu jawab soal dari tabelnya.',
        jenis: 'catat',
        tabel: {
          judul: 'Pemakaian minggu lalu dan minggu ini (contoh)',
          kolom: ['Pemakaian', 'Minggu lalu', 'Minggu ini'],
          baris: [
            ['Air (m³)', '12', '10'],
            ['Listrik (kWh)', '180', '165'],
            ['Sampah plastik (kg)', '8', '6'],
          ],
        },
        soal: [
          {
            pertanyaan: 'Berapa kWh listrik yang berhasil dihemat minggu ini?',
            pilihan: ['5 kWh', '15 kWh', '25 kWh'],
            jawaban: 1,
            penjelasan: '180 dikurangi 165 sama dengan 15 kWh.',
          },
          {
            pertanyaan: 'Apakah pemakaian air minggu ini naik atau turun?',
            pilihan: ['Naik 2 m³', 'Turun 2 m³', 'Tetap'],
            jawaban: 1,
            penjelasan: 'Air turun dari 12 m³ menjadi 10 m³.',
          },
          {
            pertanyaan: 'Berapa total sampah plastik dua minggu itu?',
            pilihan: ['12 kg', '14 kg', '16 kg'],
            jawaban: 1,
            penjelasan: '8 kg ditambah 6 kg sama dengan 14 kg.',
          },
        ],
      },
      {
        judul: 'Catat Tanaman',
        instruksi: 'Catat data tanaman kebun dan hidroponik, lalu jawab soal dari tabelnya.',
        jenis: 'catat',
        tabel: {
          judul: 'Tanaman kebun hari ini (contoh)',
          kolom: ['Jenis tanaman', 'Jumlah', 'Kondisi'],
          baris: [
            ['Kangkung hidroponik', '24', 'Sehat'],
            ['Bayam', '18', 'Sehat'],
            ['Cabai', '12', 'Perlu disiram'],
          ],
        },
        soal: [
          {
            pertanyaan: 'Tanaman apa yang jumlahnya paling banyak?',
            pilihan: ['Kangkung hidroponik', 'Bayam', 'Cabai'],
            jawaban: 0,
            penjelasan: 'Kangkung hidroponik ada 24 — paling banyak di tabel.',
          },
          {
            pertanyaan: 'Berapa total tanaman yang tercatat?',
            pilihan: ['44', '54', '64'],
            jawaban: 1,
            penjelasan: '24 + 18 + 12 sama dengan 54 tanaman.',
          },
          {
            pertanyaan: 'Tanaman apa yang perlu perhatian?',
            pilihan: ['Kangkung', 'Bayam', 'Cabai'],
            jawaban: 2,
            penjelasan: 'Cabai tercatat perlu disiram — data seperti ini yang bikin tim kebun tahu harus ke mana.',
          },
        ],
      },
    ],
  },
  'eco-communication': {
    id: 'eco-communication',
    tahapan: [
      {
        judul: 'Reels Zero Waste',
        instruksi: 'Pilih konsep reels yang paling efektif untuk kampanye zero waste.',
        jenis: 'pilih',
        brief: 'Buat reels 30 detik tentang zero waste di sekolah.',
        pilihan: [
          {
            teks: 'Video: siswa bawa tumbler dan tas kain, diakhiri ajakan "Coba sehari tanpa plastik sekali pakai".',
            benar: true,
            alasan: 'Ada contoh nyata, ada ajakan, dan durasinya pas untuk reels.',
          },
          {
            teks: 'Video slideshow 30 foto sampah.',
            benar: false,
            alasan: 'Terlalu banyak foto, penonton kabur sebelum pesannya sampai.',
          },
          {
            teks: 'Video ceramah 30 detik tentang bahaya plastik.',
            benar: false,
            alasan: 'Ceramah di reels jarang ditonton sampai habis.',
          },
        ],
      },
      {
        judul: 'Infografis Hemat Energi',
        instruksi: 'Pilih konsep postingan infografis yang paling efektif.',
        jenis: 'pilih',
        brief: 'Buat postingan infografis tentang hemat energi di sekolah.',
        pilihan: [
          {
            teks: 'Infografis: "3 Hal yang Sering Lupa Dimatikan" dengan ikon lampu, kipas, dan proyektor.',
            benar: true,
            alasan: 'Spesifik, dekat dengan keseharian, dan mudah dibagikan.',
          },
          {
            teks: 'Infografis definisi energi terbarukan yang panjang.',
            benar: false,
            alasan: 'Terlalu akademis untuk postingan media sosial.',
          },
          {
            teks: 'Foto lampu menyala tanpa teks.',
            benar: false,
            alasan: 'Tanpa teks, orang tidak tahu maksud postingannya.',
          },
        ],
      },
      {
        judul: 'Kampanye Olah Sampah',
        instruksi: 'Pilih strategi kampanye memilah sampah yang paling efektif.',
        jenis: 'pilih',
        brief: 'Buat kampanye ajakan memilah sampah untuk akun sekolah.',
        pilihan: [
          {
            teks: 'Seri postingan "Pilah 10 Detik": tiap hari satu jenis sampah dan tongnya.',
            benar: true,
            alasan: 'Rutin, mudah diikuti, dan mengajarkan pilah sedikit demi sedikit.',
          },
          {
            teks: 'Satu postingan panjang berisi semua aturan pilah.',
            benar: false,
            alasan: 'Sekali baca langsung lupa — lebih baik dibagi jadi seri.',
          },
          {
            teks: 'Postingan foto tong sampah kosong.',
            benar: false,
            alasan: 'Tidak ada informasi dan tidak ada ajakan.',
          },
        ],
      },
    ],
  },
  'jejaring-hijau': {
    id: 'jejaring-hijau',
    tahapan: [
      {
        judul: 'Kerja Sama dengan DLH',
        instruksi: 'Pilih cara terbaik menyambut tawaran bantuan dari DLH.',
        jenis: 'pilih',
        brief: 'DLH menawarkan bantuan bibit tanaman dan pelatihan pilah sampah untuk sekolah. Bagaimana cara menyambutnya?',
        pilihan: [
          {
            teks: 'Buat surat resmi, susun jadwal pelatihan, dan siapkan tim yang menyambut narasumbernya.',
            benar: true,
            alasan: 'Resmi, rapi, dan siap — mitra jadi percaya sekolah serius.',
          },
          {
            teks: 'Jawab "nanti dulu" lewat pesan singkat.',
            benar: false,
            alasan: 'Kesempatan bantuan bisa lewat begitu saja.',
          },
          {
            teks: 'Terima bibitnya saja, pelatihannya tidak usah.',
            benar: false,
            alasan: 'Pelatihan justru yang bikin bantuan bermanfaat jangka panjang.',
          },
        ],
      },
      {
        judul: 'Proposal ke Pelaku Usaha',
        instruksi: 'Pilih cara terbaik meminta dukungan pelaku usaha sekitar.',
        jenis: 'pilih',
        brief: 'Sekolah butuh dana untuk menambah tong pilah. Bagaimana meminta dukungan pelaku usaha sekitar?',
        pilihan: [
          {
            teks: 'Susun proposal singkat: kebutuhan, manfaat, dan laporan penggunaan dana yang transparan.',
            benar: true,
            alasan: 'Mitra usaha butuh tahu dananya dipakai untuk apa dan hasilnya apa.',
          },
          {
            teks: 'Minta dana tanpa penjelasan, yang penting dapat.',
            benar: false,
            alasan: 'Tanpa rencana yang jelas, mitra tidak akan percaya.',
          },
          {
            teks: 'Tunggu ada yang menawarkan sendiri.',
            benar: false,
            alasan: 'Kemitraan itu dijemput, bukan ditunggu.',
          },
        ],
      },
      {
        judul: 'Ajak Komunitas',
        instruksi: 'Pilih cara terbaik merespons ajakan kerja sama komunitas daur ulang.',
        jenis: 'pilih',
        brief: 'Komunitas daur ulang di sekitar sekolah mengajak kerja sama aksi bersih sungai. Bagaimana meresponsnya?',
        pilihan: [
          {
            teks: 'Tentukan tanggal, bagi tugas, dan ajak warga sekitar ikut serta.',
            benar: true,
            alasan: 'Aksi bersama jadi lebih besar dampaknya dan mempererat jejaring.',
          },
          {
            teks: 'Ikut sendiri tanpa memberi tahu siapa-siapa.',
            benar: false,
            alasan: 'Aksi sekolah sebaiknya melibatkan warga, bukan jalan sendiri.',
          },
          {
            teks: 'Tolak karena di luar pagar sekolah.',
            benar: false,
            alasan: 'Lingkungan tidak berhenti di pagar — sungai itu juga bagian dari kita.',
          },
        ],
      },
    ],
  },
}

// Nama tampilan NPC pemberi misi (tokoh fiktif, untuk dipakai agen dunia).
export const NAMA_NPC_TUGAS: Record<TugasKaderId, string> = {
  'bank-sampah': 'Kak Bimo',
  'lingkungan-sehat': 'Pak Sehat',
  'edu-lingkungan': 'Kak Lala',
  'inovasi-hijau': 'Kak Raka',
  'kantin-hijau': 'Mbak Dewi',
  'data-hijau': 'Kak Fajar',
  'eco-communication': 'Kak Naya',
  'jejaring-hijau': 'Pak Jaka',
}

// Dialog NPC pemberi misi, format sama seperti DIALOG_NPC di ./npc.
export const DIALOG_TUGAS: Record<TugasKaderId, DialogNpc> = {
  'bank-sampah': {
    sapaan: 'Hai! Aku Kak Bimo, yang jagain Bank Sampah Sekolah.',
    baris: [
      'Di sini sampah anorganik ditimbang, dicatat, lalu ditabung. Satu kilo demi satu kilo, lama-lama jadi lumayan.',
      'PET, kertas, kaleng, kaca — tiap jenis punya tempatnya sendiri. Kalau tercampur, harganya turun.',
      'Tabungan sampah ini nanti bisa dipakai kelas untuk kegiatan. Jadi memilah itu ada hasilnya, bukan cuma rapi-rapi.',
    ],
    tips: 'Botol dan kaleng yang bersih dan kering harganya lebih bagus daripada yang kotor.',
  },
  'lingkungan-sehat': {
    sapaan: 'Halo, Nak. Saya Pak Sehat, yang jagain kebersihan dan kesehatan sekolah.',
    baris: [
      'Toilet bersih, drainase lancar, taman terawat — itu semua kerjaan harian, bukan kerjaan sekali-sekali.',
      'Jentik nyamuk itu kecil, tapi kalau dibiarkan bisa jadi masalah besar. Makanya kami cek bak air berkala.',
      'PHBS itu kebiasaan kecil: cuci tangan pakai sabun, buang sampah pada tempatnya, dan saling mengingatkan.',
    ],
    tips: 'Cuci tangan yang benar itu 6 langkah pakai sabun — bukan asal basah.',
  },
  'edu-lingkungan': {
    sapaan: 'Hai! Aku Kak Lala, yang suka ngajarin hal-hal lingkungan ke teman-teman.',
    baris: [
      'Mengajar itu bukan ceramah panjang. Satu hal kecil yang dipraktikkan lebih nempel daripada sepuluh slide.',
      'Aku sering mulai dari pertanyaan: "Sampah ini masuk tong apa?" Dari situ diskusinya jalan sendiri.',
      'Kalau kamu bisa menjelaskan pilah sampah ke temanmu, berarti kamu sudah jadi pengajar juga.',
    ],
    tips: 'Cara paling cepat mengajar: beri contoh dulu, baru jelaskan alasannya.',
  },
  'inovasi-hijau': {
    sapaan: 'Hai! Aku Kak Raka, yang suka bikin-bikin hal baru buat lingkungan.',
    baris: [
      'Inovasi itu tidak harus canggih. Tong pilah dari kardus bekas saja sudah inovasi kalau menyelesaikan masalah.',
      'Aku suka mulai dari masalah kecil: apa yang bikin sekolah ini kurang nyaman, lalu cari akalnya.',
      'Poster yang bagus itu yang dibaca orang lewat dalam tiga detik, bukan yang paling ramai.',
    ],
    tips: 'Ide terbaik biasanya datang dari masalah yang kamu temui sendiri setiap hari.',
  },
  'kantin-hijau': {
    sapaan: 'Hai! Aku Mbak Dewi, yang jagain kantin supaya bersih dan sehat.',
    baris: [
      'Kantin sehat itu sederhana: makanan ditutup, penjual pakai penjepit, dan tidak ada plastik sekali pakai.',
      'Styrofoam dan sedotan plastik itu yang paling sering lolos. Makanya kami cek terus.',
      'Sisa makanan kantin jangan dibuang begitu saja — ada yang bisa ke kompos, ada yang bisa ke maggot.',
    ],
    tips: 'Bawa wadah dan tumbler sendiri itu cara paling gampang bikin kantin makin hijau.',
  },
  'data-hijau': {
    sapaan: 'Hai! Aku Kak Fajar, yang jagain data Adiwiyata sekolah.',
    baris: [
      'Data itu cerita sekolah dalam angka: berapa sampah yang dipilah, berapa air yang dihemat, berapa tanaman yang tumbuh.',
      'Data yang salah itu lebih bahaya daripada tidak ada data. Makanya kami cek ulang sebelum dilaporkan.',
      'Dari data kita tahu mana yang berhasil dan mana yang perlu dibenahi. Jadi kerja kita tidak asal tebak.',
    ],
    tips: 'Catat datanya di hari yang sama — besok-besok angkanya sudah lupa.',
  },
  'eco-communication': {
    sapaan: 'Hai! Aku Kak Naya, yang pegang media sosial Adiwiyata.',
    baris: [
      'Konten lingkungan yang bagus itu yang ditonton sampai habis, bukan yang paling panjang penjelasannya.',
      'Satu reels yang jujur dari kegiatan asli sekolah lebih kuat daripada sepuluh gambar stok.',
      'Aku selalu arsipkan foto dan video kegiatan — itu bukti fisik yang dipakai saat penilaian.',
    ],
    tips: 'Ajakan yang spesifik ("bawa tumbler besok") lebih ampuh daripada ajakan yang umum ("jaga lingkungan").',
  },
  'jejaring-hijau': {
    sapaan: 'Halo, Nak. Saya Pak Jaka, yang menghubungkan sekolah dengan mitra di luar.',
    baris: [
      'Sekolah tidak bisa jalan sendiri. DLH, pelaku usaha, komunitas — semuanya bagian dari gerakan yang sama.',
      'Kemitraan yang baik itu dua arah: kita dapat bantuan, mitra dapat laporan yang jelas.',
      'Aksi bersih sungai atau penghijauan itu lebih besar kalau dikerjakan bareng warga sekitar.',
    ],
    tips: 'Surat dan proposal yang rapi itu pintu pertama sebuah kemitraan.',
  },
}
