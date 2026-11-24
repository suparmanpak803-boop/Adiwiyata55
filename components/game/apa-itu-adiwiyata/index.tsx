'use client'

// Runner kampanye "Apa itu Adiwiyata" — dunia + misi.
// Tidak ada lagi menu "Pilih Bab": permainan dimulai dan berlanjut di dunia
// (Jelajah); misi diberikan NPC dan dikerjakan dengan menjelajah sekolah.
// Tab: Jelajah (dunia), Misi, Ensiklopedia, Peringkat, Profil.
// Musik latar: dunia dan layar sistem memakai mode 'menu', bab memakai
// musik babnya, tamat memakai 'tamat'.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { CampaignProvider, useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { CHAPTERS, CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { freshDunia, majukanDunia, type PeristiwaDunia } from '@/lib/apa-itu-adiwiyata/dunia-hidup'
import { TUGAS } from '@/lib/apa-itu-adiwiyata/tugas'
import type { ChapterId, TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { GerbangNama } from './gerbang-nama'
import { LaporanPagi } from './laporan-pagi'
import { Misi } from './misi'
import { Jelajah } from './jelajah'
import { BottomNav, type AiaTab } from './bottom-nav'
import { MisiShell } from './misi-shell'
import { Tamat } from './tamat'
import { Ensiklopedia } from './ensiklopedia'
import { Leaderboard } from './leaderboard'
import { Profil } from './profil'
import { klik, startMusic, stopMusic, type MusicMode } from './suara'
import './apa-itu-adiwiyata.css'

const MODE_BAB: MusicMode[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'bab6']

type Screen = 'peta' | 'misi' | 'ensiklopedia' | 'peringkat' | 'profil' | 'bab' | 'tugas' | 'tamat'

export function ApaItuAdiwiyata() {
  return (
    <CampaignProvider>
      <Shell />
    </CampaignProvider>
  )
}

function Shell() {
  const { save, dispatch, hydrated } = useCampaign()
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('peta')
  const [activeChapter, setActiveChapter] = useState<ChapterId>('gerbang')
  const [activeTugas, setActiveTugas] = useState<TugasKaderId>('bank-sampah')
  const [pesanMisi, setPesanMisi] = useState<string | null>(null)
  const [laporan, setLaporan] = useState<PeristiwaDunia[] | null>(null)
  const [tanyaKeluar, setTanyaKeluar] = useState(false)
  const laporanRef = useRef(false)

  // Laporan Pagi: majukan Dunia Hidup sekali per sesi, di runner (bukan di
  // Jelajah) — Shell adalah pemilik `hydrated` dan satu-satunya tempat yang
  // jalan apa pun tab awalnya, jadi peristiwa hari baru tidak terlewat bila
  // pemain mendarat di tab lain dulu. Reducer tidak mengembalikan peristiwa,
  // jadi majukanDunia() dipanggil langsung dari save.dunia sebelum dispatch
  // dengan argumen yang sama (murni, hasilnya identik).
  useEffect(() => {
    if (!hydrated || laporanRef.current) return
    laporanRef.current = true
    const sekarang = Date.now()
    const adaMisiBelumSelesai = CHAPTER_ORDER.some((id) => !save.chapters[id].done)
    const dunia = save.dunia ?? freshDunia(sekarang)
    const { peristiwa } = majukanDunia(dunia, sekarang, adaMisiBelumSelesai)
    dispatch({ type: 'MAJUKAN_DUNIA', sekarang, adaMisiBelumSelesai })
    if (peristiwa.length > 0) setLaporan(peristiwa)
    // Sengaja hanya bergantung pada `hydrated`: sekali per sesi, memakai
    // save yang baru dimuat saat hidrasi selesai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (screen === 'bab') {
      startMusic(MODE_BAB[CHAPTER_ORDER.indexOf(activeChapter)])
      return
    }
    if (screen === 'tamat') {
      startMusic('tamat')
      return
    }
    startMusic('menu')
  }, [screen, activeChapter, hydrated])

  useEffect(() => stopMusic, [])

  const gantiTab = (tab: AiaTab) => {
    setPesanMisi(null)
    setScreen(tab)
  }

  const mainBab = (chapterId: ChapterId) => {
    setActiveChapter(chapterId)
    setPesanMisi(null)
    setScreen('bab')
  }

  const mainTugas = (tugasId: TugasKaderId) => {
    setActiveTugas(tugasId)
    setPesanMisi(null)
    setScreen('tugas')
  }

  // Keluar dari bab: kembali ke dunia, kecuali tamat (ke layar tamat).
  // onChapterComplete hanya dipanggil saat bab selesai. `save` di closure
  // ini masih keadaan sebelum penyelesaian, jadi "baru selesai" artinya
  // save lama belum menandai bab ini selesai.
  const keluarBab = (tamat: boolean, baruSelesai: boolean) => {
    if (tamat) {
      setScreen('tamat')
      return
    }
    if (baruSelesai) {
      const berikut = CHAPTER_ORDER[CHAPTER_ORDER.indexOf(activeChapter) + 1] ?? null
      setPesanMisi(
        berikut
          ? `Misi selesai: ${CHAPTERS[activeChapter].judul}! Misi berikutnya: ${CHAPTERS[berikut].judul}.`
          : `Misi selesai: ${CHAPTERS[activeChapter].judul}! Semua misi selesai — kamu Pahlawan Adiwiyata!`,
      )
    }
    setScreen('peta')
  }

  // Keluar dari Misi Kader: kembali ke dunia; kabar bila baru selesai.
  const keluarTugas = (baruSelesai: boolean) => {
    if (baruSelesai) {
      setPesanMisi(`Misi Kader selesai: ${TUGAS[activeTugas].judul}!`)
    }
    setScreen('peta')
  }

  if (!hydrated) {
    return (
      <section className="aia-card" aria-label="Memuat kampanye">
        <p className="aia-muted">Memuat progres kampanyemu...</p>
      </section>
    )
  }

  if (!save.nickname) {
    return <GerbangNama />
  }

  return (
    <div className="aia-shell">
      {/* Bar atas: tombol Keluar selalu terlihat di semua layar (dunia, misi,
          tab sistem) — di atas HUD dunia dan tombol bisu, jadi tidak bentrok.
          Keluar kembali ke portal (`/`), tempat game ini dibuka. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button
          type="button"
          className="aia-btn aia-btn-ghost"
          style={{ minHeight: 44 }}
          onClick={() => {
            klik()
            setTanyaKeluar(true)
          }}
          aria-label="Keluar dari game"
        >
          <LogOut aria-hidden="true" /> Keluar
        </button>
      </div>
      {tanyaKeluar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keluar dari game"
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
              Keluar dari game?
            </h3>
            <p className="aia-muted">Progresmu tersimpan otomatis.</p>
            <div className="aia-actions">
              <button
                type="button"
                className="aia-btn aia-btn-primary"
                style={{ minHeight: 44 }}
                onClick={() => router.push('/')}
              >
                Keluar
              </button>
              <button
                type="button"
                className="aia-btn aia-btn-ghost"
                style={{ minHeight: 44 }}
                onClick={() => {
                  klik()
                  setTanyaKeluar(false)
                }}
              >
                Tetap main
              </button>
            </div>
          </section>
        </div>
      )}
      {screen === 'peta' && laporan && laporan.length > 0 && (
        <LaporanPagi peristiwa={laporan} onTutup={() => setLaporan(null)} />
      )}
      {screen === 'peta' && (
        <>
          {pesanMisi && (
            <div
              className="aia-card"
              role="status"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
            >
              <p style={{ margin: 0 }}>{pesanMisi}</p>
              <button type="button" className="aia-btn aia-btn-ghost" onClick={() => setPesanMisi(null)}>
                Tutup
              </button>
            </div>
          )}
          <Jelajah onPlayChapter={mainBab} onPlayTugas={mainTugas} onOpenMisi={() => gantiTab('misi')} />
        </>
      )}
      {screen === 'misi' && <Misi />}
      {screen === 'ensiklopedia' && <Ensiklopedia />}
      {screen === 'peringkat' && <Leaderboard />}
      {screen === 'profil' && <Profil />}
      {screen === 'bab' && (
        <MisiShell
          kind="bab"
          id={activeChapter}
          modeSatuKetukan={save.modeSatuKetukan}
          onExit={() => keluarBab(false, false)}
          onMissionComplete={(tamat) => keluarBab(tamat, !save.chapters[activeChapter].done)}
        />
      )}
      {screen === 'tugas' && (
        <MisiShell
          kind="tugas"
          id={activeTugas}
          modeSatuKetukan={save.modeSatuKetukan}
          onExit={() => keluarTugas(false)}
          onMissionComplete={() => keluarTugas(!save.tugas[activeTugas].done)}
        />
      )}
      {screen === 'tamat' && <Tamat onExit={() => setScreen('peta')} />}
      {screen !== 'bab' && screen !== 'tugas' && screen !== 'tamat' && <BottomNav tab={screen} onChange={gantiTab} />}
    </div>
  )
}
