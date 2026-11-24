'use client'

// Panduan "Cara Bermain" — kartu overlay yang bisa ditutup dan di-scroll.
// Dibuka dari Layar Awal, tombol "?" di HUD dunia/layar misi, dan Profil.
// Isi diambil dari isi game yang sebenarnya (mekanik dari INTERAKSI_MISI,
// dunia hidup, cerita bercabang, streak) — tidak ada fitur yang dikarang.

import { X } from 'lucide-react'
import { klik } from './suara'

const CARA_MISI: { judul: string; cara: string }[] = [
  { judul: 'Budaya Lingkungan', cara: 'Tangkap barang guna ulang yang jatuh, lalu lempar ke tas.' },
  { judul: 'Pilah', cara: 'Sortir cepat di ban berjalan, lalu lempar sampah ke 4 tong.' },
  { judul: 'Maggot', cara: 'Tangkap pakan yang aman, geser tuas kotak, tahan saringan saat panen.' },
  { judul: 'Olah Organik', cara: 'Susun lapisan kompos, siram tanaman mengikuti irama, ketuk sayur yang matang.' },
  { judul: 'Air & Energi Lestari', cara: 'Putar bor biopori, sambung pipa air hujan, cari perangkat boros.' },
  { judul: 'Hijau dan Biodiversitas', cara: 'Kuis kilat: jawab sebelum waktu habis.' },
  { judul: 'Bank Sampah dan Daur Ulang', cara: 'Sortir cepat, ketuk sel tabel timbangan, hitung kilat.' },
  { judul: 'Lingkungan Sehat', cara: 'Cari perbedaan di toilet, drainase, dan taman, lalu ketuk tindakan yang benar.' },
  { judul: 'Edu-Lingkungan', cara: 'Kartu memori: pasangkan soal dengan jawaban.' },
  { judul: 'Inovasi Hijau', cara: 'Puzzle geser 3×3: susun potongan poster.' },
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
        zIndex: 50,
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
          sampah.
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
            <li><kbd>E</kbd> / <kbd>Enter</kbd> — bicara dengan NPC</li>
            <li><kbd>Spasi</kbd> — lanjut dialog</li>
            <li><kbd>Esc</kbd> — tutup dialog</li>
            <li>Klik mouse — jalan ke titik yang diklik</li>
            <li><kbd>P</kbd> — jeda</li>
            <li><kbd>M</kbd> — bisu</li>
          </ul>
        </section>

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

        <h3 className="aia-section-title">Dunia Hidup</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Kebun (kangkung, cabai, bayam) tumbuh dari hari ke hari. Tanaman yang tidak disiram 2 hari jadi layu — siram lagi supaya segar.</li>
          <li>Maggot di kotak Pos Maggot makin lapar setiap hari — ketuk kotaknya untuk memberi makan. Maggot dewasa bisa dipanen jadi kasgot (pupuk).</li>
          <li>Sampah liar menumpuk dari hari ke hari — ketuk atau dekati untuk membersihkannya, +5 Koin Hijau.</li>
          <li>Tiap pagi ada Laporan Pagi tentang apa yang berubah sejak kunjungan terakhir.</li>
          <li>Merawat hanya bisa dari dekat — dekati dulu petak, kotak, atau sampahnya.</li>
        </ul>

        <h3 className="aia-section-title">Cerita Bercabang</h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Saat bicara dengan NPC pemberi misi, kamu kadang diminta memilih. Pilihanmu mengubah sikap Pak Plastik —
          ia bisa dibujuk, dilawan, atau dijebak — dan akhir tiap misi (epilog + bonus Koin Hijau) ikut berbeda.
          Pilihan tidak pernah memblokir misi: semua pilihan mengarah ke misi yang sama.
        </p>

        <h3 className="aia-section-title">Koin Hijau &amp; streak</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>Koin didapat dari menyelesaikan tahap misi dan merawat dunia.</li>
          <li>Main 5 hari berturut-turut: Koin Hijau dari tahap misi jadi 2× lipat.</li>
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
