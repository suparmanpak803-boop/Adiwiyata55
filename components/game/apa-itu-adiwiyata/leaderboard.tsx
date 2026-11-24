'use client'

// Leaderboard kampanye (DATA DUMMY, mudah diganti API).
// Antarkelas: skor kelas = total poin dibagi jumlah siswa.
// Individu: nama panggilan, top 10 + posisi pemain sendiri.
import { useMemo, useState } from 'react'
import { Eye, EyeOff, Medal, Trophy } from 'lucide-react'
import { KELAS_DUMMY, PEMAIN_DUMMY } from '@/lib/apa-itu-adiwiyata/content/leaderboard-dummy'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { pindah } from './suara'

type Tab = 'mingguan' | 'bulanan'

export function Leaderboard() {
  const { save, dispatch } = useCampaign()
  const [tab, setTab] = useState<Tab>('mingguan')
  // Pilihan sembunyikan nama tersimpan di save kampanye (localStorage).
  const sembunyikanNama = save.hideName

  const kelasUrut = useMemo(() => {
    const poin = (k: (typeof KELAS_DUMMY)[number]) =>
      tab === 'mingguan' ? k.poinMingguan : k.poinBulanan
    return [...KELAS_DUMMY]
      .map((k) => ({ ...k, rata: poin(k) / k.jumlahSiswa, total: poin(k) }))
      .sort((a, b) => b.rata - a.rata)
  }, [tab])

  // Kelas Paling Berkembang: rata-rata mingguan per siswa tertinggi.
  const kelasBerkembang = useMemo(() => {
    let terbaik = KELAS_DUMMY[0]
    for (const k of KELAS_DUMMY) {
      if (k.poinMingguan / k.jumlahSiswa > terbaik.poinMingguan / terbaik.jumlahSiswa) terbaik = k
    }
    return terbaik.id
  }, [])

  const namaSaya = save.nickname.trim() || 'Kamu'
  const individu = useMemo(() => {
    const semua = [
      ...PEMAIN_DUMMY.map((p) => ({ nama: p.nama, kelas: p.kelas, poin: p.poin, saya: false })),
      { nama: namaSaya, kelas: '-', poin: save.coins, saya: true },
    ].sort((a, b) => b.poin - a.poin)
    return semua
  }, [namaSaya, save.coins])

  const posisiSaya = individu.findIndex((p) => p.saya) + 1
  const sepuluhBesar = individu.slice(0, 10)
  const sayaDiLuarSepuluh = posisiSaya > 10
  const barisSaya = individu[posisiSaya - 1]

  return (
    <div className="aia-stack">
      <div className="aia-actions" role="tablist" aria-label="Periode peringkat">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'mingguan'}
          className={`aia-btn${tab === 'mingguan' ? ' aia-btn-primary' : ''}`}
          onClick={() => {
            pindah()
            setTab('mingguan')
          }}
        >
          Mingguan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'bulanan'}
          className={`aia-btn${tab === 'bulanan' ? ' aia-btn-primary' : ''}`}
          onClick={() => {
            pindah()
            setTab('bulanan')
          }}
        >
          Bulanan
        </button>
      </div>

      <h3 className="aia-section-title">Peringkat antarkelas</h3>
      <p className="aia-muted">Skor kelas = total poin dibagi jumlah siswa, supaya kelas kecil tidak dirugikan.</p>
      <div className="aia-stack">
        {kelasUrut.map((kelas, i) => (
          <article key={kelas.id} className="aia-card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="aia-bab-icon" aria-hidden="true">
                {i === 0 ? <Trophy /> : <Medal />}
              </span>
              <div className="aia-bab-body">
                <strong>
                  {i + 1}. Kelas {kelas.nama}
                </strong>
                <p>
                  {kelas.rata.toFixed(1)} poin per siswa ({kelas.total} poin, {kelas.jumlahSiswa} siswa)
                </p>
                {kelas.id === kelasBerkembang && (
                  <span className="aia-chip done">Kelas Paling Berkembang</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <h3 className="aia-section-title">Peringkat individu</h3>
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
        {sepuluhBesar.map((pemain, i) => (
          <article
            key={`${pemain.nama}-${i}`}
            className="aia-card"
            style={pemain.saya ? { borderColor: 'var(--green)', borderWidth: 2 } : undefined}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="aia-bab-icon" aria-hidden="true">
                {i === 0 ? <Trophy /> : <Medal />}
              </span>
              <div className="aia-bab-body">
                <strong>
                  {i + 1}. {pemain.saya && sembunyikanNama ? 'Anonim' : pemain.nama}
                  {pemain.saya ? ' (kamu)' : ''}
                </strong>
                <p>
                  {pemain.kelas === '-' ? 'Kelas belum dipilih' : `Kelas ${pemain.kelas}`} · {pemain.poin}{' '}
                  Koin Hijau
                </p>
              </div>
            </div>
          </article>
        ))}
        {sayaDiLuarSepuluh && barisSaya && (
          <article className="aia-card" style={{ borderColor: 'var(--green)', borderWidth: 2 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="aia-bab-icon" aria-hidden="true">
                <Medal />
              </span>
              <div className="aia-bab-body">
                <strong>
                  {posisiSaya}. {sembunyikanNama ? 'Anonim' : barisSaya.nama} (kamu)
                </strong>
                <p>
                  {barisSaya.poin} Koin Hijau · Mainkan bab lagi untuk naik peringkat.
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
      <p className="aia-muted">Data peringkat ini masih contoh dan akan diganti data asli bila sudah ada.</p>
    </div>
  )
}
