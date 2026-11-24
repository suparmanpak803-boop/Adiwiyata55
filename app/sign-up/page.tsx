import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getAuth } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

// Halaman daftar: jangan terindeks.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function SignUpPage() {
  const { data: session } = await getAuth().getSession()
  if (session?.user) redirect('/')

  return <AuthForm mode="sign-up" />
}
