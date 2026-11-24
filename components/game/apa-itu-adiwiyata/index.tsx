'use client'

import { useEffect, useState } from 'react'
import { Volume2, VolumeX, X } from 'lucide-react'
import { CampaignProvider, useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import type { ChapterId } from '@/lib/apa-itu-adiwiyata/types'
import { BabShell } from './bab-shell'
import { BottomNav, type AiaTab } from './bottom-nav'
import { Ensiklopedia } from './ensiklopedia'
import { JanjiHarian } from './janji-harian'
import { Leaderboard } from './leaderboard'
import { Lencana } from './lencana'
import { MenuUtama } from './menu-utama'
import { PetaSekolah } from './peta-sekolah'
import { Profil } from './profil'
import { RaporSekolah } from './rapor-sekolah'
import { Tamat } from './tamat'
import { playPop, startMusic, stopMusic, syncSettings, type MusicMode } from './suara'
import './apa-itu-adiwiyata.css'

type Screen = AiaTab | 'bab' | 'tamat'

function Kampanye({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  const { save, dispatch } = useCampaign()
  const [screen, setScreen] = useState<Screen>('menu')
  const [activeChapter, setActiveChapter] = useState<ChapterId>('gerbang')

  // Hentikan musik latar saat kampanye ditutup. Sinkronisasi pengaturan
  // suara (volume/mute) sudah dilakukan provider lewat syncSettings().
  useEffect(() => () => stopMusic(), [])

  // Musik latar mengikuti layar: menu/peta santai, tiap bab musiknya sendiri,
  // tamat meriah. Panggilan ulang dengan mode yang sama tidak memulai ulang.
  useEffect(() => {
    const mode: MusicMode =
      screen === 'bab'
        ? (`bab${CHAPTER_ORDER.indexOf(activeChapter) + 1}` as MusicMode)
        : screen === 'tamat'
          ? 'tamat'
          : 'menu'
    startMusic(mode)
  }, [screen, activeChapter])

  const keluar = () => {
    onFinished(save.coins)
    onExit()
  }

  const mainBab = (chapterId: ChapterId) => {
    playPop()
    setActiveChapter(chapterId)
    setScreen('bab')
  }

  const gantiTab = (tab: AiaTab) => {
    playPop()
    setScreen(tab)
  }

  const toggleSuara = () => {
    const next = !save.muted
    syncSettings({ musik: save.volumeMusik, efek: save.volumeEfek, muted: next })
    dispatch({ type: 'SET_MUTED', muted: next })
    if (!next) playPop()
  }

  return (
    <div className="aia-root">
      <header className="aia-header">
        <div className="aia-header-title">
          <h1>Apa itu Adiwiyata?</h1>
          <p>Kampanye 6 bab · jadikan sekolahmu Adiwiyata Mandiri</p>
        </div>
        <button
          type="button"
          className="aia-icon-btn"
          onClick={toggleSuara}
          aria-pressed={save.muted}
          aria-label={save.muted ? 'Nyalakan suara' : 'Matikan suara'}
        >
          {save.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
        <button type="button" className="aia-icon-btn" onClick={keluar} aria-label="Keluar dari kampanye">
          <X aria-hidden="true" />
        </button>
      </header>

      <main>
        {screen === 'menu' && <MenuUtama onPlayChapter={mainBab} />}
        {screen === 'peta' && <PetaSekolah onPlayChapter={mainBab} />}
        {screen === 'bab' && (
          <BabShell
            chapterId={activeChapter}
            onExit={() => setScreen('menu')}
            onChapterComplete={(tamat) => setScreen(tamat ? 'tamat' : 'menu')}
          />
        )}
        {screen === 'tamat' && <Tamat onExit={() => setScreen('menu')} />}
        {screen === 'ensiklopedia' && <Ensiklopedia />}
        {screen === 'peringkat' && <Leaderboard />}
        {screen === 'profil' && (
          <div className="aia-stack">
            <Profil />
            <RaporSekolah />
            <Lencana />
            <JanjiHarian />
          </div>
        )}
      </main>

      {screen !== 'bab' && screen !== 'tamat' && <BottomNav tab={screen} onChange={gantiTab} />}
    </div>
  )
}

/**
 * Runner kampanye "Apa itu Adiwiyata" — props sama persis seperti runner lain
 * di GameHub (onExit, onFinished). Saat keluar, skor yang dilaporkan adalah
 * total Koin Hijau kampanye.
 */
export function ApaItuAdiwiyata({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  return (
    <CampaignProvider>
      <Kampanye onExit={onExit} onFinished={onFinished} />
    </CampaignProvider>
  )
}
