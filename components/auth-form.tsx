'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { AdiwiyataLogoMark } from '@/components/adiwiyata/logo-mark'
import { TurnstileWidget, type TurnstileStatus, type TurnstileWidgetHandle } from '@/components/turnstile-widget'
import { authClient } from '@/lib/auth/client'

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up'
}

function getAuthErrorMessage(error: unknown, mode: AuthFormProps['mode']) {
  if (error && typeof error === 'object') {
    const details = error as { status?: unknown; code?: unknown }

    if (mode === 'sign-in' && (details.status === 401 || details.code === 'INVALID_EMAIL_OR_PASSWORD')) {
      return 'Email atau kata sandi tidak cocok. Jika biasanya masuk dengan Google, pilih “Lanjutkan dengan Google” menggunakan email yang sama. Jika memakai kata sandi, coba “Lupa kata sandi?”.'
    }

    if (mode === 'sign-up' && (details.status === 409 || details.code === 'USER_ALREADY_EXISTS')) {
      // M-04: jangan mengonfirmasi apakah email sudah terdaftar.
      return 'Periksa inbox Anda untuk kode verifikasi. Jika email ini sudah terdaftar, silakan masuk dengan akun tersebut.'
    }

    if (details.status === 403 || details.code === 'INVALID_ORIGIN') {
      return 'Domain situs belum diizinkan oleh Neon Auth. Muat ulang halaman atau hubungi admin.'
    }
  }

  return 'Layanan autentikasi sedang tidak tersedia. Silakan coba kembali.'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')
  // M-04: jeda kirim ulang OTP agar tombol tidak bisa ditekan berulang
  // (spam OTP ke inbox korban / kuras kuota email).
  const [resendCooldown, setResendCooldown] = useState(0)
  // Cloudflare Turnstile: token sekali pakai dari widget; diverifikasi
  // server sebelum sign-in/sign-up. Bila widget gagal dimuat, alur
  // tetap jalan (fail-open) — proteksi penuh aktif saat token ada.
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)
  const turnstileTokenRef = useRef<string | null>(null)
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>('loading')

  function handleTurnstileToken(token: string | null) {
    turnstileTokenRef.current = token
  }

  async function verifyTurnstile(): Promise<boolean> {
    if (turnstileStatus === 'error') return true
    let token = turnstileTokenRef.current
    if (!token) {
      // Widget Managed menerbitkan token otomatis setelah render;
      // tunggu sebentar sebelum menyerah (fail-open bila tak kunjung ada).
      const deadline = Date.now() + 5000
      while (!turnstileTokenRef.current && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      token = turnstileTokenRef.current
      if (!token) return true
    }
    try {
      const res = await fetch('/api/auth/turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await res.json()) as { ok?: boolean }
      if (res.ok && data.ok) return true
    } catch {
      return true
    }
    setError('Verifikasi keamanan gagal. Silakan coba lagi.')
    turnstileRef.current?.reset()
    return false
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])
  const isSignUp = mode === 'sign-up'

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !verificationEmail) return

    const formData = new FormData(event.currentTarget)
    const otp = String(formData.get('otp') ?? '').trim()
    setPending(true)
    setError('')
    setVerificationNotice('')

    try {
      const result = await authClient.emailOtp.verifyEmail({ email: verificationEmail, otp })
      if (result.error || !result.data?.status) {
        setError('Kode verifikasi salah atau sudah kedaluwarsa. Periksa kembali atau kirim kode baru.')
        return
      }
      setVerificationSent(false)
      setVerificationComplete(true)
    } catch {
      setError('Kode verifikasi belum dapat diproses. Periksa kembali atau kirim kode baru.')
    } finally {
      setPending(false)
    }
  }

  async function handleResendVerification() {
    if (pending || !verificationEmail || resendCooldown > 0) return

    setPending(true)
    setError('')
    setVerificationNotice('')

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: verificationEmail,
        type: 'email-verification',
      })
      if (result.error) throw result.error
      setResendCooldown(60)
      setVerificationNotice('Kode verifikasi baru sudah dikirim. Periksa juga folder spam.')
    } catch {
      setError('Kode baru belum berhasil dikirim. Silakan coba lagi.')
    } finally {
      setPending(false)
    }
  }

  async function handleGoogleSignIn() {
    if (pending || googlePending) return

    setGooglePending(true)
    setError('')

    try {
      if (!(await verifyTurnstile())) return
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
      if (result.error) setError(getAuthErrorMessage(result.error, mode))
    } catch (authError) {
      setError(getAuthErrorMessage(authError, mode))
    } finally {
      setGooglePending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')

    setPending(true)
    setError('')

    try {
      if (!(await verifyTurnstile())) return
      const result = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })

      if (result.error) {
        // Token Turnstile sekali pakai: segarkan untuk percobaan berikut.
        turnstileRef.current?.reset()
        setError(getAuthErrorMessage(result.error, mode))
        return
      }

      if (isSignUp) {
        // PERBAIKAN: sebelumnya form OTP langsung tampil tanpa kode
        // pernah dikirim (sendVerificationOtp hanya dipanggil saat
        // "Kirim ulang"). Kirim kode pertama di sini; bila gagal,
        // tetap tampilkan form OTP agar pengguna bisa memakai tombol
        // kirim ulang.
        setVerificationEmail(email)
        try {
          const otpResult = await authClient.emailOtp.sendVerificationOtp({
            email,
            type: 'email-verification',
          })
          if (otpResult.error) throw otpResult.error
          setVerificationNotice('Kode verifikasi sudah dikirim. Periksa juga folder spam.')
        } catch {
          setVerificationNotice('Kode verifikasi belum berhasil dikirim. Coba "Kirim ulang kode".')
        }
        setVerificationSent(true)
        return
      }

      router.replace('/')
      router.refresh()
    } catch (authError) {
      setError(getAuthErrorMessage(authError, mode))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <Link className="auth-brand" href="/" aria-label="Adiwiyata 55 SMAN 55 Jakarta">
          <span className="brand-emblem"><AdiwiyataLogoMark /></span>
          <span><strong>Adiwiyata <span>55</span></strong><small>SMAN 55 JAKARTA</small></span>
        </Link>
        <p className="auth-eyebrow">PORTAL ADIWIYATA</p>
        <h1 id="auth-heading">
          {verificationComplete ? 'Email terverifikasi' : verificationSent ? 'Verifikasi email' : isSignUp ? 'Buat akun' : 'Selamat datang kembali'}
        </h1>
        <p className="auth-description">
          {verificationComplete
            ? 'Akun Anda siap digunakan. Masuk untuk melanjutkan ke portal Adiwiyata.'
            : verificationSent
              ? 'Masukkan kode yang dikirim ke alamat email yang Anda daftarkan.'
              : isSignUp
                ? 'Daftar untuk masuk ke portal edukasi Adiwiyata SMAN 55 Jakarta.'
                : 'Masuk untuk melanjutkan ke portal edukasi Adiwiyata.'}
        </p>

        {verificationComplete ? (
          <div className="auth-success" role="status">
            <p>Email berhasil diverifikasi. Sekarang Anda dapat masuk ke portal Adiwiyata.</p>
            <Link href="/sign-in">Lanjut ke halaman masuk</Link>
          </div>
        ) : verificationSent ? (
          <>
            <div className="auth-success" role="status">
              <p>Kode verifikasi telah dikirim ke <strong>{verificationEmail}</strong>. Masukkan kode dari email untuk mengaktifkan akun.</p>
            </div>
            <form className="auth-form" onSubmit={handleVerifyEmail}>
              <label className="auth-field">
                <span>Kode verifikasi</span>
                <input autoComplete="one-time-code" inputMode="numeric" maxLength={12} name="otp" required type="text" />
                <small>Periksa kotak masuk dan folder spam.</small>
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              {verificationNotice && <p className="auth-verification-note" role="status">{verificationNotice}</p>}
              <button className="auth-submit" disabled={pending} type="submit">
                {pending ? <LoaderCircle aria-hidden="true" className="auth-spinner" /> : <>Verifikasi email <ArrowRight aria-hidden="true" /></>}
              </button>
            </form>
            <p className="auth-switch">
              Tidak menerima kode?{' '}
              <button className="auth-resend-button" disabled={pending || resendCooldown > 0} onClick={handleResendVerification} type="button">
                {resendCooldown > 0 ? `Kirim ulang kode (${resendCooldown} dtk)` : 'Kirim ulang kode'}
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="auth-social">
              <button
                className="auth-google"
                disabled={pending || googlePending}
                onClick={handleGoogleSignIn}
                type="button"
              >
                {googlePending && <LoaderCircle aria-hidden="true" className="auth-spinner" />}
                Lanjutkan dengan Google
              </button>
              <div className="auth-divider"><span>atau dengan email</span></div>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <label className="auth-field">
              <span>Nama lengkap</span>
              <input autoComplete="name" maxLength={80} name="name" required type="text" />
            </label>
          )}
          <label className="auth-field">
            <span>Email</span>
            <input autoComplete="email" maxLength={254} name="email" required type="email" />
          </label>
          <label className="auth-field">
            <span>Kata sandi</span>
            <span className="auth-password-control">
              <input autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={8} name="password" required type={showPassword ? 'text' : 'password'} />
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
            {isSignUp && <small>Gunakan minimal 8 karakter.</small>}
          </label>
          {!isSignUp && <p className="auth-recovery-link"><Link href="/forgot-password">Lupa kata sandi?</Link></p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <TurnstileWidget ref={turnstileRef} onToken={handleTurnstileToken} onStatus={setTurnstileStatus} />
          <p className="auth-turnstile-note">Dilindungi Cloudflare Turnstile.</p>
          <button className="auth-submit" disabled={pending || googlePending} type="submit">
            {pending ? <LoaderCircle aria-hidden="true" className="auth-spinner" /> : <>{isSignUp ? 'Buat akun' : 'Masuk'} <ArrowRight aria-hidden="true" /></>}
          </button>
            </form>
          </>
        )}

        {!verificationSent && !verificationComplete && (
          <p className="auth-switch">
            {isSignUp ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'}{' '}
            <Link href={isSignUp ? '/sign-in' : '/sign-up'}>
              {isSignUp ? 'Masuk' : 'Daftar'}
            </Link>
          </p>
        )}
        <p className="auth-security">Akun dan sesi dikelola secara aman oleh Neon Auth.</p>
      </section>
    </main>
  )
}
