'use client'

// Daftar lencana: yang sudah diperoleh tampil penuh warna,
// yang belum tampil terkunci beserta syaratnya.
import type { LucideIcon } from 'lucide-react'
import {
  Bug,
  Droplets,
  Flame,
  GlassWater,
  Lock,
  Recycle,
  Sprout,
  Trees,
  Zap,
} from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { LENCANA } from '@/lib/apa-itu-adiwiyata/lencana'

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
  const diperoleh = LENCANA.filter((l) => save.badges.includes(l.id)).length

  return (
    <div className="aia-stack">
      <p className="aia-muted">
        {diperoleh} dari {LENCANA.length} lencana diperoleh. Lencana bab terbuka saat bab selesai;
        Streak 5 Hari terbuka saat kamu bermain lima hari berturut-turut.
      </p>

      {LENCANA.map((lencana) => {
        const punya = save.badges.includes(lencana.id)
        const Ikon = IKON_LENCANA[lencana.id] ?? Lock
        return (
          <article key={lencana.id} className="aia-card" aria-label={`${lencana.nama}${punya ? ' (diperoleh)' : ' (terkunci)'}`}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span
                className="aia-bab-icon"
                aria-hidden="true"
                style={punya ? undefined : { background: 'var(--muted)', color: 'var(--ink-soft)' }}
              >
                {punya ? <Ikon /> : <Lock />}
              </span>
              <div className="aia-bab-body">
                <strong>{lencana.nama}</strong>
                <p>{lencana.deskripsi}</p>
                {punya ? (
                  <span className="aia-chip done">Diperoleh</span>
                ) : (
                  <span className="aia-chip">Syarat: {lencana.syarat}</span>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
