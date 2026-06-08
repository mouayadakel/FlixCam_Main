/**
 * @file otp-form.tsx
 * @description Shared OTP verification form: 6-digit input, resend with countdown, verify and complete.
 * Used by auth modal and /register page after registration requires OTP.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/use-locale'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Loader2 } from 'lucide-react'
import { EMBED_LTR } from '@/lib/i18n/bidi'

export interface OtpFormProps {
  registrationToken: string
  phone: string
  onSuccess: () => void
  onBack: () => void
}

/** Mask E.164 phone to show last 3 digits: +966 *** *** 789 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 3) return phone
  const last3 = digits.slice(-3)
  const rest = digits.slice(0, -3)
  const grouped =
    rest.length <= 3
      ? rest
      : rest.length <= 6
        ? `${rest.slice(0, 3)} ${rest.slice(3)}`
        : `${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`
  const prefix = phone.startsWith('+') ? '+' : ''
  return `${prefix}${grouped.replace(/\d/g, '*')} ${last3}`
}

export function OtpForm({ registrationToken, phone, onSuccess, onBack }: OtpFormProps) {
  const { t, isRtl } = useLocale()
  const [otpValue, setOtpValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [tooManyAttempts, setTooManyAttempts] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      if (mounted.current) setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (tooManyAttempts || otpValue.length !== 6) return
      setInlineError(null)
      setIsLoading(true)
      try {
        const res = await fetch('/api/auth/verify-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationToken, otpCode: otpValue }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          console.error('[OTP FORM] Verification failed:', data)
          const msg =
            typeof data?.error === 'string'
              ? data.error
              : isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'
          if (
            msg.toLowerCase().includes('too many') ||
            msg.toLowerCase().includes('cancelled')
          ) {
            setTooManyAttempts(true)
            setInlineError(t('auth.tooManyAttemptsOtp'))
          } else {
            setInlineError(msg)
          }
          return
        }

        const oneTimeToken = data.oneTimeToken
        if (!oneTimeToken) {
          setInlineError('Verification succeeded but no token received.')
          return
        }

        const result = await signIn('phone-otp', {
          oneTimeToken,
          redirect: false,
        })
        if (result?.ok) {
          onSuccess()
        } else {
          setInlineError(t('auth.verificationFailed'))
        }
      } catch (err) {
        setInlineError(t('auth.unexpectedError'))
      } finally {
        setIsLoading(false)
      }
    },
    [registrationToken, otpValue, tooManyAttempts, onSuccess, t, isRtl]
  )

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return
    setIsLoading(true)
    setInlineError(null)
    try {
      const res = await fetch('/api/auth/register/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationToken }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInlineError(
          typeof json?.error === 'string' ? json.error : t('auth.unexpectedError')
        )
        return
      }
      setResendTimer(60)
    } finally {
      setIsLoading(false)
    }
  }, [registrationToken, resendTimer, t])

  const masked = maskPhone(phone)

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold text-text-heading">
          {t('auth.verifyTitle')}
        </h3>
        <p className="text-sm text-text-muted">
          {t('auth.codeSentTo')} <br />
          <span className="font-semibold text-text-body" dir={EMBED_LTR}>
            {masked}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 items-center">
        <div className="flex flex-col items-center gap-2">
          <InputOTP
            maxLength={6}
            value={otpValue}
            onChange={setOtpValue}
            disabled={isLoading || tooManyAttempts}
            autoFocus
          >
            <InputOTPGroup dir={EMBED_LTR}>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          {inlineError && (
            <p className="text-sm text-error-500 text-center" role="alert">
              {inlineError}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || otpValue.length !== 6 || tooManyAttempts}
          className="w-full bg-brand-primary text-base font-semibold uppercase hover:bg-brand-primary-hover"
        >
          {isLoading ? (
            <>
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              {t('auth.verifying')}
            </>
          ) : (
            t('auth.verifyButton')
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-text-muted mb-2">
          {t('auth.didNotReceiveCode')}
        </p>
        <button
          type="button"
          disabled={resendTimer > 0 || isLoading || tooManyAttempts}
          onClick={handleResend}
          className="text-sm font-medium text-brand-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {resendTimer > 0
            ? t('auth.resendIn').replace('{seconds}', String(resendTimer))
            : t('auth.resendCode')}
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-brand-primary hover:underline"
      >
        {t('auth.changeNumber')}
      </button>
    </div>
  )
}
