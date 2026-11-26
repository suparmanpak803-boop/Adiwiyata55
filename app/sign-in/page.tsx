import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getAuth } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

// Halaman masuk: jangan terindeks.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ 'password-reset'?: string }> }) {
  const { data: session } = await getAuth().getSession()
  if (session?.user) redirect('/')

  // D-F06: teruskan penanda reset berhasil ke AuthForm agar pesan
  // sukses tampil setelah pengguna mendarat dari reset kata sandi.
  const params = await searchParams
  return <AuthForm mode="sign-in" passwordResetSuccess={params?.['password-reset'] === 'success'} />
}
