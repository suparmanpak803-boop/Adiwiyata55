import { AuthRecoveryForm } from '@/components/auth-recovery-form'

export const metadata = {
  title: 'Atur Ulang Kata Sandi | Adiwiyata 55',
}

export default function ForgotPasswordPage() {
  return <AuthRecoveryForm mode="request" />
}
