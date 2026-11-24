import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SiteMotion } from '@/components/animations'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.adiwiyata55jkt.my.id'),
  title: {
    default: 'Adiwiyata SMAN 55 Jakarta',
    template: '%s | Adiwiyata SMAN 55 Jakarta',
  },
  description: 'Website Adiwiyata SMAN 55 Jakarta: edukasi lingkungan, program, dokumentasi kegiatan, publikasi, arsip, pelaporan sampah, dan aksi hijau.',
  keywords: ['Adiwiyata SMAN 55', 'SMAN 55 Jakarta', 'sekolah adiwiyata', 'pilah sampah', 'bank sampah sekolah', 'edukasi lingkungan'],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://www.adiwiyata55jkt.my.id',
    siteName: 'Adiwiyata SMAN 55 Jakarta',
    title: 'Adiwiyata SMAN 55 Jakarta',
    description: 'Website Adiwiyata SMAN 55 Jakarta: edukasi lingkungan, program, dokumentasi kegiatan, publikasi, arsip, pelaporan sampah, dan aksi hijau.',
    images: [{ url: '/adiwiyata-logo.png', width: 640, height: 640, alt: 'Logo Adiwiyata SMAN 55 Jakarta' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adiwiyata SMAN 55 Jakarta',
    description: 'Website Adiwiyata SMAN 55 Jakarta: edukasi lingkungan, program, dokumentasi kegiatan, publikasi, arsip, pelaporan sampah, dan aksi hijau.',
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
        <SiteMotion>
          {children}
        </SiteMotion>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
