import type { Metadata } from 'next'
import { AdminTopbar } from '@/components/admin/admin-topbar'

// Semua halaman /admin/* hanya untuk admin yang sudah login: jangan terindeks.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminTopbar />
      {children}
    </>
  )
}
