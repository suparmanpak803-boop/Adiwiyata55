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
import { KoleksiSpesies } from './koleksi-spesies'
import { Leaderboard } from './leaderboard'
import { Lencana } from './lencana'
import { MenuUtama } from './menu-utama'
import { Jelajah } from './jelajah'
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
  // True bila bab dibuka dari dunia — keluar bab kembali ke dunia.
  const [kembaliKeDunia, setKembaliKeDunia] = useState(false)

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
    setKembaliKeDunia(false)
    setActiveChapter(chapterId)
    setScreen('bab')
  }

  const mainBabDariDunia = (chapterId: ChapterId) => {
    playPop()
    setKembaliKeDunia(true)
    setActiveChapter(chapterId)
    setScreen('bab')
  }

  // Keluar dari bab: kembali ke dunia bila bab dibuka dari dunia,
  // kecuali tamat (ke layar tamat).
  const keluarBab = (tamat: boolean) => {
    if (tamat) {
      setKembaliKeDunia(false)
      setScreen('tamat')
      return
    }
    setScreen(kembaliKeDunia ? 'peta' : 'menu')
    setKembaliKeDunia(false)
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
        {screen === 'menu' && <MenuUtama onPlayChapter={mainBab} onExplore={() => gantiTab('peta')} />}
        {screen === 'peta' && <Jelajah onPlayChapter={mainBabDariDunia} />}
        {screen === 'bab' && (
          <BabShell
            chapterId={activeChapter}
            onExit={() => keluarBab(false)}
            onChapterComplete={keluarBab}
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
            <KoleksiSpesies />
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
