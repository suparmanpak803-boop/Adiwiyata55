// Koleksi spesies yang bisa dibuka di Bab 6 (Biodiversitas).
// Semua spesies di bawah ini wajar dijumpai di halaman sekolah di Jakarta.
export interface Spesies {
  id: string
  nama: string
  jenis: 'burung' | 'kupu-kupu' | 'serangga' | 'tanaman'
  deskripsi: string
}

export const SPESIES: Spesies[] = [
  {
    id: 'burung-gereja',
    nama: 'Burung Gereja',
    jenis: 'burung',
    deskripsi:
      'Burung kecil yang paling sering terlihat di atap dan pohon sekolah. Suka berkelompok dan berkicau ramai di pagi hari.',
  },
  {
    id: 'burung-kutilang',
    nama: 'Burung Kutilang',
    jenis: 'burung',
    deskripsi:
      'Burung berkicau dengan jambul kecil, sering bertengger di kabel dan dahan. Suaranya merdu dan gampang dikenali.',
  },
  {
    id: 'kupu-kupu-kertas',
    nama: 'Kupu-kupu Kertas',
    jenis: 'kupu-kupu',
    deskripsi:
      'Kupu-kupu putih kekuningan yang beterbangan di sekitar kebun. Sayapnya tipis seperti kertas, makanya disebut begitu.',
  },
  {
    id: 'kupu-kupu-raja',
    nama: 'Kupu-kupu Raja',
    jenis: 'kupu-kupu',
    deskripsi:
      'Kupu-kupu besar bersayap gelap dengan bintik terang. Biasanya mampir ke bunga di kebun sekolah.',
  },
  {
    id: 'kunang-kunang',
    nama: 'Kunang-kunang',
    jenis: 'serangga',
    deskripsi:
      'Serangga kecil yang menyala di malam hari. Makin banyak kunang-kunang, makin sehat lingkungan sekitarnya.',
  },
  {
    id: 'lebah',
    nama: 'Lebah',
    jenis: 'serangga',
    deskripsi:
      'Lebah membantu penyerbukan bunga di kebun. Jangan diganggu, biarkan ia bekerja.',
  },
  {
    id: 'belalang',
    nama: 'Belalang',
    jenis: 'serangga',
    deskripsi:
      'Belalang hijau suka bersembunyi di antara daun. Kakinya yang panjang membuatnya bisa melompat jauh.',
  },
  {
    id: 'pohon-ketapang',
    nama: 'Pohon Ketapang',
    jenis: 'tanaman',
    deskripsi:
      'Pohon peneduh besar yang daunnya lebar dan gugur di musim kemarau. Buahnya disukai kelelawar dan burung.',
  },
]
