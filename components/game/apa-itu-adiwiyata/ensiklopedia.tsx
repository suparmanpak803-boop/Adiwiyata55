'use client'

// Ensiklopedia Adiwiyata: kartu info yang terbuka setelah topiknya dimainkan.
// Kartu terkunci menampilkan gembok dan bab yang membukanya.
import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { CHAPTERS } from '@/lib/apa-itu-adiwiyata/chapters'
import { KARTU_ENSIKLOPEDIA } from '@/lib/apa-itu-adiwiyata/content/ensiklopedia'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { klik, pindah } from './suara'

export function Ensiklopedia() {
  const { save } = useCampaign()
  const [terbukaId, setTerbukaId] = useState<string | null>(null)
  const [dalamId, setDalamId] = useState<string | null>(null)

  const jumlahTerbuka = KARTU_ENSIKLOPEDIA.filter((k) => save.unlockedCards.includes(k.id)).length

  return (
    <div className="aia-stack">
      <p className="aia-muted">
        {jumlahTerbuka} dari {KARTU_ENSIKLOPEDIA.length} kartu terbuka. Mainkan bab terkait untuk membuka
        kartu baru.
      </p>

      {KARTU_ENSIKLOPEDIA.map((kartu) => {
        const terbuka = save.unlockedCards.includes(kartu.id)
        const sedangDibuka = terbukaId === kartu.id
        const isiPanjang = dalamId === kartu.id
        if (!terbuka) {
          return (
            <article key={kartu.id} className="aia-card" aria-label={`${kartu.judul} (terkunci)`}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span className="aia-bab-icon" aria-hidden="true">
                  <Lock />
                </span>
                <div className="aia-bab-body">
                  <strong>{kartu.judul}</strong>
                  <p>Mainkan misi {CHAPTERS[kartu.babTerkait].judul} untuk membuka kartu ini.</p>
                  <span className="aia-chip">Terkunci</span>
                </div>
              </div>
            </article>
          )
        }
        return (
          <article key={kartu.id} className="aia-card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span className="aia-bab-icon" aria-hidden="true">
                <BookOpen />
              </span>
              <div className="aia-bab-body">
                <strong>{kartu.judul}</strong>
                <p>{kartu.ringkasan}</p>
                {sedangDibuka && <p style={{ color: 'var(--foreground)' }}>{kartu.isi}</p>}
                <div className="aia-actions" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="aia-btn aia-btn-ghost"
                    aria-expanded={sedangDibuka}
                    onClick={() => {
                      klik()
                      setTerbukaId(sedangDibuka ? null : kartu.id)
                      if (sedangDibuka) setDalamId(null)
                    }}
                  >
                    {sedangDibuka ? 'Tutup' : 'Baca kartu'}
                    {sedangDibuka ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                  </button>
                  {sedangDibuka && (
                    <button
                      type="button"
                      className="aia-btn"
                      aria-expanded={isiPanjang}
                      onClick={() => {
                        pindah()
                        setDalamId(isiPanjang ? null : kartu.id)
                      }}
                    >
                      {isiPanjang ? 'Sembunyikan detail' : 'Pelajari lebih dalam'}
                    </button>
                  )}
                </div>
                {sedangDibuka && isiPanjang && (
                  <p className="aia-muted" style={{ marginTop: 8 }}>
                    Ingat intinya: {kartu.ringkasan} Kalau mau tahu lebih banyak, tanyakan ke tim
                    Adiwiyata di sekolahmu atau cari di perpustakaan sekolah.
                  </p>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
