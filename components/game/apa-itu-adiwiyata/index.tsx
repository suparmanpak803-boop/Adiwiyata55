'use client'

// Runner kampanye "Apa itu Adiwiyata" — dunia + misi.
// Tidak ada lagi menu "Pilih Bab": permainan dimulai dan berlanjut di dunia
// (Jelajah); misi diberikan NPC dan dikerjakan dengan menjelajah sekolah.
// Tab: Jelajah (dunia), Misi, Ensiklopedia, Peringkat, Profil.
// Musik latar: dunia dan layar sistem memakai mode 'menu', bab memakai
// musik babnya, tamat memakai 'tamat'.

import { useEffect, useState } from 'react'
import { CampaignProvider, useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { CHAPTERS, CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { TUGAS } from '@/lib/apa-itu-adiwiyata/tugas'
import type { ChapterId, TugasKaderId } from '@/lib/apa-itu-adiwiyata/types'
import { GerbangNama } from './gerbang-nama'
import { Misi } from './misi'
import { Jelajah } from './jelajah'
import { BottomNav, type AiaTab } from './bottom-nav'
import { MisiShell } from './misi-shell'
import { Tamat } from './tamat'
import { Ensiklopedia } from './ensiklopedia'
import { Leaderboard } from './leaderboard'
import { Profil } from './profil'
import { startMusic, stopMusic, type MusicMode } from './suara'
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
  const { save, hydrated } = useCampaign()
  const [screen, setScreen] = useState<Screen>('peta')
  const [activeChapter, setActiveChapter] = useState<ChapterId>('gerbang')
  const [activeTugas, setActiveTugas] = useState<TugasKaderId>('bank-sampah')
  const [pesanMisi, setPesanMisi] = useState<string | null>(null)

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
