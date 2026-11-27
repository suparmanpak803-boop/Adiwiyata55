'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Clock3, ExternalLink, Leaf, Menu, Moon, Play, Search, Share2, Sun, X } from 'lucide-react'
import { AdiwiyataLogoMark } from '@/components/adiwiyata/logo-mark'
import type { EducationVideo } from '@/lib/education-videos'
import { VideoQuiz } from '@/components/education/video-quiz'

const categories = ['Semua', 'Pemilahan Sampah', 'Daur Ulang', 'Kompos', 'Wadah Makan Ramah Lingkungan', 'Kegiatan Adiwiyata SMAN 55']

function isNewVideo(publishedAt: string | null) {
  if (!publishedAt) return false
  const todayInJakarta = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  const ageInDays = (Date.parse(`${todayInJakarta}T00:00:00Z`) - Date.parse(`${publishedAt}T00:00:00Z`)) / (24 * 60 * 60 * 1000)
  return ageInDays >= 0 && ageInDays <= 14
}

function VideoThumbnail({ video, featured = false }: { video: EducationVideo; featured?: boolean }) {
  const [failedId, setFailedId] = useState('')
  const source = video.videoId ? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg` : ''
  const failed = !source || failedId === video.videoId
  return (
    <div className={`education-thumbnail${featured ? ' is-featured' : ''}`}>
      {!failed ? <img src={source} alt={`Thumbnail video: ${video.title}`} loading="lazy" decoding="async" onError={() => setFailedId(video.videoId)} /> : <div className="education-thumbnail-fallback" role="img" aria-label={`Thumbnail belum tersedia untuk ${video.title}`}><Leaf aria-hidden="true" /><span>Video Adiwiyata</span></div>}
      <span className="education-play-mark" aria-hidden="true"><Play fill="currentColor" /></span>
      {video.duration && <span className="education-duration"><Clock3 aria-hidden="true" />{video.duration}</span>}
      {isNewVideo(video.publishedAt) && <span className="education-new-badge">Baru</span>}
    </div>
  )
}

function VideoEmbed({ video }: { video: EducationVideo }) {
  if (!video.videoId) return <div className="education-embed-fallback" role="status"><Leaf aria-hidden="true" /><strong>Video belum ditautkan</strong><span>Admin dapat menambahkan tautan YouTube pada baris video di sheet Video_Edukasi.</span></div>
  return <iframe className="education-iframe" src={`https://www.youtube-nocookie.com/embed/${video.videoId}`} title={video.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
}

function keyPoints(video: EducationVideo) {
  const pointsByCategory: Record<string, string[]> = {
    'Pemilahan Sampah': ['Kenali jenis sampah sebelum membuangnya.', 'Pisahkan sampah organik, anorganik, dan bahan berbahaya.', 'Mulai memilah dari kelas dan rumah.'],
    'Daur Ulang': ['Pilih bahan yang bisa didaur ulang.', 'Pastikan kemasan bersih dan kering.', 'Gunakan kembali barang sebelum mendaur ulangnya.'],
    Kompos: ['Pilih sisa organik yang sesuai untuk kompos.', 'Jaga campuran tetap seimbang dan tidak terlalu basah.', 'Manfaatkan kompos untuk tanaman sekolah.'],
    'Wadah Makan Ramah Lingkungan': ['Bawa wadah makan dan tumbler dari rumah.', 'Gunakan berulang kali dan rawat agar tetap bersih.', 'Tolak alat makan sekali pakai bila tidak diperlukan.'],
    'Kegiatan Adiwiyata SMAN 55': ['Aksi lingkungan dilakukan bersama warga sekolah.', 'Kebiasaan kecil yang konsisten memberi dampak.', 'Jaga kebersihan dan rawat fasilitas bersama.'],
  }
  return pointsByCategory[video.category] ?? pointsByCategory['Pemilahan Sampah']
}

