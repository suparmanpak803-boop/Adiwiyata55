'use client'

// Runner kampanye "Apa itu Adiwiyata" — Layar Awal, dunia + misi.
// Setiap kali /game dimuat (setelah gerbang nama), tampil dulu Layar Awal:
// "Lanjutkan" bila ada progres, "Mulai dari Awal" (dengan konfirmasi bila
// sudah ada progres), atau "Cara Bermain". Setelah memilih, dunia terbuka.
// Tombol "Keluar" di bar atas selalu kembali ke portal (/).
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
import { LayarAwal } from './layar-awal'
import { CaraBermain } from './cara-bermain'
import { LaporanPagi } from './laporan-pagi'
import { Misi } from './misi'
import { Jelajah } from './jelajah'
import { BottomNav, type AiaTab } from './bottom-nav'
import { MisiShell } from './misi-shell'
import { Tamat } from './tamat'
import { TangkapSampah } from '../tangkap-sampah'
import { KuisAdiwiyata } from '../kuis-adiwiyata'
import { koinArkade } from '@/lib/apa-itu-adiwiyata/arkade'
import { Ensiklopedia } from './ensiklopedia'
import { Leaderboard } from './leaderboard'
import { Profil } from './profil'
import { klik, setSuaraMuted, startMusic, stopMusic, type MusicMode } from './suara'
import './apa-itu-adiwiyata.css'

const MODE_BAB: MusicMode[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'bab6']

