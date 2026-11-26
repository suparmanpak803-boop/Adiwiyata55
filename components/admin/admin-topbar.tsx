'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  Gamepad2,
  ImagePlus,
  Landmark,
  Leaf,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { AdiwiyataLogoMark } from '@/components/adiwiyata/logo-mark'

// Tautan menu admin — semua halaman di bawah /admin/*.
const ADMIN_LINKS = [
  { href: '/admin/dokumen', label: 'Dokumen & arsip', Icon: FileText },
  { href: '/admin/game', label: 'Game', Icon: Gamepad2 },
  { href: '/admin/game/konten', label: 'Konten game', Icon: ScrollText },
  { href: '/admin/laporan', label: 'Laporan', Icon: ClipboardList },
  { href: '/admin/petugas', label: 'Petugas', Icon: Users },
  { href: '/admin/slider', label: 'Slider beranda', Icon: ImagePlus },
  { href: '/admin/struktur', label: 'Struktur Adiwiyata', Icon: Landmark },
  { href: '/admin/diagnostik', label: 'Diagnostik', Icon: BarChart3 },
  { href: '/admin/adiwiyata/informasi', label: 'Informasi Adiwiyata', Icon: Settings },
] as const

// Bilah atas bersama untuk semua halaman /admin/*: tombol Menu (membuka
// drawer navigasi admin, memakai kelas .topbar/.nav-drawer yang sama dengan
// portal) dan tombol Keluar. Dipakai di app/admin/layout.tsx.
export function AdminTopbar() {
  const pathname = usePathname() ?? ''
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Sama seperti handleSignOut di portal.tsx (L-08): cabut sesi di server
  // hingga 3 kali, lalu fallback POST /api/logout, lalu ke /sign-in.
  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = (await authClient.signOut()) as { error?: unknown } | undefined
          if (!result || !result.error) break
        } catch {
          // Coba lagi.
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } finally {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined)
      window.location.replace('/sign-in')
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="text-button" aria-label="Buka menu navigasi" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
            <Menu aria-hidden="true" />
            Menu
          </button>
          <div className="brand-lockup">
            <a className="brand-emblem" href="/adiwiyata-logo.png" target="_blank" rel="noreferrer" aria-label="Lihat logo Adiwiyata di tab baru">
              <AdiwiyataLogoMark />
            </a>
            <a className="brand-text" href="/" aria-label="Adiwiyata 55, kembali ke portal">
              <span>
                <strong>
                  Adiwiyata <span>55</span>
                </strong>
                <small>SMAN 55 JAKARTA</small>
              </span>
            </a>
          </div>
          <div className="topbar-actions">
            <span className="school-label">ADMIN</span>
            <button type="button" className="text-button" aria-label="Keluar dari akun" title="Keluar" disabled={signingOut} onClick={() => { void handleSignOut() }}>
              <LogOut aria-hidden="true" />
              {signingOut ? 'Keluar…' : 'Keluar'}
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="drawer-scrim" onClick={() => setDrawerOpen(false)}>
          <aside className="nav-drawer" aria-label="Menu navigasi" data-lenis-prevent onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <span className="eyebrow">MENU ADMIN</span>
              <button type="button" className="icon-button" aria-label="Tutup menu" onClick={() => setDrawerOpen(false)}>
                <X aria-hidden="true" />
              </button>
            </div>
            <nav>
              <a className="drawer-link" href="/">
                <Leaf aria-hidden="true" />
                <span>Beranda portal</span>
                <ArrowRight className="drawer-arrow" aria-hidden="true" />
              </a>
              <a className="drawer-link" href="/adiwiyata">
                <BookOpen aria-hidden="true" />
                <span>Informasi Adiwiyata</span>
                <ArrowRight className="drawer-arrow" aria-hidden="true" />
              </a>
              {ADMIN_LINKS.map(({ href, label, Icon }) => (
                <a key={href} className={isActive(href) ? 'drawer-link active' : 'drawer-link'} href={href}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                  <ArrowRight className="drawer-arrow" aria-hidden="true" />
                </a>
              ))}
              <button type="button" className="drawer-link" disabled={signingOut} onClick={() => { void handleSignOut() }}>
                <LogOut aria-hidden="true" />
                <span>{signingOut ? 'Keluar…' : 'Keluar'}</span>
              </button>
            </nav>
            <div className="drawer-footer">
              <a className="brand-emblem" href="/adiwiyata-logo.png" target="_blank" rel="noreferrer" aria-label="Lihat logo Adiwiyata di tab baru">
                <AdiwiyataLogoMark />
              </a>
              <span>
                Peduli lingkungan,
                <br />
                mulai dari sekolah.
              </span>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
