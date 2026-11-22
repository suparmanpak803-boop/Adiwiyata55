'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Film,
  FileText,
  Gamepad2, MessageSquarePlus, ClipboardList,
  GraduationCap,
  ImagePlus,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { EDU_DEFAULTS, KADER_LIST } from '@/lib/edu-defaults'
import { DepositWorkspace } from '@/components/adiwiyata/deposit-workspace'
import { MonitoringDashboard } from '@/components/adiwiyata/monitoring-dashboard'
import { SheetsSettingsPanel } from '@/components/adiwiyata/sheets-settings-panel'
import { ClassDirectory } from '@/components/adiwiyata/class-directory'
import { EducationVideoSettingsPanel } from '@/components/adiwiyata/education-video-settings-panel'
import type { getDepositPageData } from '@/app/actions/deposits'
import { authClient } from '@/lib/auth/client'
import { HomeSlider } from '@/components/adiwiyata/home-slider'
import { AdiwiyataLogoMark } from '@/components/adiwiyata/logo-mark'
import type { SliderPageData } from '@/lib/slider/data'

type View = 'beranda' | 'edukasi' | 'kelas' | 'monitoring' | 'setoran' | 'pengaturan' | 'video' | 'slider' | 'leaderboard' | 'main' | 'laporan' | 'adminlaporan' | 'game' | 'dokumen' | 'informasi' | 'laporankader' | 'adminusers'

import type { EducationVideo } from '@/lib/education-videos'

// PERBAIKAN tsc: sebelumnya tipe lokal di sini mendeklarasikan enabled/
// displayOrder opsional, sehingga tidak cocok dengan EducationVideo
// yang dipakai EducationVideoSettingsPanel. Sekarang memakai tipe lib.
type EducationVideoAdminData = { videos: EducationVideo[]; error: string | null }

const navigation: { id: View; label: string; icon: typeof Leaf; enabled: boolean }[] = [
  { id: 'beranda', label: 'Beranda', icon: Leaf, enabled: true },
  { id: 'edukasi', label: 'Edukasi', icon: GraduationCap, enabled: true },
  { id: 'kelas', label: 'Daftar Kelas & Petugas', icon: Users, enabled: true },
  { id: 'monitoring', label: 'Dashboard Monitoring', icon: BarChart3, enabled: true },
  { id: 'setoran', label: 'Input Laporan', icon: ArrowDownRight, enabled: true },
  { id: 'pengaturan', label: 'Pengaturan Sheets', icon: Settings, enabled: true },
  { id: 'video', label: 'Atur Video Edukasi', icon: Film, enabled: true },
  { id: 'dokumen', label: 'Dokumen & Arsip', icon: FileText, enabled: true },
  { id: 'informasi', label: 'Atur Informasi Adiwiyata', icon: FileText, enabled: true },
  { id: 'adminusers', label: 'Akses Pengguna', icon: ShieldCheck, enabled: true },
  { id: 'slider', label: 'Slider Beranda', icon: ImagePlus, enabled: true },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, enabled: true },
  { id: 'main', label: 'Main Game', icon: Gamepad2, enabled: true },
  { id: 'laporan', label: 'Laporan & Saran', icon: MessageSquarePlus, enabled: true },
  { id: 'adminlaporan', label: 'Kelola Laporan', icon: ClipboardList, enabled: true },
  { id: 'laporankader', label: 'Laporan Kinerja Kader', icon: ClipboardList, enabled: true },
  { id: 'game', label: 'Pengaturan Game', icon: Gamepad2, enabled: true },
]

// PERBAIKAN (B-07): satu fungsi untuk navigasi desktop dan drawer.
// Sebelumnya desktop menyaring item.enabled sedangkan drawer tidak,
// sehingga item yang belum aktif tampil berbeda di keduanya.
function visibleNavigation(role: 'admin' | 'petugas' | 'pengunjung') {
  return navigation.filter((item) => item.enabled && (item.id !== 'setoran' || role !== 'pengunjung') && (item.id !== 'pengaturan' || role === 'admin') && (item.id !== 'video' || role === 'admin') && (item.id !== 'slider' || role === 'admin') && (item.id !== 'game' || role === 'admin') && (item.id !== 'adminlaporan' || role !== 'pengunjung') && (item.id !== 'laporankader' || role === 'petugas') && (item.id !== 'adminusers' || role === 'admin') && (item.id !== 'informasi' || role === 'admin'))
}

