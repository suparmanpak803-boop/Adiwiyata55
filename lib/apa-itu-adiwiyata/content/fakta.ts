// Soal "Tebak dulu" untuk Bab 1 (Gerbang Sekolah) dan kartu fakta maggot (Bab 3).
// PENTING: semua angka di sini ditulis sebagai perkiraan (kata "sekitar" /
// "menurut perkiraan") dan fakta menjelaskan cara menghitungnya sendiri.
// Jangan mengganti angka-angka ini dengan angka pasti atas nama sekolah
// tanpa data pengukuran nyata dari sekolah.
export interface TebakDulu {
  pertanyaan: string
  pilihan: string[]
  jawabanIndex: number
  fakta: string
}

export const TEBAK_DULU: TebakDulu[] = [
  {
    pertanyaan:
      'Menurut perkiraanmu, berapa botol plastik sekali pakai yang dipakai satu sekolah dengan sekitar 1.000 siswa dalam sehari?',
    pilihan: [
      'Sekitar 10 botol',
      'Sekitar 100 botol',
      'Sekitar 500 botol',
      'Sekitar 2.000 botol',
    ],
    jawabanIndex: 2,
    fakta:
      'Menurut perkiraan, kalau separuh siswa membawa satu botol sekali pakai per hari, sekolah berisi sekitar 1.000 siswa bisa menghasilkan sekitar 500 botol sehari. Coba hitung sendiri di kantinmu: catat botol yang terjual dalam satu hari, lalu kalikan lima hari sekolah.',
  },
  {
    pertanyaan: 'Berapa lama menurutmu botol plastik terurai di alam?',
    pilihan: [
      'Sekitar 1 bulan',
      'Sekitar 1 tahun',
      'Sekitar 10 tahun',
      'Sekitar 450 tahun',
    ],
    jawabanIndex: 3,
    fakta:
      'Para peneliti memperkirakan botol plastik butuh ratusan tahun untuk terurai, sekitar 450 tahun menurut perkiraan umum. Artinya botol yang kita buang hari ini masih ada saat cucu kita besar nanti.',
  },
  {
    pertanyaan:
      'Berapa kali kira-kira tumbler bisa dipakai ulang sebelum rusak?',
    pilihan: ['Sekali', 'Sekitar 10 kali', 'Sekitar 100 kali', 'Ratusan kali'],
    jawabanIndex: 3,
    fakta:
      'Tumbler yang dirawat baik bisa dipakai ratusan kali. Kalau satu tumbler menggantikan satu botol sehari, dalam setahun kamu menghindari sekitar 200 botol plastik sekali pakai.',
  },
  {
    pertanyaan:
      'Menurut perkiraanmu, berapa persen sampah sekolah yang sebenarnya masih bisa diolah (didaur ulang atau dikompos)?',
    pilihan: [
      'Sekitar 10 persen',
      'Sekitar 30 persen',
      'Sekitar 60 persen',
      'Sekitar 90 persen',
    ],
    jawabanIndex: 2,
    fakta:
      'Menurut perkiraan umum, lebih dari separuh sampah sekolah adalah organik dan anorganik yang masih bisa diolah. Sisanya yang benar-benar residu jauh lebih sedikit kalau kita pilah dengan benar.',
  },
]

export interface FaktaMaggot {
  judul: string
  isi: string
}

export const FAKTA_MAGGOT: FaktaMaggot[] = [
  {
    judul: 'Maggot itu larva lalat tentara hitam',
    isi: 'Maggot BSF adalah larva lalat tentara hitam (Black Soldier Fly). Lalat dewasanya tidak menggigit dan tidak membawa penyakit seperti lalat rumah, jadi aman dipelihara di sekolah.',
  },
  {
    judul: 'Makannya sisa makanan kita',
    isi: 'Maggot doyan sisa nasi, sayur, dan buah. Satu kotak maggot bisa menghabiskan sisa makanan kantin dalam hitungan hari.',
  },
  {
    judul: 'Panennya jadi pakan ikan',
    isi: 'Maggot yang sudah besar kaya protein dan bisa jadi pakan ikan atau ayam, menggantikan pakan pabrik yang harganya mahal.',
  },
  {
    judul: 'Kasgotnya jadi pupuk',
    isi: 'Kotoran maggot yang disebut kasgot adalah pupuk organik yang bagus untuk kebun. Jadi tidak ada yang terbuang dari kotak maggot.',
  },
]
