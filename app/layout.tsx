import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Adiwiyata SMAN 55 Jakarta',
  description: 'Website Adiwiyata SMAN 55 Jakarta: edukasi lingkungan, program, dokumentasi kegiatan, publikasi, arsip, pelaporan sampah, dan aksi hijau.',
  generator: 'v0.app',
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
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
