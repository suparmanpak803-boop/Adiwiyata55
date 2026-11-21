import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getAuth } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const { data: session } = await getAuth().getSession()
  if (session?.user) redirect('/')

  return <AuthForm mode="sign-in" />
}
