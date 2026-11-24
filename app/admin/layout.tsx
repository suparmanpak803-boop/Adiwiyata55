import type { Metadata } from 'next'

// Semua halaman /admin/* hanya untuk admin yang sudah login: jangan terindeks.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}
