'use client'

// Layar tamat kampanye "Apa itu Adiwiyata".
// Saat pertama tampil, bila completedAt masih kosong, dispatch FINISH_CAMPAIGN
// tepat satu kali (dijaga ref) dan mainkan fanfare sertifikat satu kali.
// Menampilkan sertifikat "Sekolah Adiwiyata Mandiri" + kartu bagikan.
// Tidak memanggil onFinished di sini (itu urusan runner).

import { useEffect, useRef } from 'react'
import { Award, Check, PartyPopper, Trophy } from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { LENCANA } from '@/lib/apa-itu-adiwiyata/lencana'
import { KartuBagikan } from './kartu-bagikan'
import { sertifikat } from './suara'

export function Tamat({ onExit }: { onExit: () => void }) {
  const { save, dispatch } = useCampaign()
  const sudahRef = useRef(false)

  useEffect(() => {
    if (sudahRef.current) return
    sudahRef.current = true
    if (!save.completedAt) dispatch({ type: 'FINISH_CAMPAIGN' })
    sertifikat()
  }, [save.completedAt, dispatch])

  const tanggal = (save.completedAt ? new Date(save.completedAt) : new Date()).toLocaleDateString(
    'id-ID',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )
  const nama = save.nickname.trim() || 'Pahlawan Adiwiyata'

  return (
    <div className="aia-stack">
      <div className="aia-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
        <PartyPopper aria-hidden="true" size={40} color="#c98a2e" style={{ margin: '0 auto 8px' }} />
        <span className="aia-kicker" style={{ textAlign: 'center' }}>
          Kampanye selesai
        </span>
        <h2 className="aia-section-title" style={{ fontSize: 24, marginTop: 4 }}>
          Sekolah Adiwiyata Mandiri!
        </h2>
        <p className="aia-muted" style={{ margin: '8px auto 0', maxWidth: 420 }}>
          Dulu kamu ditertawakan karena peduli, lalu memilih diam. Enam bab kemudian, kamu bicara di depan
          semua orang, dan botol Pak Plastik akhirnya masuk bak yang benar. Sekolah ini jadi rumah karena
          kamu ikut merawatnya.
        </p>
      </div>

      <section className="aia-card" aria-label="Sertifikat Sekolah Adiwiyata Mandiri">
        <div
          style={{
            border: '3px double #236b4d',
            borderRadius: 12,
            padding: 20,
            textAlign: 'center',
          }}
        >
          <Award aria-hidden="true" size={36} style={{ margin: '0 auto 4px', color: 'var(--green)' }} />
          <span className="aia-kicker" style={{ textAlign: 'center' }}>
            Sertifikat
          </span>
          <h3 style={{ margin: '4px 0', fontSize: 20, lineHeight: 1.3 }}>
            Sekolah Adiwiyata Mandiri
          </h3>
          <p className="aia-muted" style={{ margin: '8px 0 0' }}>
            Diberikan kepada
          </p>
          <p style={{ margin: '4px 0', fontSize: 18, fontWeight: 800 }}>{nama}</p>
          <p className="aia-muted" style={{ margin: '4px 0 0' }}>
            SMAN 55 Jakarta · {tanggal}
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 14 }}>
            Total Koin Hijau: <strong>{save.coins}</strong> · Lencana: <strong>{save.badges.length}/{LENCANA.length}</strong>
          </p>
          <p className="aia-muted" style={{ margin: '8px 0 0' }}>
            <Trophy aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Tidak ada yang benar-benar
            sampah, dan lingkungan adalah budaya bersama.
          </p>
        </div>
      </section>

      <KartuBagikan
        nickname={nama}
        coins={save.coins}
        kalimat="Aku menjadikan sekolahku Adiwiyata Mandiri!"
      />

      <div className="aia-actions">
        <button type="button" className="aia-btn aia-btn-primary aia-btn-block" onClick={onExit}>
          <Check aria-hidden="true" /> Kembali ke Menu
        </button>
      </div>
    </div>
  )
}
