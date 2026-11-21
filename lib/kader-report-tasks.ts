// Tugas 14 jenis kader Adiwiyata 2026.
// PERINGATAN: nama kader dan uraian tugas di bawah ini adalah
// rekonstruksi (tidak ada salinannya yang tersisa di repo — lihat
// PERBAIKAN.md). Jumlahnya HARUS 14 karena UI meng-hardcode angka itu
// (components/adiwiyata/kader-report-form.tsx). Ganti dengan daftar
// resmi sekolah / Google Form asli bila sudah ada.
export const KADER_REPORT_TASKS: { name: string; tasks: string[] }[] = [
  {
    name: 'Kader Kebersihan',
    tasks: ['Membersihkan kelas dan koridor', 'Memastikan tempat sampah tersedia dan tidak meluap', 'Mengingatkan teman membuang sampah pada tempatnya'],
  },
  {
    name: 'Kader Penghijauan',
    tasks: ['Menyiram tanaman', 'Menanam dan merawat tanaman baru', 'Membersihkan area hijau sekolah'],
  },
  {
    name: 'Kader Bank Sampah',
    tasks: ['Menimbang sampah anorganik', 'Mencatat setoran bank sampah', 'Memilah sampah bernilai jual'],
  },
  {
    name: 'Kader Kompos',
    tasks: ['Mengumpulkan sampah organik', 'Mengolah sampah organik menjadi kompos', 'Memantau proses pengomposan'],
  },
  {
    name: 'Kader Daur Ulang',
    tasks: ['Mengumpulkan bahan daur ulang', 'Membuat kreasi dari barang bekas', 'Mendokumentasikan hasil daur ulang'],
  },
  {
    name: 'Kader Hemat Energi',
    tasks: ['Mematikan lampu dan AC yang tidak dipakai', 'Memantau pemakaian listrik kelas', 'Mengampanyekan hemat energi'],
  },
  {
    name: 'Kader Hemat Air',
    tasks: ['Memeriksa keran bocor', 'Menghemat pemakaian air', 'Melaporkan kerusakan instalasi air'],
  },
  {
    name: 'Kader Kantin Sehat',
    tasks: ['Memantau kebersihan kantin', 'Mengurangi sampah plastik di kantin', 'Mengampanyekan wadah guna ulang'],
  },
  {
    name: 'Kader Taman Sekolah',
    tasks: ['Merawat taman kelas', 'Menata tanaman hias', 'Membersihkan taman dari sampah'],
  },
  {
    name: 'Kader Drainase',
    tasks: ['Membersihkan saluran drainase', 'Memastikan drainase tidak tersumbat', 'Melaporkan genangan air'],
  },
  {
    name: 'Kader Edukasi Lingkungan',
    tasks: ['Menyampaikan materi lingkungan di kelas', 'Membuat poster edukasi', 'Mengajak teman mengikuti aksi lingkungan'],
  },
  {
    name: 'Kader Dokumentasi',
    tasks: ['Memotret kegiatan lingkungan', 'Menyusun laporan kegiatan', 'Mengarsipkan dokumentasi'],
  },
  {
    name: 'Kader Kebun Sekolah',
    tasks: ['Merawat kebun sekolah', 'Memanen hasil kebun', 'Mencatat perkembangan tanaman'],
  },
  {
    name: 'Kader Zero Waste',
    tasks: ['Mengampanyekan zero waste', 'Memantau sampah sekali pakai', 'Mengajak warga sekolah membawa wadah guna ulang'],
  },
]
