'use client'

// Gerbang nama: pemain baru mengisi nama panggilan sekali sebelum masuk
// dunia. Setelah nama tersimpan, runner langsung menampilkan dunia.

import { useState } from 'react'
import { Play } from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { playPop } from './suara'

export function GerbangNama() {
  const { dispatch } = useCampaign()
  const [nickname, setNickname] = useState('')

  const mulai = () => {
    const nama = nickname.trim()
    if (!nama) return
    playPop()
    dispatch({ type: 'SET_NICKNAME', nickname: nama })
  }

  return (
    <section className="aia-card" aria-labelledby="aia-nama-title">
      <span className="aia-kicker">Kampanye · Adiwiyata 55</span>
      <h2 id="aia-nama-title" className="aia-section-title">
        Apa itu Adiwiyata?
      </h2>
      <p className="aia-muted">
        Kamu siswa baru yang ditugaskan menjadikan sekolahmu Adiwiyata. Jelajahi sekolah, temui warga sekolah,
        dan selesaikan 6 misi bersama Magi si larva maggot. Tidak ada yang benar-benar sampah.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          mulai()
        }}
      >
        <label className="aia-label" htmlFor="aia-nickname">
          Nama panggilanmu
        </label>
        <input
          id="aia-nickname"
          className="aia-input"
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Contoh: Dimas"
          maxLength={20}
          autoComplete="nickname"
        />
        <div className="aia-actions">
          <button type="submit" className="aia-btn aia-btn-primary aia-btn-block" disabled={!nickname.trim()}>
            <Play aria-hidden="true" /> Mulai Petualangan
          </button>
        </div>
      </form>
    </section>
  )
}