function SectionContent({ section }: { section: (typeof EDU_DEFAULTS.sections)[number] }) {
  if (section.id === 'pengenalan') {
    return (
      <div className="education-copy">
        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <h3>Tujuan Utama Adiwiyata</h3>
        <ul>{section.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
      </div>
    )
  }

  if (section.id === 'pilar') {
    return (
      <div className="education-copy">
        <p>{section.introduction}</p>
        <div className="pillar-grid">
          {section.pillars.map((pillar, index) => (
            <article className="pillar-card" key={pillar.title}>
              <span className="number-chip">0{index + 1}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (section.id === 'gerakan') {
    return (
      <div className="education-copy">
        <p>{section.introduction}</p>
        <div className="subsection-heading">
          <div><span className="eyebrow">AKSI HARIAN</span><h3>Struktur Kader Lingkungan</h3></div>
          <span className="count-pill">{KADER_LIST.length} kelompok</span>
        </div>
        <p>Untuk menjalankan program harian secara terfokus, SMAN 55 Jakarta membentuk {KADER_LIST.length} kelompok kader siswa:</p>
        <ol className="kader-grid">
          {KADER_LIST.map((kader, index) => <li key={kader}><span>{String(index + 1).padStart(2, '0')}</span>{kader}</li>)}
        </ol>
      </div>
    )
  }

  return (
    <div className="education-copy">
      <div className="joss-callout"><span className="joss-mark">JOSS</span><div><h3>Jaga & Olah Sampah Sekolah</h3><p>{section.joss}</p></div></div>
      <div className="impact-grid">
        {section.impact.map((item) => <article className="impact-card" key={item.value}><strong>{item.value}<small>{item.unit}</small></strong><p>{item.description}</p></article>)}
      </div>
      <div className="zero-rule"><ShieldCheck aria-hidden="true" /><div><span className="eyebrow">KEBIASAAN BAIK</span><h3>Aturan Zero Waste Harian</h3><p>{section.dailyRule}</p></div></div>
      <div className="shortcut-row"><span>Jelajahi portal</span><span className="shortcut-note"><BarChart3 aria-hidden="true" /> Monitoring tersedia setelah autentikasi aktif</span></div>
    </div>
  )
}

function EducationSections() {
  const [openSections, setOpenSections] = useState<string[]>(['pengenalan'])

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)')
    const sync = () => setOpenSections(mobile.matches ? ['pengenalan'] : EDU_DEFAULTS.sections.map((section) => section.id))
    sync()
    mobile.addEventListener('change', sync)
    return () => mobile.removeEventListener('change', sync)
  }, [])

  const toggle = (id: string) => setOpenSections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return (
    <section className="education-section" id="edukasi" aria-labelledby="education-title">
      <div className="section-intro">
        <div><span className="eyebrow">BELAJAR & BERGERAK</span><h2 id="education-title">Kenali gerakan Adiwiyata</h2></div>
        <p>Memahami lingkungan adalah langkah pertama untuk merawatnya bersama.</p>
      </div>
      <div className="education-list">
        {EDU_DEFAULTS.sections.map((section, index) => {
          const isOpen = openSections.includes(section.id)
          return (
            <article className={`education-card education-card-${index + 1}${isOpen ? ' is-open' : ''}`} key={section.id}>
              <button className="education-trigger" type="button" aria-expanded={isOpen} aria-controls={`education-content-${section.id}`} onClick={() => toggle(section.id)}>
                <span className="education-icon" aria-hidden="true">{section.icon}</span>
                <span className="education-heading"><small>0{index + 1} / 04</small><strong>{section.title}</strong></span>
                <ChevronDown className="accordion-chevron" aria-hidden="true" />
              </button>
              {isOpen && <div className="education-content" id={`education-content-${section.id}`}><SectionContent section={section} /></div>}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function OperationalNotice({ onClose }: { onClose: () => void }) {
  return <div className="notice-backdrop" role="presentation" onClick={onClose}><section className="notice-dialog" role="dialog" aria-modal="true" aria-labelledby="notice-title" onClick={(event) => event.stopPropagation()}><button className="icon-button notice-close" aria-label="Tutup pemberitahuan" onClick={onClose}><X /></button><span className="notice-icon"><ShieldCheck aria-hidden="true" /></span><span className="eyebrow">AKSES TERLINDUNGI</span><h2 id="notice-title">Fitur monitoring belum dibuka</h2><p>Halaman ini masih dalam tahap pengembangan. Informasi edukasi dan daftar kelas tetap dapat dilihat melalui portal.</p><button className="primary-button" onClick={onClose}>Mengerti <ArrowRight aria-hidden="true" /></button></section></div>
}

// PERBAIKAN: tombol "Panduan" di menu sebelumnya membuka OperationalNotice
// ("Fitur monitoring belum dibuka") — bukan panduan. Dialog ini berisi
// panduan penggunaan portal yang sebenarnya.
function GuideDialog({ onClose, role }: { onClose: () => void; role: 'admin' | 'petugas' | 'pengunjung' }) {
  return <div className="notice-backdrop" role="presentation" onClick={onClose}><section className="notice-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(event) => event.stopPropagation()}><button className="icon-button notice-close" aria-label="Tutup panduan" onClick={onClose}><X /></button><span className="notice-icon"><CircleHelp aria-hidden="true" /></span><span className="eyebrow">PANDUAN</span><h2 id="guide-title">Cara memakai portal</h2><div className="guide-body">
    <h3>Masuk</h3>
    <p>Ketuk &ldquo;Lanjutkan dengan Google&rdquo;, lalu pilih akun Gmail kamu. Menu yang tampil menyesuaikan peranmu.</p>
    <h3>Menu utama</h3>
    <ul>
      <li><strong>Beranda</strong> — ringkasan gerakan dan data lingkungan sekolah.</li>
      <li><strong>Edukasi</strong> — video dan materi tentang pilah sampah dan lingkungan.</li>
      <li><strong>Daftar Kelas &amp; Petugas</strong> — setoran sampah tiap kelas dan daftar petugas.</li>
      <li><strong>Dashboard Monitoring</strong> — pantauan data sampah sekolah.</li>
      <li><strong>Dokumen &amp; Arsip</strong> — dokumen dan arsip kegiatan Adiwiyata.</li>
      <li><strong>Main Game</strong> — bermain game edukasi Adiwiyata; skormu masuk Leaderboard.</li>
      <li><strong>Leaderboard</strong> — peringkat pemain dan kelas.</li>
      <li><strong>Laporan &amp; Saran</strong> — kirim saran untuk program Adiwiyata.</li>
    </ul>
    {role === 'petugas' && <><h3>Khusus petugas</h3>
    <ul>
      <li><strong>Input Laporan</strong> — kirim setoran atau laporan sampah untuk kelas yang kamu ampu.</li>
      <li><strong>Laporan Kinerja Kader</strong> — isi laporan kinerja kader.</li>
      <li><strong>Kelola Laporan</strong> — lihat dan kelola laporan yang masuk.</li>
    </ul>
    <p>Akses petugas bisa diberi tanggal berakhir oleh admin. Bila tanggalnya lewat, akunmu kembali jadi pengunjung.</p></>}
    {role === 'pengunjung' && <><h3>Khusus pengunjung</h3>
    <p>Kamu bisa memakai semua menu di atas. Menu <strong>Input Laporan</strong> dan menu admin hanya untuk petugas dan admin.</p></>}
    {role === 'admin' && <><h3>Khusus admin</h3>
    <ul>
      <li><strong>Input Laporan</strong> dan <strong>Kelola Laporan</strong> — sama seperti petugas.</li>
      <li><strong>Pengaturan Game</strong> — atur permainan. Bila game tidak bisa dibuka, buka <strong>Diagnostik Sistem</strong> lalu ketuk &ldquo;Perbaiki Tabel&rdquo;.</li>
      <li><strong>Akses Pengguna</strong> — tambah admin atau petugas, dan atur masa berlaku akses petugas.</li>
      <li><strong>Pengaturan Sheets, Atur Video Edukasi, Atur Informasi Adiwiyata, Slider Beranda</strong> — kelola konten dan data portal.</li>
    </ul></>}
    <h3>Butuh bantuan?</h3>
    <p>Hubungi kader Adiwiyata atau admin sekolah.</p>
  </div><button className="primary-button" onClick={onClose}>Mengerti <ArrowRight aria-hidden="true" /></button></section></div>
}

export function AdiwiyataPortal({ user, depositData, sheetsConfig, educationVideoData, sliderData }: { user: { name: string; role: 'admin' | 'petugas' | 'pengunjung' }; depositData: Awaited<ReturnType<typeof getDepositPageData>>; sheetsConfig: { url: string; configured: boolean } | null; educationVideoData: EducationVideoAdminData | null; sliderData: SliderPageData }) {
  const router = useRouter()
  const [view, setView] = useState<View>('beranda')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dark, setDark] = useState<boolean | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut().catch(() => undefined)
    } finally {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined)
      window.location.replace('/sign-in')
    }
  }

  useEffect(() => {
    setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  useEffect(() => {
    if (dark !== null) document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDrawerOpen(false); setNoticeOpen(false); setGuideOpen(false) } }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const selectView = (next: View) => {
    setDrawerOpen(false)
    if (next === 'edukasi') { router.push('/edukasi'); return }
    if (next === 'slider') { router.push('/admin/slider'); return }
    if (next === 'dokumen') { router.push(user.role === 'admin' ? '/admin/dokumen' : '/adiwiyata/dokumen'); return }
    if (next === 'informasi') { router.push('/admin/adiwiyata/informasi'); return }
    if (next === 'leaderboard') { router.push('/leaderboard'); return }
    if (next === 'main') { router.push('/game'); return }
    if (next === 'laporan') { router.push('/laporan'); return }
    if (next === 'game') { router.push('/admin/game'); return }
    if (next === 'adminlaporan') { router.push('/admin/laporan'); return }
    if (next === 'laporankader') { router.push('/laporan-kader'); return }
    if (next === 'adminusers') { router.push('/admin/petugas'); return }
    setView(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="portal-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="icon-button menu-trigger" aria-label="Buka menu navigasi" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><Menu /></button>
          <button className="brand-lockup" onClick={() => selectView('beranda')} aria-label="Adiwiyata 55 SMAN 55 Jakarta, kembali ke beranda"><span className="brand-emblem"><AdiwiyataLogoMark /></span><span><strong>Adiwiyata <span>55</span></strong><small>SMAN 55 JAKARTA</small></span></button>
          <nav className="desktop-nav" aria-label="Navigasi utama"><a className="nav-link" href="/adiwiyata">INFORMASI ADIWIYATA</a><a className="nav-link" href="/adiwiyata/tentang">TENTANG KAMI</a>{visibleNavigation(user.role).map((item) => <button className={view === item.id ? 'nav-link active' : 'nav-link'} key={item.id} onClick={() => selectView(item.id)}>{item.label}</button>)}</nav>
          <div className="topbar-actions"><span className="school-label" title={`${user.name} · ${user.role}`}>{user.role === 'admin' ? 'ADMIN' : user.role === 'petugas' ? 'PETUGAS' : 'PENGUNJUNG'}</span><button className="icon-button theme-toggle" aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'} onClick={() => setDark((value) => !value)}>{dark ? <Sun /> : <Moon />}</button><button className="icon-button signout-button" aria-label="Keluar dari akun" disabled={signingOut} onClick={() => { void handleSignOut() }} title="Keluar"><LogOut aria-hidden="true" /></button></div>
        </div>
      </header>

      {drawerOpen && <div className="drawer-scrim" onClick={() => setDrawerOpen(false)}><aside className="nav-drawer" aria-label="Menu navigasi" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><span className="eyebrow">MENU UTAMA</span><button className="icon-button" aria-label="Tutup menu" onClick={() => setDrawerOpen(false)}><X /></button></div><nav><a className="drawer-link" href="/adiwiyata"><Leaf aria-hidden="true" /><span>INFORMASI ADIWIYATA</span><ArrowRight className="drawer-arrow" aria-hidden="true" /></a><a className="drawer-link" href="/adiwiyata/tentang"><BookOpen aria-hidden="true" /><span>TENTANG KAMI</span><ArrowRight className="drawer-arrow" aria-hidden="true" /></a>{visibleNavigation(user.role).map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'drawer-link active' : 'drawer-link'} onClick={() => selectView(item.id)}><Icon aria-hidden="true" /><span>{item.label}</span></button> })}<button className="drawer-link" onClick={() => { setDrawerOpen(false); setGuideOpen(true) }}><CircleHelp aria-hidden="true" /><span>Panduan</span><ArrowRight className="drawer-arrow" aria-hidden="true" /></button></nav><div className="drawer-footer"><span className="brand-emblem"><AdiwiyataLogoMark /></span><span>Peduli lingkungan,<br />mulai dari sekolah.</span></div></aside></div>}

      {view === 'pengaturan' ? <SheetsSettingsPanel initialUrl={sheetsConfig?.url ?? ''} initiallyConfigured={sheetsConfig?.configured ?? false} /> : view === 'video' ? <EducationVideoSettingsPanel data={educationVideoData ?? { videos: [], error: null }} /> : view === 'monitoring' ? <MonitoringDashboard summary={depositData.sheetsSummary} initialError={depositData.sheetsError} classes={depositData.classes} role={user.role} /> : view === 'setoran' ? <DepositWorkspace data={depositData} /> : view === 'kelas' ? <ClassDirectory classes={depositData.classes} isAdmin={user.role === 'admin'} /> : <>
        <section className="hero-section">
          <div className="hero-copy"><span className="hero-kicker"><span className="pulse-dot" /> GERAKAN SEKOLAH LESTARI</span><h1>Mulai dari<br /><em>kebiasaan baik.</em></h1><p>Langkah sederhana di sekolah, dampak berarti untuk bumi. Bersama warga SMAN 55 Jakarta, rawat lingkungan mulai hari ini.</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById('edukasi')?.scrollIntoView({ behavior: 'smooth' })}>Jelajahi Adiwiyata <ArrowDownRight aria-hidden="true" /></button><button className="text-button" onClick={() => selectView('edukasi')}>Video edukasi <ArrowRight aria-hidden="true" /></button></div><div className="hero-caption"><span className="hero-caption-line" /> <span>EDUKASI · AKSI · KEBERLANJUTAN</span></div></div>
          <div className="hero-art"><HomeSlider slides={sliderData.slides} settings={sliderData.settings} /></div>
          <div className="hero-bottom"><span>01 — PENGENALAN</span><span>GULIR UNTUK MENJELAJAHI <ChevronDown aria-hidden="true" /></span></div>
        </section>
        <EducationSections />
        <section className="portal-bento" aria-labelledby="portal-title"><div className="bento-heading"><div><span className="eyebrow">PORTAL SEKOLAH</span><h2 id="portal-title">Gerakan yang bisa kita mulai</h2></div><p>Informasi program dan aktivitas Adiwiyata SMAN 55 Jakarta.</p></div><div className="bento-grid"><button className="bento-card bento-class" onClick={() => selectView('kelas')}><span className="bento-icon"><Users aria-hidden="true" /></span><span className="eyebrow">WARGA SEKOLAH</span><strong>Kenali kelas<br />dan kadernya.</strong><span className="bento-link">Buka daftar kelas <ArrowRight aria-hidden="true" /></span><span className="bento-decoration">{depositData.classes.length}</span></button><button className="bento-card bento-monitor" onClick={() => setNoticeOpen(true)}><span className="bento-icon"><BarChart3 aria-hidden="true" /></span><span className="eyebrow">DATA LINGKUNGAN</span><strong>Pantau aksi<br />bersama.</strong><span className="bento-link">Segera hadir <ArrowRight aria-hidden="true" /></span><span className="monitor-bars"><i /><i /><i /><i /><i /><i /><i /></span></button><article className="bento-card bento-note"><span className="eyebrow">KOMITMEN KITA</span><strong>Lebih bijak<br />memilah.</strong><p>Kenali jenis sampah, kurangi yang sekali pakai, dan bawa wadah makan dari rumah.</p><Leaf className="bento-leaf" aria-hidden="true" /></article></div></section>
      </>}

      <footer className="site-footer"><div className="footer-brand"><span className="brand-emblem"><AdiwiyataLogoMark /></span><span><strong>SMAN 55 Jakarta</strong><small>PROGRAM ADIWIYATA</small></span></div><p>Merawat lingkungan dimulai dari kebiasaan bersama.</p><span className="footer-mark">ADIWIYATA <span>·</span> JAKARTA</span></footer>

      {noticeOpen && <OperationalNotice onClose={() => setNoticeOpen(false)} />}
      {guideOpen && <GuideDialog role={user.role} onClose={() => setGuideOpen(false)} />}
    </main>
  )
}
