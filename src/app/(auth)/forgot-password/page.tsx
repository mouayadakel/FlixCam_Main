/**
 * Forgot password – phone (OTP) or email recovery.
 * Uses the full ForgotPasswordForm with OTP input, reset password, and success steps.
 */

'use client'

import { useRouter } from 'next/navigation'
import { ForgotPasswordForm } from '@/components/auth/forms'
import { useLocale } from '@/hooks/use-locale'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { t } = useLocale()

  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <h1 className="mb-4 text-2xl font-bold">{t('auth.forgotPassword')}</h1>
      <p className="mb-6 text-muted-foreground">{t('auth.forgotPasswordDesc')}</p>
      <div className="rounded-lg border border-border-light bg-white p-6 shadow-sm">
        <ForgotPasswordForm onBackToLogin={() => router.push('/login')} />
      </div>
    </main>
  )
}
