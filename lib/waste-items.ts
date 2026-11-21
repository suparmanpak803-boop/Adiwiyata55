// Item dan keranjang game Tangkap Sampah.
// Himpunan 5 jenis sampah mengikuti CHECK tabel item_sampah di DB.
// PERINGATAN: daftar nama item dan warna di bawah ini adalah rekonstruksi
// (tidak ada salinannya yang tersisa di repo — lihat PERBAIKAN.md).
// Game ini membaca WASTE_ITEMS statis, BUKAN tabel item_sampah di DB;
// item baru yang ditambah admin lewat panel konten game tidak akan
// muncul di game sampai daftar ini ikut diperbarui.
export type Bin = 'organik' | 'anorganik' | 'kertas' | 'residu' | 'b3'

export const BINS: { id: Bin; label: string; color: string }[] = [
  { id: 'organik', label: 'Organik', color: '#4d8a4f' },
  { id: 'anorganik', label: 'Anorganik', color: '#3b7ea1' },
  { id: 'kertas', label: 'Kertas', color: '#c98a2e' },
  { id: 'residu', label: 'Residu', color: '#7a7a7a' },
  { id: 'b3', label: 'B3', color: '#a13b3b' },
]

export const WASTE_ITEMS: { name: string; bin: Bin }[] = [
  { name: 'Sisa nasi', bin: 'organik' },
  { name: 'Kulit pisang', bin: 'organik' },
  { name: 'Daun kering', bin: 'organik' },
  { name: 'Sisa sayur', bin: 'organik' },
  { name: 'Ampas teh', bin: 'organik' },
  { name: 'Botol plastik', bin: 'anorganik' },
  { name: 'Kaleng minuman', bin: 'anorganik' },
  { name: 'Gelas plastik', bin: 'anorganik' },
  { name: 'Bungkus snack', bin: 'anorganik' },
  { name: 'Sendok plastik', bin: 'anorganik' },
  { name: 'Kertas bekas', bin: 'kertas' },
  { name: 'Kardus', bin: 'kertas' },
  { name: 'Koran bekas', bin: 'kertas' },
  { name: 'Buku tulis bekas', bin: 'kertas' },
  { name: 'Tisu bekas', bin: 'residu' },
  { name: 'Masker bekas', bin: 'residu' },
  { name: 'Styrofoam', bin: 'residu' },
  { name: 'Puntung rokok', bin: 'residu' },
  { name: 'Baterai bekas', bin: 'b3' },
  { name: 'Lampu neon', bin: 'b3' },
  { name: 'Botol obat', bin: 'b3' },
  { name: 'Tinta printer', bin: 'b3' },
]
