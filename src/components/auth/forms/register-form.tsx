/**
 * @file register-form.tsx
 * @description Shared register form: name, email, phone, password, confirm. Used by auth modal and /register page.
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import {
  registerFormSchema,
  type RegisterFormData,
} from '@/lib/validators/auth.validator'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import { getConfiguredPhonePlaceholder } from '@/lib/utils/contact-phone'

export interface RegisterFormProps {
  onOtpRequired: (data: { registrationToken: string; phone: string }) => void
  onSwitchToLogin: () => void
}

export function RegisterForm({
  onOtpRequired,
  onSwitchToLogin,
}: RegisterFormProps) {
  const { toast } = useToast()
  const { t, isRtl } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const phonePlaceholder = getConfiguredPhonePlaceholder()

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
  })

  const handleSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name?.trim() || undefined,
          phoneNumber: data.phoneNumber,
        }),
      })
      const dataRes = await res.json().catch(() => ({}))
      const message = typeof dataRes?.error === 'string' ? dataRes.error : null

      if (!res.ok) {
        console.error('[REGISTER FORM] Server error:', dataRes)
        toast({
          title: isRtl ? 'خطأ في التسجيل' : 'Registration Error',
          description: message ?? (isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'),
          variant: 'destructive',
        })
        return
      }

      if (dataRes.requireOtp) {
        if (dataRes.registrationToken) {
          onOtpRequired({
            registrationToken: dataRes.registrationToken,
            phone: dataRes.phone ?? data.phoneNumber,
          })
          toast({
            title: t('auth.otpAlmostThere'),
            description: t('auth.otpSentDescription'),
          })
        } else {
          toast({
            title: isRtl ? 'خطأ في التسجيل' : 'Registration Error',
            description: isRtl ? 'لم يتم إرسال رمز التحقق. حاول مرة أخرى.' : 'Verification code could not be sent. Please try again.',
            variant: 'destructive',
          })
        }
        return
      }

      toast({
        title: t('auth.accountCreated'),
        description: t('auth.redirecting'),
      })
      onSwitchToLogin()
    } catch (err) {
      console.error('[REGISTER FORM] Request failed:', err)
      toast({
        title: t('auth.registrationError'),
        description: t('auth.unexpectedError'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="register-name" className="text-sm font-medium">
            {t('auth.name')}
          </Label>
          <Input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder={t('auth.namePlaceholder')}
            disabled={isLoading}
            className={cn(
              'px-4 py-3 text-base',
              form.formState.errors.name &&
                'border-error-500 focus-visible:ring-error-500'
            )}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-error-500" role="alert">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email" className="text-sm font-medium">
            {t('auth.email')}
          </Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            disabled={isLoading}
            className={cn(
              'px-4 py-3 text-base',
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
        <div className="space-y-2" dir={EMBED_LTR}>
          <Label htmlFor="register-phone" className="text-sm font-medium">
            {t('auth.phone')}
          </Label>
          <div
            className={cn(
              'flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              form.formState.errors.phoneNumber &&
                'border-error-500 focus-within:ring-error-500'
            )}
          >
            <PhoneInput
              id="register-phone"
              international={false}
              defaultCountry="SA"
              countries={['SA']}
              addInternationalOption={false}
              placeholder={phonePlaceholder}
              value={form.watch('phoneNumber')}
              onChange={(val) => form.setValue('phoneNumber', val as string)}
              disabled={isLoading}
              className="flex-1 PhoneInput no-country-select"
            />
          </div>
          {form.formState.errors.phoneNumber && (
            <p
              className="text-sm text-error-500"
              role="alert"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {form.formState.errors.phoneNumber.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password" className="text-sm font-medium">
            {t('auth.password')}
          </Label>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            disabled={isLoading}
            className={cn(
              'px-4 py-3 text-base',
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
        <div className="space-y-2">
          <Label htmlFor="register-confirm" className="text-sm font-medium">
            {t('auth.confirmPassword')}
          </Label>
          <PasswordInput
            id="register-confirm"
            autoComplete="new-password"
            disabled={isLoading}
            className={cn(
              'px-4 py-3 text-base',
              form.formState.errors.confirmPassword &&
                'border-error-500 focus-visible:ring-error-500'
            )}
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-error-500" role="alert">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full bg-brand-primary text-base hover:bg-brand-primary-hover"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              {t('auth.loading')}
            </>
          ) : (
            t('auth.submitRegister')
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-text-body">
        {t('auth.haveAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-brand-primary hover:underline"
        >
          {t('auth.logIn')}
        </button>
      </p>
    </div>
  )
}
