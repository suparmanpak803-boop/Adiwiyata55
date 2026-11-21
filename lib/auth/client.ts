// Klien Neon Auth sisi browser (Better Auth React client).
// Dipakai components/auth-form.tsx dan components/auth-recovery-form.tsx:
// signUp.email, signIn.email, signIn.social({ provider: 'google' }),
// emailOtp.sendVerificationOtp / verifyEmail, requestPasswordReset,
// resetPassword, signOut.
'use client'

import { createAuthClient } from '@neondatabase/auth/next'

export const authClient = createAuthClient()
