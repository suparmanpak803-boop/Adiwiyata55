'use client'

// Daftar lencana: yang sudah diperoleh tampil penuh warna,
// yang belum tampil terkunci beserta syaratnya.
// R9: kartu koleksi gaya stiker (grid 2 kolom di HP) + progres besar +
// tombol bagikan per lencana yang sudah diperoleh.
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Bug,
  Droplets,
  Flame,
  GlassWater,
  Lock,
  Recycle,
  Share2,
  Sprout,
  Trees,
  X,
  Zap,
} from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { LENCANA } from '@/lib/apa-itu-adiwiyata/lencana'
import { KartuBagikan } from './kartu-bagikan'
import { klik } from './suara'

const IKON_LENCANA: Record<string, LucideIcon> = {
  'pejuang-tumbler': GlassWater,
  'master-pilah': Recycle,
  'juragan-maggot': Bug,
  'petani-muda': Sprout,
  'penjaga-air': Droplets,
  'pahlawan-energi': Zap,
  'penjaga-biodiversitas': Trees,
  'streak-5-hari': Flame,
}

export function Lencana() {
  const { save } = useCampaign()
  const [bagikanId, setBagikanId] = useState<string | null>(null)
  const diperoleh = LENCANA.filter((l) => save.badges.includes(l.id)).length
  const lencanaBagikan = LENCANA.find((l) => l.id === bagikanId)

  return (
    <div className="aia-stack">
      <p className="aia-muted">
        <strong style={{ fontSize: 17 }}>
          {diperoleh} dari {LENCANA.length} lencana
        </strong>{' '}
        diperoleh. Lencana bab terbuka saat bab selesai; Streak 5 Hari terbuka saat kamu bermain lima hari
        berturut-turut.
      </p>

      <div className="aia-koleksi-grid">
        {LENCANA.map((lencana) => {
          const punya = save.badges.includes(lencana.id)
          const Ikon = IKON_LENCANA[lencana.id] ?? Lock
          return (
            <article
              key={lencana.id}
              className="aia-card aia-stiker aia-koleksi-kartu"
              aria-label={`${lencana.nama}${punya ? ' (diperoleh)' : ' (terkunci)'}`}
            >
              <span
                className="aia-bab-icon"
                aria-hidden="true"
                style={punya ? undefined : { background: 'var(--muted)', color: 'var(--ink-soft)' }}
              >
                {punya ? <Ikon /> : <Lock />}
              </span>
              <strong>{lencana.nama}</strong>
              <p>{lencana.deskripsi}</p>
              {punya ? (
                <>
                  <span className="aia-chip done">Diperoleh</span>
                  <button
                    type="button"
                    className="aia-btn"
                    style={{ minHeight: 44, width: '100%' }}
                    onClick={() => {
                      klik()
                      setBagikanId(lencana.id)
                    }}
                  >
                    <Share2 aria-hidden="true" /> Bagikan
                  </button>
                </>
              ) : (
                <span className="aia-chip">Syarat: {lencana.syarat}</span>
              )}
            </article>
          )
        })}
      </div>

      {lencanaBagikan && (
        <div>
          <div className="aia-actions" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="aia-btn aia-btn-ghost"
              style={{ minHeight: 44 }}
              onClick={() => setBagikanId(null)}
            >
              <X aria-hidden="true" /> Tutup kartu bagikan
            </button>
          </div>
          <KartuBagikan
            nickname={save.nickname}
            coins={save.coins}
            kalimat={`Aku mendapat lencana ${lencanaBagikan.nama} di Adiwiyata 55!`}
          />
        </div>
      )}
    </div>
  )
}
