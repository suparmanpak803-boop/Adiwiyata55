'use client'

// Layar Awal — tampil setiap kali /game dimuat (setelah gerbang nama).
// Pemain memilih: lanjutkan progres tersimpan, mulai dari awal (dengan
// konfirmasi bila sudah ada progres), atau baca Cara Bermain. Sebelum layar
// ini ada, runner langsung membuka dunia setelah nama terisi, sehingga
// pemain yang kembali tidak pernah ditawari pilihan.

import { useState } from 'react'
import { BookOpen, Play, RotateCcw } from 'lucide-react'
import { CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { hasProgress } from '@/lib/apa-itu-adiwiyata/storage'
import { TUGAS_ORDER } from '@/lib/apa-itu-adiwiyata/types'
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
  const { save } = useCampaign()
  const [tanyaBaru, setTanyaBaru] = useState(false)
  const progres = hasProgress(save)
  const misiUtama = CHAPTER_ORDER.filter((id) => save.chapters[id].done).length
  const misiKader = TUGAS_ORDER.filter((id) => save.tugas[id].done).length

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
