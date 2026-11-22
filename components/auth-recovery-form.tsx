'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { AdiwiyataLogoMark } from '@/components/adiwiyata/logo-mark'
import { authClient } from '@/lib/auth/client'

type AuthRecoveryFormProps = {
  mode: 'request' | 'reset'
  token?: string
}

export function AuthRecoveryForm({ mode, token }: AuthRecoveryFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')
    setPending(true)
    setError('')

    try {
      if (mode === 'request') {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (result.error) throw result.error
        setComplete(true)
      } else {
        if (!token) {
          setError('Tautan pemulihan tidak lengkap atau sudah kedaluwarsa. Minta tautan baru.')
          return
        }
        const result = await authClient.resetPassword({ newPassword: password, token })
        if (result.error) throw result.error
        setComplete(true)
        router.replace('/sign-in?password-reset=success')
      }
    } catch {
      if (mode === 'request') {
        // Anti-enumerasi: tampilkan layar sukses yang sama walau SDK error,
        // agar tidak bisa dibedakan apakah email terdaftar atau tidak.
        setComplete(true)
      } else {
        setError('Tautan tidak valid atau kedaluwarsa. Minta tautan pemulihan yang baru.')
      }
    } finally {
      setPending(false)
    }
  }

  const isRequest = mode === 'request'

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="recovery-heading">
        <Link className="auth-brand" href="/" aria-label="Adiwiyata 55 SMAN 55 Jakarta">
          <span className="brand-emblem"><AdiwiyataLogoMark /></span>
          <span><strong>Adiwiyata <span>55</span></strong><small>SMAN 55 JAKARTA</small></span>
        </Link>
        <p className="auth-eyebrow">PEMULIHAN AKUN</p>
        <h1 id="recovery-heading">{isRequest ? 'Atur ulang kata sandi' : 'Buat kata sandi baru'}</h1>
        <p className="auth-description">
          {isRequest
            ? 'Masukkan email akun Anda. Jika terdaftar, kami akan mengirim tautan untuk membuat kata sandi baru.'
            : 'Masukkan kata sandi baru untuk akun Adiwiyata Anda.'}
        </p>

        {complete && isRequest ? (
          <div className="auth-success" role="status">
            <p>Jika email terdaftar, tautan pemulihan akan segera dikirim. Periksa kotak masuk dan folder spam.</p>
            <Link href="/sign-in">Kembali ke halaman masuk</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {isRequest ? (
              <label className="auth-field">
                <span>Email</span>
                <input autoComplete="email" maxLength={254} name="email" required type="email" />
              </label>
            ) : (
              <label className="auth-field">
                <span>Kata sandi baru</span>
                <span className="auth-password-control">
                  <input autoComplete="new-password" minLength={8} name="password" required type={showPassword ? 'text' : 'password'} />
                  <button
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    aria-pressed={showPassword}
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    type="button"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </span>
                <small>Gunakan minimal 8 karakter.</small>
              </label>
            )}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={pending} type="submit">
              {pending
                ? <LoaderCircle aria-hidden="true" className="auth-spinner" />
                : <>{isRequest ? 'Kirim tautan' : 'Simpan kata sandi'} <ArrowRight aria-hidden="true" /></>}
            </button>
          </form>
        )}

        <p className="auth-switch"><Link href="/sign-in">Kembali ke halaman masuk</Link></p>
        <p className="auth-security">Akun dan sesi dikelola secara aman oleh Neon Auth.</p>
      </section>
    </main>
  )
}
