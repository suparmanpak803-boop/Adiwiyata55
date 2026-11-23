// Data awal game (seed). Tidak menimpa data yang sudah ada
// (ON CONFLICT DO NOTHING pada indeks unik).
//
// PERINGATAN: isi soal/item/misi di bawah ini adalah rekonstruksi —
// tidak ada satu pun literal konten seed yang tersisa di repo (lihat
// PERBAIKAN.md). Video edukasi SENGAJA tidak diisi (videosAdded
// selalu 0), sesuai catatan UI diagnostik: video dikelola admin
// lewat panel video, bukan lewat seed.
import { pool } from '@/lib/db'
import { WASTE_ITEMS } from '@/lib/waste-items'

const SEED_QUESTIONS: {
  pertanyaan: string
  opsi: [string, string, string, string]
  jawaban: 'a' | 'b' | 'c' | 'd'
  penjelasan: string
  kategori: string
  tingkat: string
}[] = [
  {
    pertanyaan: 'Sampah sisa makanan dan daun kering sebaiknya dibuang ke tempat sampah apa?',
    opsi: ['Organik', 'Anorganik', 'Residu', 'B3'],
    jawaban: 'a',
    penjelasan: 'Sisa makanan dan daun adalah sampah organik yang bisa diolah menjadi kompos.',
    kategori: 'Pemilahan Sampah',
    tingkat: 'mudah',
  },
  {
    pertanyaan: 'Botol plastik bekas termasuk sampah jenis apa?',
    opsi: ['Organik', 'Anorganik', 'Kertas', 'B3'],
    jawaban: 'b',
    penjelasan: 'Botol plastik adalah sampah anorganik yang sulit terurai dan bisa didaur ulang.',
    kategori: 'Pemilahan Sampah',
    tingkat: 'mudah',
  },
  {
    pertanyaan: 'Baterai bekas harus dibuang ke tempat sampah apa?',
    opsi: ['Organik', 'Residu', 'B3', 'Kertas'],
    jawaban: 'c',
    penjelasan: 'Baterai mengandung bahan berbahaya dan beracun (B3), jangan dicampur dengan sampah lain.',
    kategori: 'Pemilahan Sampah',
    tingkat: 'sedang',
  },
  {
    pertanyaan: 'Apa kepanjangan dari 3R dalam pengelolaan sampah?',
    opsi: ['Reduce, Reuse, Recycle', 'Read, Ride, Run', 'Reduce, Repair, Return', 'Reuse, Recycle, Remove'],
    jawaban: 'a',
    penjelasan: '3R adalah Reduce (kurangi), Reuse (gunakan kembali), dan Recycle (daur ulang).',
    kategori: 'Daur Ulang',
    tingkat: 'mudah',
  },
  {
    pertanyaan: 'Sampah organik dapat diolah menjadi apa?',
    opsi: ['Kompos', 'Kertas baru', 'Plastik baru', 'Bahan bakar minyak'],
    jawaban: 'a',
    penjelasan: 'Sampah organik diolah menjadi kompos yang bermanfaat sebagai pupuk tanaman.',
    kategori: 'Kompos',
    tingkat: 'mudah',
  },
  {
    pertanyaan: 'Mengapa membawa tumbler dan wadah makan guna ulang penting?',
    opsi: ['Agar terlihat keren', 'Mengurangi sampah plastik sekali pakai', 'Agar makanan lebih enak', 'Tidak ada manfaatnya'],
    jawaban: 'b',
    penjelasan: 'Wadah guna ulang mengurangi sampah plastik sekali pakai dari kantin dan jajan.',
    kategori: 'Wadah Makan Ramah Lingkungan',
    tingkat: 'mudah',
  },
  {
    pertanyaan: 'Kertas bekas sebaiknya dibuang ke tempat sampah apa?',
    opsi: ['Organik', 'Anorganik', 'Kertas', 'Residu'],
    jawaban: 'c',
    penjelasan: 'Kertas bekas dipilah terpisah agar mudah didaur ulang menjadi kertas baru.',
    kategori: 'Pemilahan Sampah',
    tingkat: 'mudah',
  },
  {
    pertanyaan: 'Masker bekas dan tisu bekas termasuk sampah apa?',
    opsi: ['Organik', 'Anorganik', 'Kertas', 'Residu'],
    jawaban: 'd',
    penjelasan: 'Masker dan tisu bekas tidak bisa didaur ulang, jadi masuk kategori residu.',
    kategori: 'Pemilahan Sampah',
    tingkat: 'sedang',
  },
  {
    pertanyaan: 'Apa yang dimaksud dengan Adiwiyata?',
    opsi: ['Lomba kebersihan kelas', 'Program sekolah peduli dan berbudaya lingkungan', 'Nama ekstrakurikuler olahraga', 'Nama kantin sekolah'],
    jawaban: 'b',
    penjelasan: 'Adiwiyata adalah program sekolah yang peduli dan berbudaya lingkungan.',
    kategori: 'Kegiatan Adiwiyata SMAN 55',
    tingkat: 'mudah',
  },
  {
    pertanyaan: 'Sampah plastik yang dibuang sembarangan dapat mencemari apa?',
    opsi: ['Tanah dan air', 'Hanya udara', 'Hanya langit', 'Tidak mencemari apa-apa'],
    jawaban: 'a',
    penjelasan: 'Plastik yang dibuang sembarangan mencemari tanah, sungai, dan laut, serta sulit terurai.',
    kategori: 'Pemilahan Sampah',
    tingkat: 'sedang',
  },
]

