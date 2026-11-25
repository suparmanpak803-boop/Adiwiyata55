// Kartu ensiklopedia Adiwiyata. Kartu terbuka setelah topiknya dimainkan.
// Ringkasan 1 kalimat, isi 3-5 kalimat, bahasa santai.
import type { ChapterId } from '../types'

export interface KartuEnsiklopedia {
  id: string
  judul: string
  ringkasan: string
  isi: string
  babTerkait: ChapterId
}

export const KARTU_ENSIKLOPEDIA: KartuEnsiklopedia[] = [
  {
    id: 'arti-adiwiyata',
    judul: 'Apa itu Adiwiyata?',
    ringkasan: 'Adiwiyata adalah program sekolah peduli dan berbudaya lingkungan.',
    isi: "Adiwiyata berasal dari kata 'adi' yang berarti besar atau baik, dan 'wiyata' yang berarti tempat belajar. Jadi sekolah Adiwiyata adalah tempat belajar yang baik dan peduli lingkungan. Program ini mengajak seluruh warga sekolah, siswa, guru, dan karyawan, menjaga lingkungan lewat kebiasaan sehari-hari. Tujuannya bukan sekadar sekolah yang bersih, tapi warga sekolah yang sadar dan bertindak. Kalau sudah berjalan baik, sekolah bisa naik tingkat sampai Adiwiyata Mandiri.",
    babTerkait: 'gerbang',
  },
  {
    id: 'empat-pilar',
    judul: '4 Pilar Adiwiyata',
    ringkasan:
      'Empat hal yang membuat sekolah jadi Adiwiyata: kebijakan, kurikulum, partisipasi, dan sarana.',
    isi: 'Pilar pertama adalah kebijakan sekolah yang berpihak pada lingkungan, misalnya aturan membawa tumbler. Pilar kedua adalah kurikulum: pelajaran yang mengajak siswa peduli lingkungan, bukan cuma teori. Pilar ketiga adalah kegiatan partisipatif, semua warga sekolah ikut bergerak, bukan hanya petugas kebersihan. Pilar keempat adalah pengelolaan sarana dan prasarana yang ramah lingkungan, seperti pemilahan sampah dan hemat energi.',
    babTerkait: 'gerbang',
  },
  {
    id: 'jenis-sampah',
    judul: '5 Bak Sampah SMAN 55',
    ringkasan:
      'Organik, Anorganik, Kertas, Residu, dan B3, kenali isinya supaya tidak salah bak.',
    isi: 'Bak Organik untuk sisa makanan dan daun yang bisa membusuk, lalu jadi kompos atau pakan maggot. Bak Anorganik untuk barang yang masih bisa didaur ulang, seperti botol plastik bersih dan kaleng. Bak Kertas untuk kertas, koran, dan kardus yang kering dan bersih. Bak Residu untuk sampah yang sulit diolah, seperti bungkus berminyak, styrofoam, dan masker. Bak B3 untuk bahan berbahaya seperti baterai, lampu bekas, dan obat kedaluwarsa, yang harus ditangani khusus.',
    babTerkait: 'kantin',
  },
  {
    id: 'maggot-bsf',
    judul: 'Maggot BSF',
    ringkasan:
      'Larva lalat tentara hitam yang makan sisa makanan dan menghasilkan pakan plus pupuk.',
    isi: 'Maggot BSF adalah larva lalat tentara hitam (Black Soldier Fly). Lalat dewasanya tidak menggigit dan tidak membawa penyakit, jadi aman dipelihara di sekolah. Maggot makan sisa nasi, sayur, dan buah dengan rakus. Setelah besar, maggot dipanen jadi pakan ikan atau ayam yang kaya protein. Kotorannya, yang disebut kasgot, adalah pupuk organik untuk kebun.',
    babTerkait: 'maggot',
  },
  {
    id: 'kompos',
    judul: 'Kompos',
    ringkasan:
      'Sampah organik yang diolah jadi pupuk lewat bantuan mikroba dan udara.',
    isi: 'Kompos dibuat dari bahan hijau yang basah seperti sisa sayur dan bahan cokelat yang kering seperti daun. Keduanya disusun berlapis dengan perbandingan yang pas, lalu diaduk supaya udara masuk. Mikroba bekerja menguraikan bahan itu selama beberapa minggu. Hasilnya adalah pupuk yang menyuburkan tanah kebun sekolah. Kompos yang bau biasanya kekurangan udara atau kebanyakan bahan basah.',
    babTerkait: 'kompos',
  },
  {
    id: 'eco-enzyme',
    judul: 'Eco Enzyme',
    ringkasan:
      'Cairan serbaguna dari fermentasi kulit buah, gula, dan air.',
    isi: 'Eco enzyme dibuat dari kulit buah, gula merah, dan air yang difermentasi sekitar tiga bulan. Cairan ini bisa dipakai sebagai pembersih lantai, pengusir serangga, sampai penyubur tanaman. Membuatnya gampang dan bahannya dari sisa dapur yang biasanya terbuang. Satu botol eco enzyme bisa menggantikan beberapa produk pembersih kimia di sekolah.',
    babTerkait: 'kompos',
  },
  {
    id: 'biopori',
    judul: 'Biopori',
    ringkasan:
      'Lubang resapan kecil yang membantu air hujan masuk ke tanah dan mencegah genangan.',
    isi: 'Biopori adalah lubang silinder di tanah dengan diameter sekitar 10 sampai 30 sentimeter. Lubang ini diisi sampah organik yang lama-lama jadi kompos dan menarik cacing tanah. Air hujan yang biasanya menggenang jadi meresap ke dalam tanah. Biopori juga membantu mencegah banjir di halaman sekolah saat hujan deras.',
    babTerkait: 'air-energi',
  },
  {
    id: 'tumbler-vs-botol',
    judul: 'Tumbler vs Botol Plastik',
    ringkasan:
      'Satu tumbler yang dipakai ulang bisa menggantikan ratusan botol sekali pakai.',
    isi: 'Botol plastik sekali pakai dipakai sebentar lalu dibuang, dan butuh ratusan tahun untuk terurai. Tumbler bisa dipakai ulang ratusan kali kalau dirawat dengan baik. Kalau satu tumbler menggantikan satu botol sehari, dalam setahun kamu menghindari sekitar 200 botol. Membawa tumbler juga lebih hemat daripada membeli minuman kemasan setiap hari.',
    babTerkait: 'gerbang',
  },
  {
    id: 'spesies-sekolah',
    judul: 'Spesies di Halaman Sekolah',
    ringkasan:
      'Burung, kupu-kupu, dan serangga datang kalau halaman sekolah rindang dan bersih.',
    isi: 'Burung gereja dan kutilang sering mampir ke pohon yang rindang untuk bertengger dan mencari makan. Kupu-kupu kertas dan kupu-kupu raja datang kalau ada tanaman berbunga di kebun. Lebah dan kunang-kunang adalah tanda lingkungan sekolah masih sehat. Makin beragam tanaman di sekolah, makin banyak spesies yang mau tinggal di sana.',
    babTerkait: 'biodiversitas',
  },
]
