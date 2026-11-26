import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { SiteMotion } from '@/components/animations'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.adiwiyata55jkt.my.id'),
  title: {
    default: 'Adiwiyata SMAN 55 Jakarta',
    template: '%s | Adiwiyata SMAN 55 Jakarta',
  },
  description: 'Situs program Adiwiyata SMAN 55 Jakarta: pantau pemilahan sampah, ikuti program lingkungan, tonton video edukasi, dan telusuri arsip kegiatan warga sekolah.',
  keywords: ['Adiwiyata SMAN 55', 'SMAN 55 Jakarta', 'sekolah adiwiyata', 'pilah sampah', 'bank sampah sekolah', 'edukasi lingkungan'],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://www.adiwiyata55jkt.my.id',
    siteName: 'Adiwiyata SMAN 55 Jakarta',
    title: 'Adiwiyata SMAN 55 Jakarta',
    description: 'Situs program Adiwiyata SMAN 55 Jakarta: pantau pemilahan sampah, ikuti program lingkungan, tonton video edukasi, dan telusuri arsip kegiatan warga sekolah.',
    images: [{ url: '/adiwiyata-logo.png', width: 640, height: 640, alt: 'Logo Adiwiyata SMAN 55 Jakarta' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adiwiyata SMAN 55 Jakarta',
    description: 'Situs program Adiwiyata SMAN 55 Jakarta: pantau pemilahan sampah, ikuti program lingkungan, tonton video edukasi, dan telusuri arsip kegiatan warga sekolah.',
    images: ['/adiwiyata-logo.png'],
  },
  robots: { index: true, follow: true },
  // Canonical bawaan: halaman publik menimpa dengan canonical-nya
  // sendiri; halaman ber-login/admin memakai robots noindex.
  alternates: { canonical: 'https://www.adiwiyata55jkt.my.id' },
  icons: {
    icon: '/adiwiyata-logo.png',
    apple: '/adiwiyata-logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#121c17' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {/* GA4 — Measurement ID G-5NRM2FJHWQ (properti "Adiwiyata55",
            dibuat user 26 Nov 14:33; ID ini publik, aman di kode). */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5NRM2FJHWQ"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5NRM2FJHWQ');
          `}
        </Script>
        <SiteMotion>
          {children}
        </SiteMotion>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
