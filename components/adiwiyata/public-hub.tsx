'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, ChevronDown, Leaf, Menu, Moon, Sun, X } from 'lucide-react'
import { AdiwiyataLogoMark } from '@/components/adiwiyata/logo-mark'
import { GreenActionQuiz } from '@/components/adiwiyata/green-action-quiz'
import { AboutSection } from '@/components/adiwiyata/about-section'
import { HomeSlider } from '@/components/adiwiyata/home-slider'
import type { SliderPageData } from '@/lib/slider/data'
import type { AdiwiyataDocument } from '@/lib/documents'
import { DEFAULT_ADIWIYATA_SITE_CONTENT, type AdiwiyataSiteContent } from '@/lib/adiwiyata-site-content'
import { StrukturPohon } from '@/components/adiwiyata/struktur-pohon'
import type { StrukturPetugas } from '@/lib/struktur-petugas-data'

type Section = 'beranda' | 'tentang' | 'profil' | 'program' | 'dokumentasi' | 'struktur' | 'publikasi' | 'dokumen'
type PublicDocument = Pick<AdiwiyataDocument, 'title' | 'description' | 'url' | 'category'>

const navigation: { id: Section; label: string }[] = [
  { id: 'beranda', label: 'Beranda' }, { id: 'tentang', label: 'Tentang Kami' }, { id: 'profil', label: 'Profil' }, { id: 'program', label: 'Program & kegiatan' },
  { id: 'dokumentasi', label: 'Kader Adiwiyata' }, { id: 'struktur', label: 'Struktur Adiwiyata' }, { id: 'publikasi', label: 'Artikel & berita' }, { id: 'dokumen', label: 'Dokumen & arsip' },
]


