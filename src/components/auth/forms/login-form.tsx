/**
 * @file login-form.tsx
 * @description Shared login form: email, password, keep signed in, forgot link, Google sign-in.
 * Includes option to sign in with phone + OTP.
 * Used by auth modal and /login page.
 */

'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import { loginSchema, type LoginFormData } from '@/lib/validators/auth.validator'
import { PhoneLoginForm } from './phone-login-form'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoginFormProps {
  onSuccess: () => void
  onSwitchToRegister: () => void
  callbackUrl?: string
  /** When true, forgot password link closes the modal (e.g. in auth modal). */
  onForgotPasswordClick?: () => void
  /** Pre-fill email (e.g. from ?email= on login page). */
  defaultEmail?: string
}

export function LoginForm({
  onSuccess,
  onSwitchToRegister,
  callbackUrl,
  onForgotPasswordClick,
  defaultEmail,
}: LoginFormProps) {
  const { toast } = useToast()
  const { t, isRtl } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [usePhoneLogin, setUsePhoneLogin] = useState(false)
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail ?? '', password: '' },
  })

  useEffect(() => {
    if (defaultEmail) form.setValue('email', defaultEmail)
  }, [defaultEmail, form])

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        otp: needsTwoFactor ? otpCode : undefined,
        redirect: false,
      })
      if (result?.error) {
        console.error('[LOGIN FORM] Sign in failed:', result?.error)
        if (result.error === 'TwoFactorRequired') {
          setNeedsTwoFactor(true)
          toast({
            title: t('auth.twoFA'),
            description: t('auth.twoFADesc'),
          })
          return
        }
        if (result.error === 'InvalidTwoFactorCode') {
          toast({
            title: t('auth.loginError'),
            description: isRtl ? 'رمز المصادقة الثنائية غير صحيح' : 'Invalid 2FA code',
            variant: 'destructive',
          })
          return
        }
        if (result.error === 'AccountNotVerified') {
          toast({
            title: t('auth.accountNotVerified'),
            description: t('auth.accountNotVerifiedDesc'),
            variant: 'destructive',
          })
          return
        }
        const message = result.error
        const enMsg =
          message === 'Too many requests. Please try again later.'
            ? 'Too many requests. Please try again later.'
            : message.includes('locked')
              ? t('auth.accountLocked')
              : t('auth.invalidCredentials')
        const arMsg =
          message === 'Too many requests. Please try again later.'
            ? 'محاولات كثيرة. انتظر ثم حاول مجدداً.'
            : message.includes('locked')
              ? t('auth.accountLocked')
              : t('auth.invalidCredentials')
        toast({
          title: isRtl ? arMsg : enMsg,
          description: isRtl ? enMsg : arMsg,
          variant: 'destructive',
        })
        return
      }
      if (result?.ok) {
        toast({
          title: t('auth.loginSuccess'),
          description: t('auth.redirecting'),
        })
        onSuccess()
      }
    } catch (err) {
      console.error('[LOGIN FORM] Sign in failed:', err)
      toast({
        title: t('auth.loginError'),
        description: t('auth.defaultError'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    setGoogleLoading(true)
    const url =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '/'
    const destination = callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
      ? callbackUrl
      : url
    signIn('google', { callbackUrl: destination })
  }

  if (usePhoneLogin) {
    return (
      <div className="flex flex-col gap-4">
        <PhoneLoginForm
          onSuccess={onSuccess}
          onSwitchToEmail={() => setUsePhoneLogin(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-sm font-medium text-text-heading">
            {t('auth.usernameLabel')}
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.usernamePlaceholder')}
            disabled={isLoading}
            className={cn(
              'h-12 rounded-lg border-border-input px-4 py-3 text-base',
              form.formState.errors.email &&
                'border-error-500 focus-visible:ring-error-500'
            )}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-error-500" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-sm font-medium text-text-heading">
            {t('auth.password')}
          </Label>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            disabled={isLoading}
            className={cn(
              'h-12 rounded-lg border-border-input px-4 py-3 text-base',
              form.formState.errors.password &&
                'border-error-500 focus-visible:ring-error-500'
            )}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-error-500" role="alert">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        {needsTwoFactor && (
          <div className="space-y-2">
            <Label htmlFor="login-otp" className="text-sm font-medium text-text-heading">
              {t('auth.twoFA')}
            </Label>
            <Input
              id="login-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              disabled={isLoading}
              className="h-12 rounded-lg border-border-input px-4 py-3 text-base"
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-body">
            <Checkbox
              checked={keepSignedIn}
              onCheckedChange={(v) => setKeepSignedIn(v === true)}
            />
            {t('auth.keepMeSignedIn')}
          </label>
          {onForgotPasswordClick ? (
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              {t('auth.forgotPassword')}
            </button>
          ) : (
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          )}
        </div>
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
          ) : (
            t('auth.signIn')
          )}
        </Button>
      </form>

      <div className="hidden space-y-4 pt-2">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border-light" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-text-muted">
              {t('auth.quickAccessWith')}
            </span>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-white transition-opacity hover:opacity-90 disabled:opacity-70"
            aria-label="Google"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-text-body">
        {t('auth.noAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-medium text-brand-primary hover:underline"
        >
          {t('auth.registerLink')}
        </button>
      </p>
      <p className="text-center text-sm text-text-body">
        <button
          type="button"
          onClick={() => setUsePhoneLogin(true)}
          className="font-medium text-brand-primary hover:underline"
        >
          {t('auth.signInWithPhone')}
        </button>
      </p>
    </div>
  )
}
