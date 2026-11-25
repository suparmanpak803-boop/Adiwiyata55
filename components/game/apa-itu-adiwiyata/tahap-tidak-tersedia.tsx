'use client'

// Jalan keluar untuk tahap yang datanya tidak ditemukan (K-4): sebelumnya
// mini-game hanya merender "Tahap ini belum tersedia." tanpa memanggil
// onStageComplete, sehingga pemain terjebak di tahap itu selamanya.
// Komponen ini menampilkan penjelasan + tombol "Lewati tahap ini" yang
// memanggil onLewati (pemanggil mengoper onStageComplete(0) atau wrapper
// selesai(0) miliknya) — tahap dilewati dengan skor 0, tanpa hukuman
// (tidak ada progres/koin yang hilang) dan pemain bisa lanjut.
// Klik ganda dijaga ref + state disabled supaya onStageComplete tidak
// terpanggil dua kali.

import { useRef, useState } from 'react'

export function TahapTidakTersedia({ onLewati, pesan }: { onLewati: () => void; pesan?: string }) {
  const sudahRef = useRef(false)
  const [sudah, setSudah] = useState(false)
  const lewati = () => {
    if (sudahRef.current) return
    sudahRef.current = true
    setSudah(true)
    onLewati()
  }
  return (
    <div className="aia-card" role="alert">
      <p className="aia-muted">{pesan ?? 'Tahap ini belum tersedia.'}</p>
      <p className="aia-muted">
        Datanya tidak ditemukan, jadi tahap ini bisa dilewati tanpa skor. Progresmu tetap aman.
      </p>
      <div className="aia-actions">
        <button type="button" className="aia-btn aia-btn-primary" style={{ minHeight: 44 }} onClick={lewati} disabled={sudah}>
          Lewati tahap ini
        </button>
      </div>
    </div>
  )
}
