'use client'

// Layar Awal — tampil setiap kali /game dimuat (setelah gerbang nama).
// Pemain memilih: lanjutkan progres tersimpan, mulai dari awal (dengan
// konfirmasi bila sudah ada progres), atau baca Cara Bermain. Sebelum layar
// ini ada, runner langsung membuka dunia setelah nama terisi, sehingga
// pemain yang kembali tidak pernah ditawari pilihan.

import { useState } from 'react'
import { BookOpen, Play, RotateCcw } from 'lucide-react'
import { CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { hadiahBerikutnya, hariIniLokal } from '@/lib/apa-itu-adiwiyata/content/hadiah-harian'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { hasProgress } from '@/lib/apa-itu-adiwiyata/storage'
import { TUGAS_ORDER } from '@/lib/apa-itu-adiwiyata/types'
import { HadiahHarian } from './hadiah-harian'
import { klik, playPop } from './suara'

export function LayarAwal({
  onLanjutkan,
  onMulaiBaru,
  onBukaPanduan,
}: {
  /** Masuk dunia dengan progres yang ada (atau mulai permainan baru yang masih kosong). */
  onLanjutkan: () => void
  /** Hapus progres tersimpan (START_NEW) lalu masuk dunia dari nol. */
  onMulaiBaru: () => void
  /** Buka panduan Cara Bermain. */
  onBukaPanduan: () => void
}) {
  const { save, dispatch } = useCampaign()
  const [tanyaBaru, setTanyaBaru] = useState(false)
  // Hadiah Harian di Layar Awal: tampil bila belum diklaim hari ini, di
  // bawah tombol Lanjutkan/Mulai. Klaim bersifat opsional — tombol "Lewati"
  // selalu ada, dan kartu tetap menampilkan hasil bila baru saja diklaim
  // (supaya pesan "Kamu mendapat ..." tidak hilang sebelum pemain masuk).
  const [tampilkanHadiah, setTampilkanHadiah] = useState(true)
  const [klaimSelesai, setKlaimSelesai] = useState(false)
  const { bisaKlaim } = hadiahBerikutnya(save.hadiahTerakhir ?? null, save.hadiahSiklus ?? 1, hariIniLokal())
  const progres = hasProgress(save)
  const misiUtama = CHAPTER_ORDER.filter((id) => save.chapters[id].done).length
  const misiKader = TUGAS_ORDER.filter((id) => save.tugas[id].done).length
  // Pemilih karakter hanya untuk permainan baru: pemain lama (ada progres
  // atau jenis kelamin sudah tersimpan) langsung ke tombol Lanjutkan/Mulai.
  // Tombol Mulai terkunci sampai karakter dipilih.
  const tampilPemilih = !progres
  const perluPilihKarakter = !progres && save.jenisKelamin === null
  const PILIHAN_KARAKTER = [
    {
      id: 'siswa' as const,
      nama: 'Siswa',
      deskripsi: 'Seragam putih, dasi abu-abu, celana panjang abu-abu.',
    },
    {
      id: 'siswi' as const,
      nama: 'Siswi',
      deskripsi: 'Seragam putih, dasi abu-abu, rok abu-abu.',
    },
  ]

  return (
    <section className="aia-card aia-layar-awal" aria-labelledby="aia-awal-title">
      <img
        src="/images/game/misi/gerbang.jpg"
        alt="Gambar sampul game: tas, tumbler, dan kotak bekal"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          objectFit: 'cover',
          borderRadius: 12,
          display: 'block',
          marginBottom: 12,
        }}
      />
      <span className="aia-kicker">Kampanye · Adiwiyata 55</span>
      <h2 id="aia-awal-title" className="aia-section-title">
        Apa itu Adiwiyata?
      </h2>
      <p className="aia-muted">
        Kamu siswa baru yang ditugaskan menjadikan sekolahmu Adiwiyata. Jelajahi sekolah, temui warga sekolah,
        dan selesaikan 6 misi bersama Magi si larva maggot. Tidak ada yang benar-benar sampah.
      </p>
      {progres && (
        <p className="aia-muted" role="status">
          Progresmu: Misi utama {misiUtama}/6 selesai · Misi Tambahan {misiKader}/8 selesai · {save.coins} Koin Hijau
        </p>
      )}
      {tampilPemilih && (
        <div style={{ marginTop: 4 }}>
          <p className="aia-label" id="aia-pilih-karakter-label" style={{ marginBottom: 8 }}>
            Pilih karaktermu
          </p>
          <div
            role="group"
            aria-labelledby="aia-pilih-karakter-label"
            style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}
          >
            {PILIHAN_KARAKTER.map((pilihan) => {
              const dipilih = save.jenisKelamin === pilihan.id
              return (
                <button
                  key={pilihan.id}
                  type="button"
                  className="aia-btn"
                  aria-pressed={dipilih}
                  style={{
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    minHeight: 44,
                    textAlign: 'left',
                    borderWidth: 2,
                    borderColor: dipilih ? '#2e7d32' : undefined,
                    background: dipilih ? 'rgba(46,125,50,0.08)' : undefined,
                  }}
                  onClick={() => {
                    klik()
                    dispatch({ type: 'PILIH_KARAKTER', jenisKelamin: pilihan.id })
                  }}
                >
                  <strong>
                    {pilihan.nama}
                    {dipilih && <span className="aia-chip done"> Dipilih</span>}
                  </strong>
                  <span className="aia-muted" style={{ fontWeight: 400 }}>
                    {pilihan.deskripsi}
                  </span>
                </button>
              )
            })}
          </div>
          {perluPilihKarakter && (
            <p className="aia-muted" role="status" style={{ marginTop: 8 }}>
              Pilih karakter dulu untuk mulai.
            </p>
          )}
        </div>
      )}
      <div className="aia-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {progres ? (
          <button
            type="button"
            className="aia-btn aia-btn-primary aia-btn-block"
            style={{ minHeight: 48 }}
            onClick={() => {
              playPop()
              onLanjutkan()
            }}
          >
            <Play aria-hidden="true" /> Lanjutkan
          </button>
        ) : (
          <button
            type="button"
            className="aia-btn aia-btn-primary aia-btn-block"
            style={{ minHeight: 48 }}
            disabled={perluPilihKarakter}
            onClick={() => {
              playPop()
              onLanjutkan()
            }}
          >
            <Play aria-hidden="true" /> Mulai
          </button>
        )}
        {progres && (
          <button
            type="button"
            className="aia-btn aia-btn-ghost aia-btn-block"
            style={{ minHeight: 44 }}
            onClick={() => {
              klik()
              setTanyaBaru(true)
            }}
          >
            <RotateCcw aria-hidden="true" /> Mulai dari Awal
          </button>
        )}
        <button
          type="button"
          className="aia-btn aia-btn-ghost aia-btn-block"
          style={{ minHeight: 44 }}
          onClick={() => {
            klik()
            onBukaPanduan()
          }}
        >
          <BookOpen aria-hidden="true" /> Cara Bermain
        </button>
      </div>

      {tampilkanHadiah && (bisaKlaim || klaimSelesai) && (
        <div style={{ marginTop: 12 }}>
          <HadiahHarian onLewati={() => setTampilkanHadiah(false)} onKlaim={() => setKlaimSelesai(true)} />
        </div>
      )}

      {tanyaBaru && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mulai dari awal"
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
          <section className="aia-card" style={{ width: '100%', maxWidth: 420 }}>
            <h3 className="aia-section-title" style={{ marginTop: 0 }}>
              Mulai dari awal?
            </h3>
            <p className="aia-muted">Mulai dari awal akan menghapus progresmu yang tersimpan. Yakin?</p>
            <div className="aia-actions">
              <button
                type="button"
                className="aia-btn aia-btn-danger"
                style={{ minHeight: 44 }}
                onClick={() => {
                  playPop()
                  setTanyaBaru(false)
                  onMulaiBaru()
                }}
              >
                Ya, mulai baru
              </button>
              <button
                type="button"
                className="aia-btn aia-btn-ghost"
                style={{ minHeight: 44 }}
                onClick={() => {
                  klik()
                  setTanyaBaru(false)
                }}
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
