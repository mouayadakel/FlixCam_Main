/**
 * @file phone-login-form.tsx
 * @description Sign in with phone + OTP. Sends OTP via /api/auth/otp/send, verifies via /api/auth/otp/verify, then signs in with phone-otp provider.
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import { sendOtpSchema } from '@/lib/validators/auth.validator'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import { getConfiguredPhonePlaceholder } from '@/lib/utils/contact-phone'

export interface PhoneLoginFormProps {
  onSuccess: () => void
  onSwitchToEmail: () => void
}

export function PhoneLoginForm({ onSuccess, onSwitchToEmail }: PhoneLoginFormProps) {
  const { toast } = useToast()
  const { t, isRtl } = useLocale()
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const phonePlaceholder = getConfiguredPhonePlaceholder()
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

  const handleSendOtp = useCallback(async () => {
    const parsed = sendOtpSchema.safeParse({ phone })
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors?.phone?.[0] ?? t('auth.invalidCredentials')
      setInlineError(msg)
      return
    }
    setInlineError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: parsed.data.phone }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : t('auth.failedSendCode')
        setInlineError(msg)
        toast({
          title: t('auth.loginError'),
          description: msg,
          variant: 'destructive',
        })
        return
      }
      setOtpSent(true)
      setResendTimer(60)
      toast({
        title: t('auth.otpAlmostThere'),
        description: t('auth.otpSentDescription'),
      })
    } catch (err) {
      setInlineError(t('auth.unexpectedError'))
      toast({
        title: t('auth.loginError'),
        description: t('auth.unexpectedError'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [phone, t, toast])

  const handleVerify = useCallback(async () => {
    const parsed = sendOtpSchema.safeParse({ phone })
    if (!parsed.success || otpValue.length !== 6) {
      setInlineError(isRtl ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter the 6-digit code')
      return
    }
    setInlineError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: parsed.data.phone,
          code: otpValue,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : t('auth.verificationFailed')
        setInlineError(msg)
        toast({
          title: t('auth.loginError'),
          description: msg,
          variant: 'destructive',
        })
        return
      }

      const oneTimeToken = data.oneTimeToken
      if (!oneTimeToken) {
        setInlineError(t('auth.verificationFailed'))
        return
      }

      const result = await signIn('phone-otp', {
        oneTimeToken,
        redirect: false,
      })

      if (result?.ok) {
        toast({
          title: t('auth.loginSuccess'),
          description: t('auth.redirecting'),
        })
        onSuccess()
      } else {
        setInlineError(t('auth.verificationFailed'))
        toast({
          title: t('auth.loginError'),
          description: t('auth.verificationFailed'),
          variant: 'destructive',
        })
      }
    } catch (err) {
      setInlineError(t('auth.unexpectedError'))
      toast({
        title: t('auth.loginError'),
        description: t('auth.unexpectedError'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [phone, otpValue, t, toast, onSuccess, isRtl])

  if (!otpSent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2" dir={EMBED_LTR}>
          <Label htmlFor="phone-login-phone" className="text-sm font-medium text-text-heading">
            {t('auth.phone')}
          </Label>
          <div
            className={cn(
              'flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              inlineError && 'border-error-500'
            )}
          >
            <PhoneInput
              id="phone-login-phone"
              international={false}
              defaultCountry="SA"
              countries={['SA']}
              addInternationalOption={false}
              placeholder={phonePlaceholder}
              value={phone}
              onChange={(val) => setPhone((val as string) ?? '')}
              disabled={isLoading}
              className="flex-1 PhoneInput no-country-select"
            />
          </div>
          {inlineError && (
            <p className="text-sm text-error-500" role="alert">
              {inlineError}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSendOtp}
          disabled={isLoading}
          className="h-12 w-full rounded-lg bg-brand-primary text-base font-semibold uppercase hover:bg-brand-primary-hover"
        >
          {isLoading ? (
            <>
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              {t('auth.sendingOtp')}
            </>
          ) : (
            t('auth.sendOtp')
          )}
        </Button>
        <button
          type="button"
          onClick={onSwitchToEmail}
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          {t('auth.signInWithEmail')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold text-text-heading">
          {t('auth.verifyTitle')}
        </h3>
        <p className="text-sm text-text-muted">
          {t('auth.codeSentTo')}{' '}
          <span className="font-semibold text-text-body" dir={EMBED_LTR}>
            *** *** {phone.replace(/\D/g, '').slice(-3)}
          </span>
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleVerify()
        }}
        className="flex flex-col gap-6 items-center"
      >
        <div className="flex flex-col items-center gap-2">
          <InputOTP
            maxLength={6}
            value={otpValue}
            onChange={setOtpValue}
            disabled={isLoading}
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
          disabled={isLoading || otpValue.length !== 6}
          className="w-full h-12 rounded-lg bg-brand-primary text-base font-semibold uppercase hover:bg-brand-primary-hover"
        >
          {isLoading ? (
            <>
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              {t('auth.verifying')}
            </>
          ) : (
            t('auth.signIn')
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-text-muted mb-2">
          {t('auth.didNotReceiveCode')}
        </p>
        <button
          type="button"
          disabled={resendTimer > 0 || isLoading}
          onClick={() => {
            setResendTimer(60)
            handleSendOtp()
          }}
          className="text-sm font-medium text-brand-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {resendTimer > 0
            ? t('auth.resendIn').replace('{seconds}', String(resendTimer))
            : t('auth.resendCode')}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setOtpSent(false)
          setOtpValue('')
          setInlineError(null)
        }}
        className="text-sm font-medium text-brand-primary hover:underline"
      >
        {t('auth.changeNumber')}
      </button>
    </div>
  )
}