export function AdiwiyataPublicHub({ section = 'beranda', documents = [], content = DEFAULT_ADIWIYATA_SITE_CONTENT, sliderData = { slides: [], settings: { intervalDetik: 5, transisi: 'fade', autoplay: true, tampilPanah: true, tampilDots: true } }, structure = null }: { section?: Section; documents?: PublicDocument[]; content?: AdiwiyataSiteContent; sliderData?: SliderPageData; structure?: StrukturPetugas | null }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState<boolean | null>(null)
  const [filter, setFilter] = useState('Semua')
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null)
  const [openKaders, setOpenKaders] = useState<Set<number>>(new Set())
  const toggleKader = (index: number) => setOpenKaders((prev) => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next })
  const galleryPhotos = content.activities.flatMap((activity) => (activity.images ?? []).map((src) => ({ src, caption: activity.title })))

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme
    setDarkMode(currentTheme ? currentTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  useEffect(() => {
    if (darkMode !== null) document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])
  useEffect(() => {
    if (!lightbox) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setLightbox(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox])
  const title = section === 'beranda' ? 'Beranda' : section === 'tentang' ? 'Tentang Kami' : content.pages[section].title
  const categories = ['Semua', ...Array.from(new Set(content.activities.map((activity) => activity.category)))]
  const visibleActivities = content.activities.filter((activity) => filter === 'Semua' || activity.category === filter)

  return <main className="adi-site">
    <header className="adi-header">
      <Link href="/adiwiyata" className="adi-brand" aria-label="Adiwiyata 55, beranda"><span className="adi-brand-mark"><AdiwiyataLogoMark /></span><span><strong>Adiwiyata <i>55</i></strong><small>SMAN 55 JAKARTA</small></span></Link>
      <button className="adi-theme-toggle" type="button" aria-label={darkMode ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'} aria-pressed={darkMode === true} onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
      <button className="adi-menu-toggle" aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'adi-nav is-open' : 'adi-nav'} aria-label="Navigasi Adiwiyata">{navigation.map((item) => <Link key={item.id} href={item.id === 'beranda' ? '/adiwiyata' : `/adiwiyata/${item.id}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{item.id === 'beranda' ? 'Beranda' : item.id === 'tentang' ? item.label : content.pages[item.id].title}</Link>)}<Link className="adi-nav-portal" href="/">Portal sekolah <ArrowRight aria-hidden="true" /></Link></nav>
    </header>

    {section === 'beranda' ? <>
      <HomeSlider {...sliderData} />
      <section className="adi-section" id="kegiatan"><div className="adi-section-heading"><div><span className="adi-eyebrow">{content.home.activitiesEyebrow}</span><h2>{content.home.activitiesTitle}</h2></div><Link href="/adiwiyata/dokumentasi">{content.home.activitiesLink} <ArrowRight aria-hidden="true" /></Link></div><div className="adi-activity-grid">{content.activities.slice(0, 3).map((item, index) => <article className={`adi-activity-card activity-${index + 1}${item.images?.length ? ' has-photo' : ''}`} key={item.title}>{item.images?.[0] ? <img className="adi-activity-photo" src={item.images[0]} alt={`Dokumentasi ${item.title}`} loading="lazy" /> : null}<span className="adi-card-index">0{index + 1}</span><span className="adi-tag">{item.category}</span><h3>{item.title}</h3><p>{item.description}</p><span className="adi-card-date"><CalendarDays aria-hidden="true" />{item.date}</span>{(() => { const docUrl = documents.find((doc) => doc.title === item.title || (item.title.includes('Drainase') && doc.title.includes('Drainase')))?.url; return docUrl ? <a href={docUrl} target="_blank" rel="noreferrer">Baca dokumen <ArrowRight aria-hidden="true" /></a> : <a href="/adiwiyata/dokumen">Lihat arsip dokumen <ArrowRight aria-hidden="true" /></a> })()}</article>)}</div></section>
      <GreenActionQuiz />
      <section className="adi-profile-strip"><span className="adi-profile-icon"><BookOpen aria-hidden="true" /></span><div><span className="adi-eyebrow">{content.home.profileEyebrow}</span><h2>{content.home.profileTitle}</h2><p>{content.home.profileDescription}</p></div><Link className="adi-round-link" href="/adiwiyata/profil" aria-label="Buka profil Adiwiyata"><ArrowRight aria-hidden="true" /></Link></section>
    </> : <section className="adi-inner-page"><div className="adi-breadcrumb"><Link href="/adiwiyata">Beranda</Link><span>/</span><span>{title}</span></div><div className="adi-page-heading"><span className="adi-eyebrow">PUSAT INFORMASI ADIWIYATA</span><h1>{title}</h1><p>{section === 'tentang' ? 'Kenali platform, tujuan, dan tim di balik sistem monitoring Adiwiyata SMAN 55 Jakarta.' : content.pages[section].intro}</p></div>
      {section === 'tentang' && <AboutSection />}
      {section === 'profil' && <div className="adi-profile-content"><article><span className="adi-eyebrow">{content.pages.profil.historyEyebrow}</span><h2>{content.pages.profil.historyTitle}</h2><p>{content.pages.profil.historyBody}</p></article><article><span className="adi-eyebrow">{content.pages.profil.programsEyebrow}</span><h2>{content.pages.profil.programsTitle}</h2><p>{content.pages.profil.programsBody}</p><Link href="/adiwiyata/dokumen">Telusuri sumber dokumen <ArrowRight aria-hidden="true" /></Link></article><div className="adi-source-note"><strong>{content.pages.profil.noteTitle}</strong><p>{content.pages.profil.noteBody}</p></div></div>}
      {section === 'program' && <><div className="adi-filters" role="group" aria-label="Filter kategori kegiatan">{categories.map((category) => <button type="button" className={filter === category ? 'is-active' : ''} key={category} onClick={() => setFilter(category)}>{category}</button>)}</div><div className="adi-activity-grid">{visibleActivities.map((item, index) => <article className={`adi-activity-card activity-${index % 3 + 1}${item.images?.length ? ' has-photo' : ''}`} key={item.title}>{item.images?.[0] ? <img className="adi-activity-photo" src={item.images[0]} alt={`Dokumentasi ${item.title}`} loading="lazy" /> : null}<span className="adi-card-index">{String(index + 1).padStart(2, '0')}</span><span className="adi-tag">{item.category}</span><h2>{item.title}</h2><p>{item.description}</p><span className="adi-card-date"><CalendarDays aria-hidden="true" />{item.date}</span></article>)}</div></>}
      {section === 'struktur' && <>{structure ? <StrukturPohon data={structure} /> : <div className="adi-source-note"><strong>Struktur organisasi hanya untuk warga sekolah yang sudah login.</strong><p>Masuk dengan akun sekolah untuk melihat susunan pengurus dan koordinator kader. <Link href="/sign-in">Masuk <ArrowRight aria-hidden="true" /></Link></p></div>}</>}
      {section === 'dokumentasi' && <><p className="adi-gallery-intro">Ketuk nama kader untuk melihat uraian tugasnya.</p><div className="adi-division-grid">{content.divisions.map((division, index) => { const isOpen = openKaders.has(index); return <article className="adi-division-card" key={division.name}><span className="adi-card-index">{String(index + 1).padStart(2, '0')}</span><span className="adi-tag">{division.focus}</span><h2><button type="button" className="adi-division-toggle" aria-expanded={isOpen} onClick={() => toggleKader(index)}><span>{division.name}</span><ChevronDown aria-hidden="true" /></button></h2>{isOpen && <><p>{division.duties}</p>{division.tasks?.length ? <><span className="adi-tasks-label">Uraian tugas</span><ol>{division.tasks.map((task) => <li key={task}>{task}</li>)}</ol></> : null}</>}</article> })}</div><h2 className="adi-subtitle">Dokumentasi kegiatan</h2><p className="adi-gallery-intro">Foto dokumentasi kegiatan lingkungan warga SMAN 55 Jakarta. Ketuk foto untuk memperbesar.</p><div className="adi-gallery">{galleryPhotos.map((photo) => <button type="button" className="adi-gallery-card" key={photo.src} onClick={() => setLightbox(photo)}><img src={photo.src} alt={`Dokumentasi ${photo.caption}`} loading="lazy" /><span>{photo.caption}</span></button>)}</div></>}
      {section === 'publikasi' && <div className="adi-article-grid">{content.articles.map((article) => <article className="adi-article-card" key={article.title}><span className="adi-tag">{article.category}</span><span className="adi-card-date"><CalendarDays aria-hidden="true" />{article.date}</span><h2>{article.title}</h2><p>{article.description}</p><small>Sumber: {article.source}</small><Link href="/adiwiyata/dokumen">Lihat arsip sumber <ArrowRight aria-hidden="true" /></Link></article>)}</div>}
      {section === 'dokumen' && <><div className="adi-source-note"><strong>{content.pages.dokumen.noteTitle}</strong><p>{content.pages.dokumen.noteBody}</p></div><div className="adi-doc-grid">{documents.length ? documents.map((doc) => { const isImage = /\.(jpe?g|png|webp|gif|avif)$/i.test(doc.url.split('?')[0]); return <article className="adi-doc-card" key={doc.title}>{isImage ? <a className="adi-doc-photo-link" href={doc.url} target="_blank" rel="noreferrer"><img className="adi-doc-photo" src={doc.url} alt={`Dokumentasi ${doc.title}`} loading="lazy" /></a> : null}<span className="adi-tag">{doc.category}</span><strong>{doc.title}</strong><small>{doc.description || 'Dokumen kegiatan Adiwiyata SMAN 55 Jakarta.'}</small><a className="adi-doc-link" href={doc.url} target="_blank" rel="noreferrer">Buka atau unduh dokumen <ArrowDownToLine aria-hidden="true" /></a></article> }) : <p className="adi-doc-empty">Belum ada dokumen yang dipublikasikan.</p>}</div></>}
    </section>}
    <footer className="adi-footer"><Link href="/adiwiyata" className="adi-brand"><span className="adi-brand-mark"><AdiwiyataLogoMark /></span><span><strong>Adiwiyata <i>55</i></strong><small>SMAN 55 JAKARTA</small></span></Link><p>{content.home.footerText}</p><Link href="/">Kembali ke portal sekolah <ArrowRight aria-hidden="true" /></Link></footer>
    {lightbox && <div className="adi-lightbox" role="dialog" aria-modal="true" aria-label={lightbox.caption} onClick={() => setLightbox(null)}><button type="button" aria-label="Tutup pratinjau foto" onClick={() => setLightbox(null)}><X aria-hidden="true" /></button><img src={lightbox.src} alt={lightbox.caption} /><p>{lightbox.caption}</p></div>}
  </main>
}
