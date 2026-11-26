'use client'

// Panduan "Cara Bermain" — kartu overlay yang bisa ditutup dan di-scroll.
// Dibuka dari Layar Awal, tombol "?" di HUD dunia/layar misi, dan Profil.
// Isi diambil dari isi game yang sebenarnya (mekanik dari INTERAKSI_MISI,
// dunia hidup, cerita bercabang, streak) — tidak ada fitur yang dikarang.

import { X } from 'lucide-react'
import { BAK } from '@/lib/apa-itu-adiwiyata/content/bak'
import { ECO_SHOP, SKOR_MISI_PERTAMA, SKOR_PANEL_SURYA, SKOR_POHON } from '@/lib/apa-itu-adiwiyata/content/toko'
import { klik } from './suara'

const CARA_MISI: { judul: string; cara: string }[] = [
  { judul: 'Budaya Lingkungan', cara: 'Tangkap barang guna ulang yang jatuh, lalu lempar ke tas.' },
  { judul: 'Pilah', cara: 'Sortir cepat di ban berjalan, lalu lempar sampah ke 5 bak.' },
  { judul: 'Maggot', cara: 'Tangkap pakan yang aman, geser tuas kotak, tahan saringan saat panen.' },
  { judul: 'Olah Organik', cara: 'Susun lapisan kompos, siram tanaman mengikuti irama, ketuk sayur yang matang.' },
  { judul: 'Air & Energi Lestari', cara: 'Putar bor biopori, sambung pipa air hujan, cari perangkat boros.' },
  { judul: 'Hijau dan Biodiversitas', cara: 'Kuis kilat: jawab sebelum waktu habis.' },
  { judul: 'Bank Sampah dan Daur Ulang', cara: 'Sortir cepat, ketuk sel tabel timbangan, hitung kilat.' },
  { judul: 'Lingkungan Sehat', cara: 'Cari perbedaan di toilet, drainase, dan taman, lalu ketuk tindakan yang benar.' },
  { judul: 'Edu-Lingkungan', cara: 'Kartu memori: pasangkan soal dengan jawaban.' },
  { judul: 'Inovasi Hijau', cara: 'Puzzle geser 3×3: ketuk dua petak untuk menukar isinya sampai jadi kalimat poster yang benar (baca kiri ke kanan, atas ke bawah).' },
  { judul: 'Kantin Hijau', cara: 'Simulasi kantin: layani pesanan yang datang.' },
  { judul: 'Data Hijau', cara: 'Ketuk batang grafik sampai tingginya sesuai data, lalu jawab soal tabel.' },
  { judul: 'Eco-Communication', cara: 'Susun frame storyboard sesuai urutan cerita.' },
  { judul: 'Jejaring Hijau', cara: 'Balas cepat: ketuk balasan terbaik sebelum waktu habis.' },
]

