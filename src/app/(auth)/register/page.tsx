/**
 * @file page.tsx
 * @description Register page with shared RegisterForm and OtpForm, role-based redirect after OTP.
 * @module app/(auth)/register
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { RegisterForm, OtpForm } from '@/components/auth/forms'

function isSameOrigin(url: string): boolean {
  if (typeof window === 'undefined') return false
  if (!url || !url.startsWith('/') || url.startsWith('//')) return false
  try {
    const base = window.location.origin
    const full = new URL(url, base).href
    return full.startsWith(base)
  } catch {
    return false
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [language, setLanguage] = useState<'ar' | 'en'>('ar')
  const [step, setStep] = useState<'register' | 'otp'>('register')
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null)
  const [pendingRegistrationToken, setPendingRegistrationToken] = useState<string | null>(null)
  const { t } = useLocale()

  const callbackUrl = searchParams?.get('callbackUrl') ?? undefined

  const handleOtpSuccess = async () => {
    const session = await getSession()
    if (callbackUrl && isSameOrigin(callbackUrl)) {
      router.push(callbackUrl)
      return
    }
    const role = session?.user?.role as string | undefined
    if (role === 'CUSTOMER' || role === 'DATA_ENTRY') {
      router.push('/portal/dashboard')
      return
    }
    if (role === 'VENDOR') {
      router.push('/vendor/dashboard')
      return
    }
    router.push('/admin/dashboard')
  }

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-neutral-50"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary-600">
            {step === 'otp'
              ? t('auth.verifyTitle')
              : t('auth.registerTab')}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="h-9 w-9"
            aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Languages className="h-5 w-5" />
          </Button>
        </div>

        {step === 'register' && (
          <RegisterForm
            onOtpRequired={({ registrationToken, phone }) => {
              setPendingRegistrationToken(registrationToken)
              setOtpSentTo(phone)
              setStep('otp')
            }}
            onSwitchToLogin={() => router.push('/login')}
          />
        )}

        {step === 'otp' && pendingRegistrationToken && otpSentTo && (
          <OtpForm
            registrationToken={pendingRegistrationToken}
            phone={otpSentTo}
            onSuccess={handleOtpSuccess}
            onBack={() => setStep('register')}
          />
        )}

        {step === 'register' && (
          <div className="text-center text-sm text-neutral-600 pt-4 border-t border-neutral-100">
            <p>
              {t('auth.haveAccount')}{' '}
              <a
                href="/login"
                className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  router.push('/login')
                }}
              >
                {t('auth.logIn')}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