const ITEM_ICON: Record<string, string> = {
  organik: 'leaf',
  anorganik: 'milk',
  kertas: 'file',
  residu: 'trash',
  b3: 'biohazard',
}

const SEED_MISSIONS: { judul: string; deskripsi: string; poin: number }[] = [
  { judul: 'Bawa Tumbler 5 Hari', deskripsi: 'Bawa tumbler sendiri selama 5 hari sekolah berturut-turut.', poin: 50 },
  { judul: 'Pilahlah 10 Sampah', deskripsi: 'Pilahkan 10 sampah ke tempat yang benar dalam satu minggu.', poin: 30 },
  { judul: 'Bersihkan Drainase', deskripsi: 'Bersama kader, bersihkan satu saluran drainase di lingkungan sekolah.', poin: 40 },
]

export async function ensureStarterGameContent(gameKey: string): Promise<void> {
  if (gameKey !== 'kuis_adiwiyata') return
  const count = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.kuis_soal WHERE aktif = true`)
  if ((count.rows[0]?.n ?? 0) > 0) return
  await seedQuestions()
}

async function seedQuestions(): Promise<number> {
  let added = 0
  for (const question of SEED_QUESTIONS) {
    const result = await pool.query(
      `INSERT INTO public.kuis_soal (pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban, penjelasan, kategori, tingkat_kesulitan, aktif)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) ON CONFLICT DO NOTHING`,
      [question.pertanyaan, ...question.opsi, question.jawaban, question.penjelasan, question.kategori, question.tingkat],
    )
    added += result.rowCount ?? 0
  }
  return added
}

export async function seedGameDefaults(
  userId: string,
): Promise<{ questionsAdded: number; itemsAdded: number; missionsAdded: number; videosAdded: number }> {
  const questionsAdded = await seedQuestions()

  let itemsAdded = 0
  for (const item of WASTE_ITEMS) {
    const result = await pool.query(
      `INSERT INTO public.item_sampah (nama, emoji, jenis, penjelasan, tingkat_kesulitan, aktif)
         VALUES ($1,$2,$3,'', 'mudah', true) ON CONFLICT DO NOTHING`,
      [item.name, ITEM_ICON[item.bin] ?? 'recycle', item.bin],
    )
    itemsAdded += result.rowCount ?? 0
  }

  let missionsAdded = 0
  for (const mission of SEED_MISSIONS) {
    const result = await pool.query(
      `INSERT INTO public.misi_mingguan (judul, deskripsi, poin, mulai, selesai, aktif, dibuat_oleh)
         VALUES ($1,$2,$3, now(), now() + interval '7 days', true, $4) ON CONFLICT DO NOTHING`,
      [mission.judul, mission.deskripsi, mission.poin, userId],
    )
    missionsAdded += result.rowCount ?? 0
  }

  // Video edukasi sengaja tidak diisi oleh seed (dikelola admin).
  return { questionsAdded, itemsAdded, missionsAdded, videosAdded: 0 }
}
