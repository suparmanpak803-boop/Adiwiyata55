'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { WordReveal, fadeUpChild, staggerParent } from '@/components/animations'
import { ArrowRight, BookOpen, CalendarDays, ChevronDown, Leaf, Menu, Moon, Sun, X } from 'lucide-react'
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
      <div className="adi-brand"><a className="adi-brand-mark" href="/adiwiyata-logo.png" target="_blank" rel="noreferrer" aria-label="Lihat logo Adiwiyata di tab baru"><AdiwiyataLogoMark /></a><Link href="/adiwiyata" aria-label="Adiwiyata 55, beranda"><span><strong>Adiwiyata <i>55</i></strong><small>SMAN 55 JAKARTA</small></span></Link></div>
      <button className="adi-theme-toggle" type="button" aria-label={darkMode ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'} aria-pressed={darkMode === true} onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
      <button className="adi-menu-toggle" aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'adi-nav is-open' : 'adi-nav'} aria-label="Navigasi Adiwiyata">{navigation.map((item) => <Link key={item.id} href={item.id === 'beranda' ? '/adiwiyata' : `/adiwiyata/${item.id}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{item.id === 'beranda' ? 'Beranda' : item.id === 'tentang' ? item.label : content.pages[item.id].title}</Link>)}<Link className="adi-nav-portal" href="/">Portal sekolah <ArrowRight aria-hidden="true" /></Link></nav>
    </header>

    {section === 'beranda' ? <>
      <HomeSlider {...sliderData} titleAsH1 />
      <section className="adi-section" id="kegiatan"><div className="adi-section-heading"><div><span className="adi-eyebrow">{content.home.activitiesEyebrow}</span><h2 aria-label={content.home.activitiesTitle}><WordReveal text={content.home.activitiesTitle} /></h2></div><Link href="/adiwiyata/dokumentasi">{content.home.activitiesLink} <ArrowRight aria-hidden="true" /></Link></div><motion.div className="adi-activity-grid" variants={staggerParent} initial="hidden" animate="show">{content.activities.slice(0, 3).map((item, index) => <motion.article className={`adi-activity-card activity-${index + 1}${item.images?.length ? ' has-photo' : ''}`} key={item.title} variants={fadeUpChild} whileHover={{ y: -4 }}>{item.images?.[0] ? <img className="adi-activity-photo" src={item.images[0]} alt={`Dokumentasi ${item.title}`} loading="lazy" /> : null}<span className="adi-card-index">0{index + 1}</span><span className="adi-tag">{item.category}</span><h3>{item.title}</h3><p>{item.description}</p><span className="adi-card-date"><CalendarDays aria-hidden="true" />{item.date}</span>{(() => { const docUrl = documents.find((doc) => doc.title === item.title || (item.title.includes('Drainase') && doc.title.includes('Drainase')))?.url; return docUrl ? <a href={docUrl} target="_blank" rel="noreferrer">Baca dokumen <ArrowRight aria-hidden="true" /></a> : <a href="/adiwiyata/dokumen">Lihat arsip dokumen <ArrowRight aria-hidden="true" /></a> })()}</motion.article>)}</motion.div></section>
      <GreenActionQuiz />
      <section className="adi-profile-strip"><span className="adi-profile-icon"><BookOpen aria-hidden="true" /></span><div><span className="adi-eyebrow">{content.home.profileEyebrow}</span><h2 aria-label={content.home.profileTitle}><WordReveal text={content.home.profileTitle} /></h2><p>{content.home.profileDescription}</p></div><Link className="adi-round-link" href="/adiwiyata/profil" aria-label="Buka profil Adiwiyata"><ArrowRight aria-hidden="true" /></Link></section>
    </> : <section className="adi-inner-page"><div className="adi-breadcrumb"><Link href="/adiwiyata">Beranda</Link><span>/</span><span>{title}</span></div><div className="adi-page-heading"><span className="adi-eyebrow">PUSAT INFORMASI ADIWIYATA</span><h1 aria-label={title}><WordReveal text={title} /></h1><p>{section === 'tentang' ? 'Adiwiyata 55 adalah platform digital berbasis web untuk memantau program Adiwiyata di SMAN 55 Jakarta. Platform ini menggantikan pencatatan volume sampah manual berbasis kertas dengan sistem digital yang transparan dan akurat, yang bisa dipantau kapan saja.' : content.pages[section].intro}</p></div>
      {section === 'tentang' && <AboutSection />}
      {section === 'profil' && <div className="adi-profile-content"><article><span className="adi-eyebrow">{content.pages.profil.historyEyebrow}</span><h2 aria-label={content.pages.profil.historyTitle}><WordReveal text={content.pages.profil.historyTitle} /></h2><p>{content.pages.profil.historyBody}</p></article><article><span className="adi-eyebrow">{content.pages.profil.programsEyebrow}</span><h2 aria-label={content.pages.profil.programsTitle}><WordReveal text={content.pages.profil.programsTitle} /></h2><p>{content.pages.profil.programsBody}</p><Link href="/adiwiyata/program">Lihat daftar kegiatan <ArrowRight aria-hidden="true" /></Link><Link href="/adiwiyata/dokumen">Telusuri sumber dokumen <ArrowRight aria-hidden="true" /></Link></article><div className="adi-source-note"><strong>{content.pages.profil.noteTitle}</strong><p>{content.pages.profil.noteBody}</p></div></div>}
      {section === 'program' && <><h2 className="adi-subtitle adi-subtitle-first">Kegiatan apa saja yang dijalankan di SMAN 55?</h2><div className="adi-filters" role="group" aria-label="Filter kategori kegiatan">{categories.map((category) => <button type="button" className={filter === category ? 'is-active' : ''} key={category} onClick={() => setFilter(category)}>{category}</button>)}</div><motion.div className="adi-activity-grid" variants={staggerParent} initial="hidden" animate="show">{visibleActivities.map((item, index) => <motion.article className={`adi-activity-card activity-${index % 3 + 1}${item.images?.length ? ' has-photo' : ''}`} key={item.title} variants={fadeUpChild} whileHover={{ y: -4 }}>{item.images?.[0] ? <img className="adi-activity-photo" src={item.images[0]} alt={`Dokumentasi ${item.title}`} loading="lazy" /> : null}<span className="adi-card-index">{String(index + 1).padStart(2, '0')}</span><span className="adi-tag">{item.category}</span><h2>{item.title}</h2><p>{item.description}</p><span className="adi-card-date"><CalendarDays aria-hidden="true" />{item.date}</span></motion.article>)}</motion.div><p className="adi-gallery-intro">Kegiatan ini dijalankan oleh 15 kader. Kenali <Link href="/adiwiyata/dokumentasi">kader Adiwiyata dan uraian tugasnya</Link>, dan baca latar belakang programnya di <Link href="/adiwiyata/profil">profil sekolah</Link>.</p></>}
      {section === 'struktur' && <>{structure ? <StrukturPohon data={structure} /> : <div className="adi-source-note"><strong>Struktur organisasi hanya untuk warga sekolah yang sudah login.</strong><p>Masuk dengan akun sekolah untuk melihat susunan pengurus dan koordinator kader. <Link href="/sign-in">Masuk <ArrowRight aria-hidden="true" /></Link></p></div>}</>}
      {section === 'dokumentasi' && <><h2 className="adi-subtitle adi-subtitle-first">Siapa saja kader Adiwiyata?</h2><p className="adi-gallery-intro">Ketuk nama kader untuk melihat uraian tugasnya.</p><motion.div className="adi-division-grid" variants={staggerParent} initial="hidden" animate="show">{content.divisions.map((division, index) => { const isOpen = openKaders.has(index); return <motion.article className="adi-division-card" key={division.name} variants={fadeUpChild} whileHover={{ y: -4 }}><span className="adi-card-index">{String(index + 1).padStart(2, '0')}</span><span className="adi-tag">{division.focus}</span><h2><button type="button" className="adi-division-toggle" aria-expanded={isOpen} onClick={() => toggleKader(index)}><span>{division.name}</span><ChevronDown aria-hidden="true" /></button></h2>{isOpen && <><p>{division.duties}</p>{division.tasks?.length ? <><span className="adi-tasks-label">Uraian tugas</span><ol>{division.tasks.map((task) => <li key={task}>{task}</li>)}</ol></> : null}</>}</motion.article> })}</motion.div><h2 className="adi-subtitle" aria-label="Dokumentasi kegiatan"><WordReveal text="Dokumentasi kegiatan" /></h2><p className="adi-gallery-intro">Foto dokumentasi kegiatan lingkungan warga SMAN 55 Jakarta. Ketuk foto untuk memperbesar.</p><motion.div className="adi-gallery" variants={staggerParent} initial="hidden" animate="show">{galleryPhotos.map((photo) => <motion.button type="button" className="adi-gallery-card" key={photo.src} variants={fadeUpChild} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setLightbox(photo)}><img src={photo.src} alt={`Dokumentasi ${photo.caption}`} loading="lazy" /><span>{photo.caption}</span></motion.button>)}</motion.div><p className="adi-gallery-intro">Foto-foto di atas mendokumentasikan kegiatan yang dijalankan kader. Lihat <Link href="/adiwiyata/program">daftar program dan kegiatan</Link> serta <Link href="/adiwiyata/dokumen">arsip dokumen resmi</Link> program Adiwiyata.</p></>}
      {section === 'publikasi' && <><h2 className="adi-subtitle adi-subtitle-first">Apa kabar terbaru dari Adiwiyata?</h2><motion.div className="adi-article-grid" variants={staggerParent} initial="hidden" animate="show">{content.articles.map((article) => <motion.article className="adi-article-card" key={article.title} variants={fadeUpChild} whileHover={{ y: -4 }}><span className="adi-tag">{article.category}</span><span className="adi-card-date"><CalendarDays aria-hidden="true" />{article.date}</span><h2>{article.title}</h2><p>{article.description}</p><small>Oleh {article.source} · Diterbitkan {article.date}</small><Link href="/adiwiyata/dokumen">Lihat arsip sumber <ArrowRight aria-hidden="true" /></Link></motion.article>)}</motion.div><p className="adi-gallery-intro">Kabar di atas merangkum kegiatan yang sudah berjalan. Lihat <Link href="/adiwiyata/program">program dan kegiatan</Link> yang mendasarinya, atau baca <Link href="/adiwiyata/profil">profil Adiwiyata SMAN 55 Jakarta</Link>.</p></>}
      {section === 'dokumen' && <><div className="adi-source-note"><strong>{content.pages.dokumen.noteTitle}</strong><p>{content.pages.dokumen.noteBody}</p></div><h2 className="adi-subtitle adi-subtitle-first">Dokumen apa saja yang tersedia?</h2><motion.div className="adi-doc-grid" variants={staggerParent} initial="hidden" animate="show">{documents.length ? documents.map((doc) => { const isImage = /\.(jpe?g|png|webp|gif|avif)$/i.test(doc.url.split('?')[0]); return <motion.article className="adi-doc-card" key={doc.title} variants={fadeUpChild} whileHover={{ y: -4 }}>{isImage ? <a className="adi-doc-photo-link" href={doc.url} target="_blank" rel="noreferrer"><img className="adi-doc-photo" src={doc.url} alt={`Dokumentasi ${doc.title}`} loading="lazy" /></a> : null}<span className="adi-tag">{doc.category}</span><strong>{doc.title}</strong><small>{doc.description || 'Dokumen kegiatan Adiwiyata SMAN 55 Jakarta.'}</small></motion.article> }) : <p className="adi-doc-empty">Belum ada dokumen yang dipublikasikan.</p>}</motion.div><div className="adi-actions"><Link className="adi-primary" href="/adiwiyata">Kembali ke Beranda</Link><Link className="adi-secondary" href="/">Ke Dashboard Portal</Link></div></>}
    </section>}
    <footer className="adi-footer"><div className="adi-brand"><a className="adi-brand-mark" href="/adiwiyata-logo.png" target="_blank" rel="noreferrer" aria-label="Lihat logo Adiwiyata di tab baru"><AdiwiyataLogoMark /></a><Link href="/adiwiyata" aria-label="Adiwiyata 55, beranda"><span><strong>Adiwiyata <i>55</i></strong><small>SMAN 55 JAKARTA</small></span></Link></div><p>{content.home.footerText}</p><Link href="/">Kembali ke portal sekolah <ArrowRight aria-hidden="true" /></Link></footer>
    {lightbox && <div className="adi-lightbox" role="dialog" aria-modal="true" aria-label={lightbox.caption} data-lenis-prevent onClick={() => setLightbox(null)}><button type="button" aria-label="Tutup pratinjau foto" onClick={() => setLightbox(null)}><X aria-hidden="true" /></button><img src={lightbox.src} alt={lightbox.caption} /><p>{lightbox.caption}</p></div>}
  </main>
}
