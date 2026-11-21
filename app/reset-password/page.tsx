import { AuthRecoveryForm } from '@/components/auth-recovery-form'

export const metadata = {
  title: 'Kata Sandi Baru | Adiwiyata 55',
}

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  return <AuthRecoveryForm mode="reset" token={token} />
}
