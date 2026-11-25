'use client'

// Leaderboard kampanye — TANPA data dummy.
// Yang tampil hanya skor pemain sendiri (nama panggilan + Koin Hijau dari
// simpanan lokal). Skor teman-teman belum bisa tampil karena game belum
// mengirim skor ke server; peringkat bersama menyusul bila sudah terhubung.
import { Eye, EyeOff, Trophy } from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'

export function Leaderboard() {
  const { save, dispatch } = useCampaign()
  // Pilihan sembunyikan nama tersimpan di save kampanye (localStorage).
  const sembunyikanNama = save.hideName
  const namaSaya = save.nickname.trim() || 'Kamu'

  return (
    <div className="aia-stack">
      <h3 className="aia-section-title">Peringkat individu</h3>
      <p className="aia-muted">
        Peringkat ini hanya menampilkan skormu sendiri. Skor teman-teman belum bisa tampil karena game
        belum mengirim skor ke server.
      </p>
      <button
        type="button"
        className="aia-btn aia-btn-ghost"
        aria-pressed={sembunyikanNama}
        onClick={() => dispatch({ type: 'SET_HIDE_NAME', hideName: !save.hideName })}
      >
        {sembunyikanNama ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        {sembunyikanNama ? 'Tampilkan namaku' : 'Sembunyikan namaku'}
      </button>
      <div className="aia-stack">
        <article className="aia-card" style={{ borderColor: 'var(--green)', borderWidth: 2 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="aia-bab-icon" aria-hidden="true">
              <Trophy />
            </span>
            <div className="aia-bab-body">
              <strong>
                1. {sembunyikanNama ? 'Anonim' : namaSaya} (kamu)
              </strong>
              <p>{save.coins} Koin Hijau</p>
            </div>
          </div>
        </article>
      </div>
      <p className="aia-muted">
        Mainkan misi untuk mengumpulkan Koin Hijau. Peringkat bersama (antarteman dan antarkelas) akan
        tampil setelah skor terhubung ke server.
      </p>
    </div>
  )
}