export function EducationVideosPage({ videos, loadError, initialVideoId = '' }: { videos: EducationVideo[]; loadError: string | null; initialVideoId?: string }) {
  const [category, setCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [activeVideo, setActiveVideo] = useState<EducationVideo | null>(() => videos.find((video) => video.videoId && video.videoId === initialVideoId) ?? null)
  const [shareMessage, setShareMessage] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState<boolean | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const menuDialogRef = useRef<HTMLDialogElement>(null)
  const featuredVideo = videos[0] ?? null
  const filteredVideos = useMemo(() => videos.filter((video) => (category === 'Semua' || video.category === category) && video.title.toLocaleLowerCase('id').includes(search.trim().toLocaleLowerCase('id'))), [videos, category, search])
  const relatedVideos = useMemo(() => {
    if (!activeVideo) return []
    const otherVideos = videos.filter((video) => video !== activeVideo)
    const sameCategory = otherVideos.filter((video) => video.category === activeVideo.category)
    return (sameCategory.length ? sameCategory : otherVideos).slice(0, 3)
  }, [videos, activeVideo])
  const nextVideo = activeVideo ? videos[(videos.indexOf(activeVideo) + 1) % Math.max(videos.length, 1)] : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (activeVideo && !dialog.open) dialog.showModal()
    if (!activeVideo && dialog.open) dialog.close()
  }, [activeVideo])

  useEffect(() => {
    const savedTheme = document.documentElement.dataset.theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDarkMode(savedTheme ? savedTheme === 'dark' : prefersDark)
  }, [])

  useEffect(() => {
    if (darkMode !== null) document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  useEffect(() => {
    const dialog = menuDialogRef.current
    if (!dialog) return
    if (menuOpen && !dialog.open) dialog.showModal()
    if (!menuOpen && dialog.open) dialog.close()
  }, [menuOpen])

  function updateShareUrl(video: EducationVideo, method: 'pushState' | 'replaceState') {
    const url = new URL(window.location.href)
    if (video.videoId) url.searchParams.set('video', video.videoId)
    else url.searchParams.delete('video')
    window.history[method](null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function openVideo(video: EducationVideo, method: 'pushState' | 'replaceState' = 'pushState') {
    setActiveVideo(video)
    setShareMessage('')
    updateShareUrl(video, method)
    if (video.videoId) {
      void fetch('/api/education-videos/view', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ videoId: video.videoId, title: video.title }),
      }).catch(() => undefined)
    }
  }

  function closeVideo() {
    setActiveVideo(null)
    setShareMessage('')
    const url = new URL(window.location.href)
    url.searchParams.delete('video')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  async function copyVideoLink() {
    if (!activeVideo?.videoId) return
    const url = new URL(window.location.href)
    url.searchParams.set('video', activeVideo.videoId)
    try {
      await navigator.clipboard.writeText(url.toString())
      setShareMessage('Tautan video berhasil disalin.')
    } catch {
      setShareMessage('Browser belum mengizinkan penyalinan tautan. Salin alamat halaman ini secara manual.')
    }
  }

  function shareOnWhatsApp() {
    if (!activeVideo?.videoId) return
    const url = new URL(`/edukasi?video=${activeVideo.videoId}`, window.location.origin)
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${activeVideo.title}: ${url.toString()}`)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAnnouncement(search.trim() ? `Hasil pencarian untuk ${search.trim()}.` : 'Menampilkan semua video.')
  }

  return (
    <main className="education-site" data-theme={darkMode === null ? undefined : darkMode ? 'dark' : 'light'}>
      <header className="education-header"><button className="education-menu-toggle" type="button" aria-label="Buka menu navigasi" aria-expanded={menuOpen} aria-controls="education-navigation-drawer" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" /></button><a className="education-brand" href="/edukasi" aria-label="Video Edukasi Adiwiyata, halaman utama"><span className="education-brand-mark"><AdiwiyataLogoMark /></span><span><strong>Adiwiyata <i>55</i></strong><small>VIDEO EDUKASI</small></span></a><nav className="education-main-nav" aria-label="Navigasi edukasi"><a className="is-current" href="/edukasi" aria-current="page">Edukasi</a><a href="/sign-in">Portal sekolah <ExternalLink aria-hidden="true" /></a></nav><div className="education-header-controls"><button className="education-theme-toggle" type="button" aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'} onClick={() => setDarkMode((value) => !(value ?? false))}>{darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button></div></header>
      <dialog ref={menuDialogRef} className="education-menu-dialog" aria-labelledby="education-menu-title" onCancel={(event) => { event.preventDefault(); setMenuOpen(false) }} onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false) }}><div className="education-menu-drawer" id="education-navigation-drawer"><div className="education-menu-drawer-heading"><strong id="education-menu-title">MENU UTAMA</strong><button className="education-theme-toggle" type="button" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}><X aria-hidden="true" /></button></div><nav><a href="/adiwiyata">Beranda Adiwiyata <ArrowRight aria-hidden="true" /></a><a href="#video-pilihan" onClick={() => setMenuOpen(false)}>Video unggulan <ArrowRight aria-hidden="true" /></a><a href="/sign-in">Portal sekolah <ExternalLink aria-hidden="true" /></a></nav></div></dialog>

      <section className="education-hero" aria-labelledby="education-page-title"><div className="education-hero-copy"><span className="education-overline">BELAJAR · MEMILAH · BERGERAK</span><h1 id="education-page-title">Video Edukasi<br /><em>Lingkungan</em></h1><p>Kenali cara memilah sampah, mengurangi barang sekali pakai, dan ikut bergerak bersama Adiwiyata SMAN 55 Jakarta.</p><a className="education-primary-link" href="#video-pilihan">Mulai belajar <ArrowRight aria-hidden="true" /></a></div><div className="education-hero-art" aria-hidden="true"><span className="education-art-ring" /><span className="education-art-leaf"><Leaf /></span><span className="education-art-caption">AKSI KECIL<br />DAMPAK BAIK</span></div><span className="education-hero-index">EDUKASI LINGKUNGAN · SMAN 55 JAKARTA</span></section>

      {featuredVideo ? <section className="education-featured-section" id="video-pilihan" aria-labelledby="featured-heading"><div className="education-section-heading"><div><span className="education-overline">PILIHAN UNTUKMU</span><h2 id="featured-heading">Video unggulan</h2></div><span className="education-featured-count">01 / {String(videos.length).padStart(2, '0')}</span></div><article className="education-featured-card"><div className="education-featured-media"><VideoEmbed video={featuredVideo} /></div><div className="education-featured-copy"><span className="education-category-label">{featuredVideo.category}</span>{isNewVideo(featuredVideo.publishedAt) && <span className="education-new-badge">Baru</span>}<h3>{featuredVideo.title}</h3><p>{featuredVideo.description || 'Video edukasi untuk mengenal langkah sederhana menjaga lingkungan.'}</p><div className="education-featured-meta"><span><Clock3 aria-hidden="true" />{featuredVideo.duration || 'Durasi tidak tersedia'}</span><button className="education-text-link" type="button" onClick={() => openVideo(featuredVideo)}>Ringkasan & kuis <ArrowRight aria-hidden="true" /></button></div></div></article></section> : null}

      <section className="education-library" aria-labelledby="video-library-heading"><div className="education-section-heading"><div><span className="education-overline">PERPUSTAKAAN VIDEO</span><h2 id="video-library-heading">Materi apa saja yang bisa dipelajari?</h2><p>Pilih topik yang ingin kamu pelajari hari ini.</p></div><span className="education-library-count">{filteredVideos.length} video</span></div><div className="education-filter-tools"><div className="education-filter-chips" role="group" aria-label="Filter kategori video">{categories.map((item) => <button className={category === item ? 'education-filter-chip is-active' : 'education-filter-chip'} key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><form className="education-search" role="search" onSubmit={submitSearch}><label className="sr-only" htmlFor="education-video-search">Cari judul video</label><Search aria-hidden="true" /><input id="education-video-search" type="search" placeholder="Cari judul video" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="submit">Cari</button></form></div><p className="sr-only" aria-live="polite">{announcement}</p>
        {loadError && videos.length === 0 ? <div className="education-empty-state" role="status"><span className="education-empty-icon"><Leaf aria-hidden="true" /></span><h3>Video edukasi sedang disiapkan</h3><p>Materi belum dapat dimuat saat ini. Silakan kembali lagi nanti, atau hubungi pengelola Adiwiyata SMAN 55.</p></div> : filteredVideos.length ? <div className="education-video-grid">{filteredVideos.map((video) => <button className="education-video-card" key={`${video.videoId}-${video.title}`} type="button" onClick={() => openVideo(video)} aria-label={`Buka video ${video.title}`}><VideoThumbnail video={video} /><span className="education-video-card-copy"><span className="education-category-label">{video.category}</span><strong>{video.title}</strong><span className="education-video-description">{video.description || 'Video edukasi Adiwiyata untuk belajar langkah kecil menjaga lingkungan.'}</span><span className="education-card-meta"><span><Clock3 aria-hidden="true" />{video.duration || 'Durasi tidak tersedia'}</span><span className="education-card-watch">Tonton <ArrowRight aria-hidden="true" /></span></span></span></button>)}</div> : <div className="education-empty-state"><span className="education-empty-icon"><Search aria-hidden="true" /></span><h3>Video belum ditemukan</h3><p>Coba kata pencarian atau kategori yang berbeda.</p></div>}
      </section>

      <section className="education-callout"><div className="education-callout-mark"><Leaf aria-hidden="true" /></div><div><span className="education-overline">LANGKAH KECIL, DAMPAK BESAR</span><h2>Peduli bumi dimulai dari kebiasaan kita.</h2><p>Pilah sampah dari sumbernya, gunakan kembali, dan ajak teman bergerak bersama.</p></div><a href="/adiwiyata/program">Lihat program Adiwiyata <ArrowRight aria-hidden="true" /></a><a href="/sign-in">Jelajahi portal sekolah <ArrowRight aria-hidden="true" /></a></section>

      <footer className="education-footer"><a className="education-brand" href="/edukasi"><span className="education-brand-mark"><AdiwiyataLogoMark /></span><span><strong>Adiwiyata <i>55</i></strong><small>SMAN 55 JAKARTA</small></span></a><p>Belajar peduli, bergerak bersama, menjaga bumi.</p><span>VIDEO EDUKASI · JAKARTA</span></footer>

      <dialog ref={dialogRef} className="education-dialog" aria-labelledby="video-dialog-title" onCancel={(event) => { event.preventDefault(); closeVideo() }} onClick={(event) => { if (event.target === event.currentTarget) closeVideo() }}>
        {activeVideo && <div className="education-dialog-scroll" data-lenis-prevent><div className="education-dialog-top"><span className="education-overline">VIDEO EDUKASI · {activeVideo.category}</span><button className="education-dialog-close" type="button" aria-label="Tutup pemutar video" onClick={closeVideo}><X aria-hidden="true" /></button></div><div className="education-dialog-player"><VideoEmbed video={activeVideo} /></div><div className="education-dialog-content"><div className="education-dialog-title-row"><div><h2 id="video-dialog-title">{activeVideo.title}</h2><p>{activeVideo.description}</p></div>{activeVideo.duration && <span className="education-duration-text"><Clock3 aria-hidden="true" />{activeVideo.duration}</span>}</div><section className="education-key-points" aria-labelledby="key-points-title"><span className="education-overline">INTI PEMBELAJARAN</span><h3 id="key-points-title">Hal penting dari video</h3><ul>{keyPoints(activeVideo).map((point) => <li key={point}><Check aria-hidden="true" />{point}</li>)}</ul></section><div className="education-share-row"><button className="education-outline-button" type="button" disabled={!activeVideo.videoId} onClick={() => { void copyVideoLink() }}><Share2 aria-hidden="true" />Bagikan tautan</button>{activeVideo.videoId && <button className="education-outline-button" type="button" onClick={shareOnWhatsApp}><Share2 aria-hidden="true" />WhatsApp</button>}<span className="education-share-feedback" role="status" aria-live="polite">{shareMessage}</span></div><VideoQuiz />
        {relatedVideos.length > 0 && <section className="education-related" aria-labelledby="related-heading"><div className="education-subheading"><span className="education-overline">LANJUTKAN BELAJAR</span><h3 id="related-heading">Video terkait</h3></div><div className="education-related-list">{relatedVideos.map((video) => <button type="button" key={`${video.videoId}-${video.title}`} onClick={() => openVideo(video, 'replaceState')}><VideoThumbnail video={video} /><span><small>{video.category}</small><strong>{video.title}</strong></span><ArrowRight aria-hidden="true" /></button>)}</div></section>}
        <div className="education-next-row">{nextVideo && videos.length > 1 ? <button className="education-primary-button" type="button" onClick={() => openVideo(nextVideo, 'replaceState')}>Video berikutnya <ArrowRight aria-hidden="true" /></button> : <span>Itu dia materi yang tersedia untuk saat ini.</span>}</div></div></div>}
      </dialog>
    </main>
  )
}
