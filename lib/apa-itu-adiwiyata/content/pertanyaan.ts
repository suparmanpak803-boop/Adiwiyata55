// Soal kuis bos akhir Bab 6 (Inspeksi Tim Adiwiyata) yang memakai ulang
// semua mekanik bab 1-5, plus pertanyaan refleksi penutup tiap bab.
import type { ChapterId } from '../types'

export interface SoalInspeksi {
  pertanyaan: string
  pilihan: string[]
  jawabanIndex: number
  penjelasan: string
  mekanik: 'tas' | 'pilah' | 'maggot' | 'kompos' | 'air'
}

export const SOAL_INSPEKSI: SoalInspeksi[] = [
  {
    pertanyaan: 'Besok pagi kamu berangkat sekolah. Mana yang sebaiknya masuk tas?',
    pilihan: [
      'Tumbler dan lunch box',
      'Botol plastik sekali pakai dan kotak styrofoam',
      'Sedotan plastik dan kantong kresek',
      'Botol plastik sekali pakai saja',
    ],
    jawabanIndex: 0,
    penjelasan: 'Tumbler, lunch box, dan tas kain bisa dipakai ulang setiap hari.',
    mekanik: 'tas',
  },
  {
    pertanyaan: 'Kotak styrofoam bekas bekal sebaiknya diapakan?',
    pilihan: [
      'Dibawa pulang dan dipakai ulang besok',
      'Ditinggalkan dan diganti lunch box',
      'Dibuang ke bak organik',
      'Diberikan ke maggot',
    ],
    jawabanIndex: 1,
    penjelasan: 'Styrofoam sekali pakai sulit didaur ulang, jadi lebih baik tinggalkan dan pakai lunch box.',
    mekanik: 'tas',
  },
  {
    pertanyaan: 'Bungkus plastik berminyak bekas gorengan masuk bak apa?',
    pilihan: ['Organik', 'Anorganik', 'Kertas', 'Residu', 'B3'],
    jawabanIndex: 3,
    penjelasan: 'Minyaknya bikin plastik ini sulit didaur ulang.',
    mekanik: 'pilah',
  },
  {
    pertanyaan: 'Kertas HVS yang masih bersih dan kering masuk bak apa?',
    pilihan: ['Organik', 'Anorganik', 'Kertas', 'Residu', 'B3'],
    jawabanIndex: 2,
    penjelasan: 'Kertas bersih masih bisa didaur ulang jadi kertas baru.',
    mekanik: 'pilah',
  },
  {
    pertanyaan: 'Baterai bekas masuk bak apa?',
    pilihan: ['Organik', 'Anorganik', 'Kertas', 'Residu', 'B3'],
    jawabanIndex: 4,
    penjelasan: 'Baterai mengandung bahan kimia berbahaya dan harus ditangani khusus.',
    mekanik: 'pilah',
  },
  {
    pertanyaan: 'Makanan apa yang paling cocok untuk maggot?',
    pilihan: [
      'Sisa nasi dan sayur',
      'Daging berlebih dan makanan berminyak',
      'Plastik dan styrofoam',
      'Kertas dan kardus',
    ],
    jawabanIndex: 0,
    penjelasan: 'Maggot doyan sisa nasi, sayur, dan buah yang tidak berminyak.',
    mekanik: 'maggot',
  },
  {
    pertanyaan: 'Apa hasil panen dari kotak maggot?',
    pilihan: [
      'Pakan ikan dan kasgot',
      'Minyak goreng dan sabun',
      'Kertas daur ulang',
      'Bibit tanaman',
    ],
    jawabanIndex: 0,
    penjelasan: 'Maggot besar jadi pakan ikan, kotorannya (kasgot) jadi pupuk.',
    mekanik: 'maggot',
  },
  {
    pertanyaan: 'Bahan apa yang disebut bahan cokelat dalam kompos?',
    pilihan: [
      'Daun kering dan ranting',
      'Sisa sayur dan buah',
      'Sisa nasi',
      'Ampas kopi',
    ],
    jawabanIndex: 0,
    penjelasan: 'Bahan cokelat itu yang kering seperti daun dan ranting, penyeimbang bahan hijau yang basah.',
    mekanik: 'kompos',
  },
  {
    pertanyaan: 'Kenapa kompos perlu diaduk sesekali?',
    pilihan: [
      'Supaya udara masuk dan tidak bau',
      'Supaya warnanya bagus',
      'Supaya cepat kering dijemur',
      'Supaya semut datang',
    ],
    jawabanIndex: 0,
    penjelasan: 'Tanpa udara, kompos jadi bau dan prosesnya lambat.',
    mekanik: 'kompos',
  },
  {
    pertanyaan: 'Apa fungsi lubang biopori di halaman sekolah?',
    pilihan: [
      'Membantu air hujan meresap ke tanah',
      'Menyimpan sampah organik',
      'Menampung air minum',
      'Menanam pohon',
    ],
    jawabanIndex: 0,
    penjelasan: 'Biopori bikin air hujan meresap, jadi halaman tidak tergenang dan banjir berkurang.',
    mekanik: 'air',
  },
  {
    pertanyaan: 'Keran menetes di toilet sebaiknya diapakan?',
    pilihan: [
      'Dibiarkan, toh cuma setetes',
      'Dilaporkan supaya diperbaiki',
      'Ditutup pakai plastik',
      'Dipakai untuk menyiram',
    ],
    jawabanIndex: 1,
    penjelasan: 'Tetesan kecil yang dibiarkan bisa jadi ember penuh dalam sehari.',
    mekanik: 'air',
  },
  {
    pertanyaan:
      'Lampu kelas yang menyala saat istirahat dan tidak ada orang sebaiknya diapakan?',
    pilihan: [
      'Dibiarkan menyala',
      'Dimatikan',
      'Diganti yang lebih terang',
      'Dinyalakan semua',
    ],
    jawabanIndex: 1,
    penjelasan: 'Memadamkan lampu yang tidak dipakai adalah cara paling gampang menghemat energi.',
    mekanik: 'air',
  },
]

export const REFLEKSI: Record<ChapterId, string> = {
  gerbang:
    'Hari ini kamu mulai membawa barang yang bisa dipakai ulang. Barang sekali pakai apa yang paling sering kamu pakai, dan apa gantinya?',
  kantin:
    'Tadi kamu memilah sampah ke bak yang benar. Bak mana yang paling sulit kamu bedakan, dan kenapa?',
  maggot:
    'Sisa makananmu ternyata bisa jadi pakan dan pupuk. Apa lagi di kantin yang selama ini terbuang sia-sia?',
  kompos:
    'Hari ini kamu mengubah sisa makanan jadi pupuk. Apa lagi yang bisa kamu ubah besok?',
  'air-energi':
    'Satu keran menetes bisa jadi ember penuh dalam sehari. Di mana lagi di sekolahmu air atau listrik terbuang sia-sia?',
  biodiversitas:
    'Sekolah yang rindang mengundang burung dan kupu-kupu kembali. Apa yang akan kamu jaga supaya mereka tetap datang?',
}
