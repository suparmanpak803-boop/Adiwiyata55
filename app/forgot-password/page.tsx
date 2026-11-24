import { AuthRecoveryForm } from '@/components/auth-recovery-form'

export const metadata = {
  title: { absolute: 'Atur Ulang Kata Sandi | Adiwiyata 55' },
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return <AuthRecoveryForm mode="request" />
}
