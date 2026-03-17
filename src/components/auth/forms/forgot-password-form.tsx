/**
 * @file forgot-password-form.tsx
 * @description Forgot password form with phone (primary) and email (secondary) recovery.
 * Used by auth modal. All steps (phone, OTP, reset password, success) stay in the same modal.
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import { sendOtpSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validators/auth.validator'
import { Loader2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ForgotPasswordFormProps {
  onBackToLogin: () => void
}

type PhoneStep = 'input' | 'otp' | 'reset' | 'success'

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const { toast } = useToast()
  const { t, isRtl } = useLocale()
  const [recoveryMethod, setRecoveryMethod] = useState<'phone' | 'email'>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [otpValue, setOtpValue] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(0)
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

  const handleSubmitPhone = useCallback(async () => {
    const parsed = sendOtpSchema.safeParse({ phone })
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors?.phone?.[0] ?? t('auth.invalidCredentials')
      setInlineError(msg)
      return
    }
    const formattedPhone = parsed.data.phone
    const payload = { phone: formattedPhone }
    setInlineError(null)
    setIsLoading(true)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ForgotPassword] Phone before format:', phone, '| after format:', formattedPhone)
      console.log('[ForgotPassword] Sending payload:', payload)
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ForgotPassword] API response:', { status: res.status, ok: res.ok, data })
      }

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : t('auth.unexpectedError')
        setInlineError(msg)
        toast({
          title: t('auth.loginError'),
          description: msg,
          variant: 'destructive',
        })
        if (data?.resetUrl && process.env.NODE_ENV !== 'production') {
          console.log('[ForgotPassword] Dev reset link:', data.resetUrl)
        }
        return
      }
      setSent(true)
      setSentTo(formattedPhone)
      setPhoneStep('otp')
      setResendTimer(60)
      toast({
        title: t('auth.otpAlmostThere'),
        description: t('auth.resetSentToPhone'),
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('auth.unexpectedError')
      if (process.env.NODE_ENV !== 'production') {
        console.error('[ForgotPassword] Caught error:', err)
      }
      setInlineError(errMsg)
      toast({
        title: t('auth.loginError'),
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [phone, t, toast])

  const handleSubmitEmail = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase()
    const parsed = forgotPasswordSchema.safeParse({ email: trimmedEmail })
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors?.email?.[0] ?? t('auth.invalidCredentials')
      setInlineError(msg)
      return
    }
    const payload = { email: parsed.data.email }
    setInlineError(null)
    setIsLoading(true)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ForgotPassword] Email payload:', payload)
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ForgotPassword] API response:', { status: res.status, ok: res.ok, data })
      }

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : t('auth.unexpectedError')
        setInlineError(msg)
        toast({
          title: t('auth.loginError'),
          description: msg,
          variant: 'destructive',
        })
        return
      }
      setSent(true)
      setSentTo(parsed.data.email)
      setResendTimer(60)
      toast({
        title: t('auth.checkYourEmail'),
        description: t('auth.resetSentToEmail'),
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('auth.unexpectedError')
      if (process.env.NODE_ENV !== 'production') {
        console.error('[ForgotPassword] Caught error:', err)
      }
      setInlineError(errMsg)
      toast({
        title: t('auth.loginError'),
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [email, t, toast])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInlineError(null)
    if (recoveryMethod === 'phone') {
      handleSubmitPhone()
    } else {
      handleSubmitEmail()
    }
  }

  const handleResend = useCallback(async () => {
    if (resendTimer > 0 || !sentTo) return
    setInlineError(null)
    setIsLoading(true)
    const body =
      recoveryMethod === 'phone' ? { phone: sentTo } : { email: sentTo }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ForgotPassword] Resend payload:', body)
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ForgotPassword] Resend API response:', { status: res.status, ok: res.ok, data })
      }

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : t('auth.unexpectedError')
        setInlineError(msg)
        toast({
          title: t('auth.loginError'),
          description: msg,
          variant: 'destructive',
        })
        if (data?.resetUrl && process.env.NODE_ENV !== 'production') {
          console.log('[ForgotPassword] Dev reset link:', data.resetUrl)
        }
        return
      }
      setResendTimer(60)
      toast({
        title: t('auth.otpAlmostThere'),
        description:
          recoveryMethod === 'phone' ? t('auth.resetSentToPhone') : t('auth.resetSentToEmail'),
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('auth.unexpectedError')
      if (process.env.NODE_ENV !== 'production') {
        console.error('[ForgotPassword] Resend caught error:', err)
      }
      setInlineError(errMsg)
      toast({
        title: t('auth.loginError'),
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [resendTimer, recoveryMethod, sentTo, t, toast])

  const handleSwitchMethod = () => {
    setRecoveryMethod((prev) => (prev === 'phone' ? 'email' : 'phone'))
    setInlineError(null)
    setSent(false)
    setSentTo(null)
    setPhoneStep('input')
    setOtpValue('')
    setResetToken(null)
  }

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!sentTo || otpValue.length !== 6) return
      setInlineError(null)
      setIsLoading(true)
      try {
        const res = await fetch('/api/auth/forgot-password/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: sentTo, code: otpValue }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setInlineError(typeof data?.error === 'string' ? data.error : t('auth.unexpectedError'))
          return
        }
        const token = data.resetToken ?? (data.redirectUrl ? new URL(data.redirectUrl).searchParams.get('token') : null)
        if (token) {
          setResetToken(token)
          setPhoneStep('reset')
          setOtpValue('')
          setInlineError(null)
        } else {
          setInlineError(t('auth.unexpectedError'))
        }
      } catch (err) {
        setInlineError(err instanceof Error ? err.message : t('auth.unexpectedError'))
      } finally {
        setIsLoading(false)
      }
    },
    [sentTo, otpValue, t]
  )

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setPasswordError(null)
      setConfirmError(null)
      const parsed = resetPasswordSchema.safeParse({
        password: newPassword,
        confirmPassword,
        token: resetToken ?? '',
      })
      if (!parsed.success) {
        const err = parsed.error.flatten()
        if (err.fieldErrors.password?.[0]) setPasswordError(err.fieldErrors.password[0])
        if (err.fieldErrors.confirmPassword?.[0]) setConfirmError(err.fieldErrors.confirmPassword[0])
        return
      }
      if (!resetToken) {
        setInlineError(t('auth.missingToken'))
        return
      }
      setIsLoading(true)
      setInlineError(null)
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, password: newPassword }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setInlineError(typeof data?.error === 'string' ? data.error : t('auth.unexpectedError'))
          return
        }
        setPhoneStep('success')
        toast({
          title: t('auth.passwordUpdated'),
          description: t('auth.canSignInNow'),
        })
      } catch (err) {
        setInlineError(err instanceof Error ? err.message : t('auth.unexpectedError'))
      } finally {
        setIsLoading(false)
      }
    },
    [newPassword, confirmPassword, resetToken, t, toast]
  )

  const handleBackToOtp = () => {
    setResetToken(null)
    setPhoneStep('otp')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setConfirmError(null)
    setInlineError(null)
  }

  const handleChangePhone = () => {
    setSent(false)
    setSentTo(null)
    setOtpValue('')
    setResetToken(null)
    setPhoneStep('input')
    setInlineError(null)
  }

  if (phoneStep === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2 text-center">
          <p className="text-base font-medium text-text-heading">{t('auth.passwordUpdated')}</p>
          <p className="text-sm text-text-muted" dir={isRtl ? 'rtl' : 'ltr'}>
            {t('auth.canSignInNow')}
          </p>
        </div>
        <Button
          type="button"
          onClick={onBackToLogin}
          className="h-12 w-full rounded-lg bg-brand-primary text-base font-semibold uppercase hover:bg-brand-primary-hover"
        >
          {t('auth.backToLogin')}
        </Button>
      </div>
    )
  }

  if (phoneStep === 'reset' && resetToken) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm font-medium text-text-heading">{t('auth.setNewPassword')}</p>
        <p className="text-center text-sm text-text-muted" dir={isRtl ? 'rtl' : 'ltr'}>
          {t('auth.setNewPasswordDesc')}
        </p>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-new-password" className="text-sm font-medium text-text-heading">
              {t('auth.newPassword')}
            </Label>
            <PasswordInput
              id="forgot-new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setPasswordError(null)
              }}
              disabled={isLoading}
              autoComplete="new-password"
              placeholder={t('auth.passwordPlaceholder')}
              className={cn(
                'h-12 rounded-lg border-border-input px-4 py-3 text-base',
                passwordError && 'border-error-500 focus-visible:ring-error-500'
              )}
              aria-describedby={passwordError ? 'forgot-password-error' : undefined}
            />
            {passwordError && (
              <p id="forgot-password-error" className="text-sm text-error-500" role="alert">
                {passwordError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="forgot-confirm-password" className="text-sm font-medium text-text-heading">
              {t('auth.confirmPassword')}
            </Label>
            <PasswordInput
              id="forgot-confirm-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setConfirmError(null)
              }}
              disabled={isLoading}
              autoComplete="new-password"
              placeholder={t('auth.confirmPassword')}
              className={cn(
                'h-12 rounded-lg border-border-input px-4 py-3 text-base',
                confirmError && 'border-error-500 focus-visible:ring-error-500'
              )}
              aria-describedby={confirmError ? 'forgot-confirm-error' : undefined}
            />
            {confirmError && (
              <p id="forgot-confirm-error" className="text-sm text-error-500" role="alert">
                {confirmError}
              </p>
            )}
          </div>
          {inlineError && (
            <p className="text-sm text-error-500" role="alert">
              {inlineError}
            </p>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-lg bg-brand-primary text-base font-semibold uppercase hover:bg-brand-primary-hover"
          >
            {isLoading ? (
              <>
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                {t('auth.loading')}
              </>
            ) : (
              t('auth.updatePassword')
            )}
          </Button>
        </form>
        <button
          type="button"
          onClick={handleBackToOtp}
          className="flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.back')}
        </button>
      </div>
    )
  }

  if (sent && recoveryMethod === 'phone' && sentTo && phoneStep === 'otp') {
    const masked = `*** *** ${sentTo.replace(/\D/g, '').slice(-3)}`
    return (
      <div className="flex flex-col gap-6 pt-2">
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold text-text-heading">{t('auth.verifyTitle')}</h3>
          <p className="text-sm text-text-muted">
            {t('auth.codeSentTo')} <br />
            <span className="font-semibold text-text-body" dir="ltr">
              {masked}
            </span>
          </p>
        </div>
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6 items-center">
          <div className="flex flex-col items-center gap-2">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={setOtpValue}
              disabled={isLoading}
              autoFocus
            >
              <InputOTPGroup dir="ltr">
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
              t('auth.verifyButton')
            )}
          </Button>
        </form>
        <div className="text-center">
          <p className="text-sm text-text-muted mb-2">{t('auth.didNotReceiveCode')}</p>
          <button
            type="button"
            disabled={resendTimer > 0 || isLoading}
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
          onClick={handleChangePhone}
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          {t('auth.changeNumber')}
        </button>
      </div>
    )
  }

  if (sent && recoveryMethod === 'email') {
    const masked = sentTo ? sentTo.replace(/(.{2})(.*)(@.*)/, '$1***$3') : ''
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2 text-center">
          <p className="text-sm text-text-muted" dir={isRtl ? 'rtl' : 'ltr'}>
            {t('auth.resetSentToEmail')}
          </p>
          {masked && (
            <p className="text-sm font-semibold text-text-body" dir="ltr">
              {masked}
            </p>
          )}
        </div>
        <div className="text-center">
          <button
            type="button"
            disabled={resendTimer > 0 || isLoading}
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
          onClick={onBackToLogin}
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          {t('auth.backToLogin')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {recoveryMethod === 'phone' ? (
          <div className="space-y-2" dir="ltr">
            <Label
              htmlFor="forgot-phone"
              className="text-sm font-medium text-text-heading"
            >
              {t('auth.phone')}
            </Label>
            <div
              className={cn(
                'flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                inlineError && 'border-error-500 focus-within:ring-error-500'
              )}
            >
              <PhoneInput
                id="forgot-phone"
                international={false}
                defaultCountry="SA"
                countries={['SA']}
                addInternationalOption={false}
                placeholder="05XXXXXXXX"
                value={phone}
                onChange={(val) => setPhone((val as string) ?? '')}
                disabled={isLoading}
                className="flex-1 PhoneInput no-country-select"
                aria-describedby={inlineError ? 'forgot-phone-error' : undefined}
              />
            </div>
            {inlineError && (
              <p
                id="forgot-phone-error"
                className="text-sm text-error-500"
                role="alert"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {inlineError}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label
              htmlFor="forgot-email"
              className="text-sm font-medium text-text-heading"
            >
              {t('auth.email')}
            </Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={cn(
                'h-12 rounded-lg border-border-input px-4 py-3 text-base',
                inlineError && 'border-error-500 focus-visible:ring-error-500'
              )}
              aria-describedby={inlineError ? 'forgot-email-error' : undefined}
            />
            {inlineError && (
              <p
                id="forgot-email-error"
                className="text-sm text-error-500"
                role="alert"
              >
                {inlineError}
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full rounded-lg bg-brand-primary text-base font-semibold uppercase hover:bg-brand-primary-hover"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              {t('auth.loading')}
            </>
          ) : recoveryMethod === 'phone' ? (
            t('auth.sendOtp')
          ) : (
            t('auth.sendResetLink')
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={handleSwitchMethod}
        className="text-sm font-medium text-brand-primary hover:underline"
      >
        {recoveryMethod === 'phone'
          ? t('auth.useEmailInstead')
          : t('auth.usePhoneInstead')}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="text-sm font-medium text-brand-primary hover:underline"
      >
        {t('auth.backToLogin')}
      </button>
    </div>
  )
}