export function CaraBermain({ onTutup }: { onTutup: () => void }) {
  const tutup = () => {
    klik()
    onTutup()
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cara bermain"
      className="aia-panduan-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        // B-6: panduan (60) di bawah Jeda (70) dan Keluar (80).
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <section
        className="aia-card"
        style={{ width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}
        aria-labelledby="aia-panduan-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <span className="aia-kicker">Panduan</span>
            <h2 id="aia-panduan-title" className="aia-section-title" style={{ margin: 0 }}>
              Cara Bermain
            </h2>
          </div>
          <button type="button" className="aia-icon-btn" onClick={tutup} aria-label="Tutup panduan">
            <X aria-hidden="true" />
          </button>
        </div>
        <p className="aia-muted">
          Kamu siswa baru yang ditugaskan menjadikan sekolahmu Adiwiyata. Jelajahi sekolah, temui warga sekolah,
          dan selesaikan 6 misi utama + 8 Misi Tambahan bersama Magi si larva maggot. Tidak ada yang benar-benar
          sampah. Panduan ini bisa dibuka kapan saja dari tombol &quot;?&quot; — tidak perlu dihafal sebelum main.
        </p>

        <h3 className="aia-section-title">Bergerak</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>HP: joystick di kiri bawah (muncul setelah sentuhan pertama).</li>
          <li>Laptop: tombol WASD atau panah.</li>
        </ul>

        <h3 className="aia-section-title">Bicara dengan NPC</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Dekati NPC, lalu ketuk tombol &quot;Bicara&quot; (atau tekan E di laptop).</li>
          <li>NPC dengan tanda &quot;!&quot; emas punya misi untukmu. Di akhir dialog ada tombol &quot;Mulai misi&quot; (atau &quot;Main lagi&quot; bila sudah selesai).</li>
        </ul>

        {/* Hanya tampil di desktop (laptop) — disembunyikan di HP lewat
            .aia-keyboard di apa-itu-adiwiyata.css. */}
        <section className="aia-keyboard" aria-label="Kontrol keyboard untuk laptop">
          <h3 className="aia-section-title">Kontrol keyboard (laptop)</h3>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li><kbd>WASD</kbd> / <kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> — gerak</li>
            <li><kbd>E</kbd> / <kbd>Enter</kbd> — bicara dengan NPC (atau buka Tempat Sampah Terpilah / Bank Sampah bila dekat)</li>
            <li><kbd>Spasi</kbd> — lanjut dialog</li>
            <li><kbd>Esc</kbd> — tutup dialog</li>
            <li>Klik mouse — jalan ke titik yang diklik</li>
            <li><kbd>P</kbd> — jeda</li>
            <li><kbd>M</kbd> — bisu</li>
          </ul>
        </section>

        <h3 className="aia-section-title">Rumah</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Permainan baru dimulai di rumah. Pintu di bawah membawamu berangkat ke sekolah, dan Jalan Pulang di bawah Gerbang membawamu kembali ke rumah.</li>
          <li>Kasur = checkpoint: istirahat memulihkan Lapar +30 dan Haus +30, progres tersimpan otomatis — 1x sehari, istirahat lagi besok.</li>
          <li>Kulkas: minum gratis, Haus +30, dengan jeda 30 menit.</li>
          <li>Ibu memberimu uang saku Rp5.000 + sarapan (Lapar +40) 1x sehari — bicara lagi dengannya esok hari.</li>
          <li>Meja makan hanya untuk dilihat — tidak ada mekaniknya.</li>
        </ul>

        <h3 className="aia-section-title">Misi</h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Misi utama berurutan: misi berikutnya terbuka setelah misi sebelumnya selesai. Misi Tambahan selalu tersedia
          sejak awal. Tiap misi 3 tahap — selesaikan ketiganya, lalu ketuk &quot;Selesaikan Misi&quot; di Pos Hijau.
          Cara main tiap misi beda:
        </p>
        <ul className="aia-panduan-misi" style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          {CARA_MISI.map((m) => (
            <li key={m.judul}>
              <strong>{m.judul}</strong> — {m.cara}
            </li>
          ))}
        </ul>

        <h3 className="aia-section-title">Puzzle geser</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Ketuk satu petak (dapat garis hijau), lalu ketuk petak kedua — isinya bertukar. Ketuk petak yang sama lagi untuk batal.</li>
          <li>Susun 9 potongan jadi kalimat poster yang benar. Baca seperti buku: kiri ke kanan, atas ke bawah.</li>
          <li>Strategi: baca semua potongan dulu; cari potongan awal (biasanya judul) dan potongan yang diakhiri titik — itu penutup kalimat.</li>
          <li>&quot;Pertukaran&quot; = jumlah tukarmu; &quot;Minimal&quot; = tukar paling sedikit dari acakan awal. Skor mulai 100, dikurangi 5 untuk tiap tukar di atas minimal.</li>
          <li>Mentok? Ketuk &quot;Minta petunjuk Magi&quot; di bawah puzzle. Mode satu-ketukan (di Profil) menampilkan nomor urutan di tiap petak.</li>
          <li>Panduan puzzle muncul saat pertama kali main — tombol &quot;?&quot; di atas grid membukanya lagi kapan saja.</li>
        </ul>

        <h3 className="aia-section-title">Dunia Hidup</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Kebun (kangkung, cabai, bayam) tumbuh dari hari ke hari. Tanaman yang tidak disiram 2 hari jadi layu — siram lagi supaya segar.</li>
          <li>Maggot di kotak Pos Maggot makin lapar setiap hari — ketuk kotaknya untuk memberi makan. Maggot dewasa bisa dipanen jadi kasgot (pupuk).</li>
          <li>Sampah liar menumpuk dari hari ke hari — ketuk atau dekati untuk memungutnya, lalu pilah di Tempat Sampah Terpilah dekat Gerbang atau setor ke Bank Sampah di Kebun.</li>
          <li>Tiap pagi ada Laporan Pagi tentang apa yang berubah sejak kunjungan terakhir.</li>
          <li>Merawat hanya bisa dari dekat — dekati dulu petak, kotak, atau sampahnya.</li>
        </ul>

        <h3 className="aia-section-title">Pilah 5 Bak</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          {BAK.map((b) => (
            <li key={b.id}>
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: b.warna,
                  marginRight: 6,
                  verticalAlign: '-1px',
                }}
              />
              <strong>{b.nama}</strong>
              {b.id === 'organik' && ' — sisa makanan, kulit buah, daun, dan ranting.'}
              {b.id === 'anorganik' && ' — botol plastik bersih, kaleng, dan kaca.'}
              {b.id === 'kertas' && ' — kertas, koran, dan kardus yang kering dan bersih.'}
              {b.id === 'residu' && ' — bungkus berminyak, styrofoam, tisu, dan masker.'}
              {b.id === 'b3' && ' — baterai, lampu bekas, dan obat kedaluwarsa.'}
            </li>
          ))}
          <li>Sampah liar yang dipungut masuk ke tasmu — jumlahnya terlihat di HUD (ikon tempat sampah).</li>
          <li>Di Tempat Sampah Terpilah dekat Gerbang: pilih jenis sampahnya, lalu ketuk bak yang benar. Bak benar: +5 Koin Hijau dan +Rp200 per sampah.</li>
          <li>Salah bak tidak apa-apa — Magi memberitahu bak yang benar, sampahnya tetap di tasmu, dan kamu bisa coba lagi tanpa kehilangan apa pun.</li>
        </ul>

        <h3 className="aia-section-title">Bank Sampah</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Di Kebun ada Bank Sampah: dekati mejanya, lalu ketuk &quot;Setor Sampah&quot; untuk menyetor semua sampah yang kamu bawa sekaligus. Setiap sampah: +Rp500 dan +5 Koin Hijau.</li>
          <li>Bedanya dengan Tempat Sampah Terpilah: di bak, kamu latihan memilah — pilih jenis sampahnya lalu ketuk bak yang benar, hadiahnya +5 Koin Hijau dan +Rp200 per sampah. Di Bank Sampah, kamu tidak perlu memilih bak — semua sampah disetor sekaligus dan langsung jadi uang.</li>
          <li>Kalau tasmu kosong, Bank Sampah tidak bisa menyetor apa pun. Pungut dulu sampah liar di sekitar sekolah.</li>
        </ul>

        <h3 className="aia-section-title">Cerita Bercabang</h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Saat bicara dengan NPC pemberi misi, kamu kadang diminta memilih. Pilihanmu mengubah sikap Pak Plastik —
          ia bisa dibujuk, dilawan, atau dijebak — dan akhir tiap misi (epilog + bonus Koin Hijau) ikut berbeda.
          Pilihan tidak pernah memblokir misi: semua pilihan mengarah ke misi yang sama.
        </p>

        <h3 className="aia-section-title">Koin Hijau &amp; streak</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Koin didapat dari menyelesaikan tahap misi, merawat dunia, memilah sampah liar di Tempat Sampah Terpilah, dan menyetor sampah ke Bank Sampah.</li>
          <li>Main 5 hari berturut-turut: Koin Hijau dari tahap misi jadi 2× lipat.</li>
        </ul>

        <h3 className="aia-section-title">Lapar, Haus &amp; Kantin</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Bar lapar dan haus berkurang setiap tahap selesai dan setiap hari berlalu. Kalau salah satunya habis, kamu jadi lemas dan tidak bisa mulai tahap baru — tapi tidak ada progres yang hilang.</li>
          <li>Bicara dengan Kang Kantin atau Mbak Dewi, lalu ketuk &quot;Buka Kantin&quot; untuk membuka Toko Kantin.</li>
          <li>Di kantin: beli makanan dan minuman pakai uang (Rp). Air keran gratis (+15 haus), bekal dari rumah gratis 1x sehari (+30 lapar).</li>
          <li>Tiap misi yang selesai memberi uang dan Koin Daun (pertama kali: Rp5.000 + 20 Koin Daun).</li>
          <li>Koin Daun ditukar di kantin untuk gear (tumbler, tas kain, lunch box — efeknya permanen), menanam 1 pohon di kebun (100 Koin Daun, rapor hijau +5), dan kostum untuk tokohmu.</li>
        </ul>

        <h3 className="aia-section-title">Eco-Shop &amp; Skor Adiwiyata</h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Di Kebun ada Booth Eco-Shop (di bawah meja Bank Sampah) — dekati, lalu ketuk &quot;Eco-Shop&quot; (atau tekan E di laptop).
          Itemnya dibeli sekali pakai Koin Hijau, efeknya permanen:
        </p>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          {ECO_SHOP.map((item) => (
            <li key={item.id}>
              <strong>{item.nama}</strong> — {item.hargaKoinHijau} Koin Hijau. {item.efek}
            </li>
          ))}
          <li>
            Pin Duta juga memberi diskon 25% di kantin: harga makanan dan minuman dikali 0,75 lalu dibulatkan ke
            bawah ke kelipatan 100 — mis. Nasi Lauk Rp8.000 jadi Rp6.000.
          </li>
        </ul>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Skor Adiwiyata (terlihat di HUD dunia dan Profil) naik dari: menanam pohon +{SKOR_POHON} per pohon, membeli
          Panel Surya +{SKOR_PANEL_SURYA}, dan menyelesaikan satu misi utama pertama kali +
          {SKOR_MISI_PERTAMA}. Ulangan misi tidak menambah skor.
        </p>

        <h3 className="aia-section-title">Hadiah Harian</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Setiap hari kamu bisa klaim 1 hadiah — dari Layar Awal saat masuk game, atau dari Profil.</li>
          <li>Hadiahnya bersiklus 7 hari: Koin Hijau, uang, Koin Daun, makan siang gratis (lapar &amp; haus pulih penuh di Hari 4), sampai hadiah besar di Hari 7.</li>
          <li>Klaim bersifat opsional — boleh dilewati, tidak menghalangi masuk game.</li>
          <li>Terlewat sehari? Siklus mengulang dari Hari 1. Tidak ada yang hilang, hanya mulai lagi dari awal.</li>
        </ul>

        <h3 className="aia-section-title">Keluar dari game</h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Tombol &quot;Keluar&quot; ada di atas layar. Progresmu tersimpan otomatis — lanjutkan lagi kapan saja dari
          Layar Awal.
        </p>

        <h3 className="aia-section-title">Mode satu-ketukan</h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Di Profil: aktifkan mode satu-ketukan bila lebih nyaman main dengan ketukan tombol daripada gestur seret,
          putar, dan tahan.
        </p>

        <div className="aia-actions">
          <button type="button" className="aia-btn aia-btn-primary" style={{ minHeight: 44 }} onClick={tutup}>
            Tutup panduan
          </button>
        </div>
      </section>
    </div>
  )
}