type Screen = 'awal' | 'peta' | 'misi' | 'ensiklopedia' | 'peringkat' | 'profil' | 'bab' | 'tugas' | 'tamat' | 'tangkap' | 'kuis'

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
  const [screen, setScreen] = useState<Screen>('awal')
  const [activeChapter, setActiveChapter] = useState<ChapterId>('gerbang')
  const [activeTugas, setActiveTugas] = useState<TugasKaderId>('bank-sampah')
  const [pesanMisi, setPesanMisi] = useState<string | null>(null)
  const [laporan, setLaporan] = useState<PeristiwaDunia[] | null>(null)
  const [tanyaKeluar, setTanyaKeluar] = useState(false)
  const [panduanTerbuka, setPanduanTerbuka] = useState(false)
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

  // Shortcut global M: bisukan/nyalakan semua suara (disimpan di save,
  // sama seperti tombol bisu di HUD dunia dan Profil). Tidak bentrok:
  // tidak ada komponen game yang memakai tombol M (Jelajah memakai
  // WASD/panah/E/Enter/Spasi/Esc; Tangkap Sampah hanya panah; Kuis tidak
  // punya shortcut). Diabaikan saat mengetik di input atau bersama
  // Ctrl/Cmd/Alt.
  const mutedRef = useRef(save.muted)
  mutedRef.current = save.muted
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() !== 'm') return
      const next = !mutedRef.current
      dispatch({ type: 'SET_MUTED', muted: next })
      setSuaraMuted(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch])

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

  const mainTangkap = () => {
    setPesanMisi(null)
    setScreen('tangkap')
  }

  const mainKuis = () => {
    setPesanMisi(null)
    setScreen('kuis')
  }

  // Selesai game arkade: ubah skor jadi Koin Hijau + simpan rekor terbaik.
  // Hanya memberi hadiah — navigasi kembali ke dunia lewat tombol "Kembali
  // ke dunia" di layar hasil game, supaya pemain sempat melihat skornya.
  // onFinished dipanggil tepat satu kali per permainan oleh komponen game,
  // jadi koin tidak dobel. `save` di closure masih keadaan sebelum hadiah.
  const selesaiTangkap = (skor: number) => {
    const koin = koinArkade('tangkap', skor)
    const rekorBaru = skor > (save.arkade?.tangkap ?? 0)
    dispatch({ type: 'EARN_COINS', amount: koin })
    dispatch({ type: 'ARKADE_TERBAIK', game: 'tangkap', skor })
    setPesanMisi(`Tangkap Sampah selesai! Skor ${skor}, +${koin} Koin Hijau.${rekorBaru ? ' Rekor baru!' : ''}`)
  }

  const selesaiKuis = (benar: number) => {
    const koin = koinArkade('kuis', benar)
    const rekorBaru = benar > (save.arkade?.kuis ?? 0)
    dispatch({ type: 'EARN_COINS', amount: koin })
    dispatch({ type: 'ARKADE_TERBAIK', game: 'kuis', skor: benar })
    setPesanMisi(`Kuis Adiwiyata selesai! Benar ${benar} dari 12, +${koin} Koin Hijau.${rekorBaru ? ' Rekor baru!' : ''}`)
  }

  // Dari Layar Awal: masuk dunia dengan progres yang ada (atau permainan
  // baru yang masih kosong — tidak ada yang dihapus).
  const masukDunia = () => {
    klik()
    setScreen('peta')
  }

  // Dari Layar Awal: hapus progres tersimpan (START_NEW) lalu masuk dunia
  // dari nol. Laporan Pagi dari save lama dibersihkan supaya tidak tampil
  // untuk dunia yang baru.
  const mulaiBaru = () => {
    dispatch({ type: 'START_NEW' })
    setLaporan(null)
    klik()
    setScreen('peta')
  }

  const bukaPanduan = () => {
    klik()
    setPanduanTerbuka(true)
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
      setPesanMisi(`Misi Tambahan selesai: ${TUGAS[activeTugas].judul}!`)
    }
    setScreen('peta')
  }

  if (!hydrated) {
    return (
      <div className="aia-shell">
        <section className="aia-card" aria-label="Memuat kampanye">
          <p className="aia-muted">Memuat progres kampanyemu...</p>
        </section>
      </div>
    )
  }

  // Gerbang nama ikut di dalam shell (seperti layar lain), supaya di laptop
  // kartunya tidak membentang selebar viewport — lebarnya dibatasi aturan
  // .aia-gerbang-nama di CSS.
  if (!save.nickname) {
    return (
      <div className="aia-shell">
        <GerbangNama />
      </div>
    )
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
      {panduanTerbuka && <CaraBermain onTutup={() => setPanduanTerbuka(false)} />}
      {screen === 'awal' && (
        <LayarAwal onLanjutkan={masukDunia} onMulaiBaru={mulaiBaru} onBukaPanduan={bukaPanduan} />
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
          <Jelajah
            onPlayChapter={mainBab}
            onPlayTugas={mainTugas}
            onPlayTangkap={mainTangkap}
            onPlayKuis={mainKuis}
            onOpenMisi={() => gantiTab('misi')}
            onOpenPanduan={bukaPanduan}
          />
        </>
      )}
      {screen === 'misi' && <Misi />}
      {screen === 'ensiklopedia' && <Ensiklopedia />}
      {screen === 'peringkat' && <Leaderboard />}
      {screen === 'profil' && <Profil onOpenPanduan={bukaPanduan} />}
      {screen === 'bab' && (
        <MisiShell
          kind="bab"
          id={activeChapter}
          modeSatuKetukan={save.modeSatuKetukan}
          onExit={() => keluarBab(false, false)}
          onMissionComplete={(tamat) => keluarBab(tamat, !save.chapters[activeChapter].done)}
          onOpenPanduan={bukaPanduan}
        />
      )}
      {screen === 'tugas' && (
        <MisiShell
          kind="tugas"
          id={activeTugas}
          modeSatuKetukan={save.modeSatuKetukan}
          onExit={() => keluarTugas(false)}
          onMissionComplete={() => keluarTugas(!save.tugas[activeTugas].done)}
          onOpenPanduan={bukaPanduan}
        />
      )}
      {screen === 'tamat' && <Tamat onExit={() => setScreen('peta')} />}
      {screen === 'tangkap' && (
        <TangkapSampah onExit={() => setScreen('peta')} onFinished={selesaiTangkap} />
      )}
      {screen === 'kuis' && (
        <KuisAdiwiyata onExit={() => setScreen('peta')} onFinished={selesaiKuis} />
      )}
      {screen !== 'bab' &&
        screen !== 'tugas' &&
        screen !== 'tamat' &&
        screen !== 'tangkap' &&
        screen !== 'kuis' &&
        screen !== 'awal' &&
        <BottomNav tab={screen} onChange={gantiTab} />}
    </div>
  )
}
