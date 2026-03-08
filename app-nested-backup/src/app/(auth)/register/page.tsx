/**
 * @file page.tsx
 * @description Register page with Arabic-first RTL layout, Zod validation, and error handling
 * @module app/(auth)/register
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { registerFormSchema, type RegisterFormData } from '@/lib/validators/auth.validator'
import { Languages, Loader2 } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<'ar' | 'en'>('ar')
  const { t: i18n } = useLocale()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name?.trim() || undefined,
        }),
      })

      const json = await res.json().catch(() => ({}))
      const message = typeof json?.error === 'string' ? json.error : null

      if (!res.ok) {
        if (res.status === 409) {
          toast({
            title: i18n('auth.emailAlreadyRegistered'),
            description: message || i18n('auth.signInOrUseAnother'),
            variant: 'destructive',
          })
          return
        }
        if (res.status === 429) {
          toast({
            title: i18n('auth.tooManyAttempts'),
            description: i18n('auth.waitAndRetry'),
            variant: 'destructive',
          })
          return
        }
        toast({
          title: i18n('auth.registrationError'),
          description: message || i18n('auth.checkDataAndRetry'),
          variant: 'destructive',
        })
        return
      }

      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        toast({
          title: i18n('auth.accountCreated'),
          description: i18n('auth.signInNextPage'),
        })
        router.push('/login?email=' + encodeURIComponent(data.email))
        return
      }

      toast({
        title: i18n('auth.accountCreated'),
        description: i18n('auth.redirecting'),
      })

      const callbackUrl = searchParams?.get('callbackUrl')
      const destination =
        callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
          ? callbackUrl
          : '/portal/dashboard'
      window.location.href = destination
    } catch (error) {
      console.error('Register error:', error)
      toast({
        title: i18n('auth.loginError'),
        description: i18n('auth.unexpectedError'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }

  const translations = {
    ar: {
      title: 'إنشاء حساب',
      name: 'الاسم (اختياري)',
      namePlaceholder: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'example@email.com',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      submit: 'إنشاء الحساب',
      loading: 'جاري التحميل...',
      haveAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
    },
    en: {
      title: 'Create Account',
      name: 'Name (optional)',
      namePlaceholder: 'Full name',
      email: 'Email Address',
      emailPlaceholder: 'example@email.com',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      submit: 'Create Account',
      loading: 'Loading...',
      haveAccount: 'Already have an account?',
      signIn: 'Sign In',
    },
  }

  const t = translations[language]

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-neutral-50"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary-600">{t.title}</h1>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t.name}</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder={t.namePlaceholder}
              disabled={isLoading}
              className={errors.name ? 'border-error-500 focus-visible:ring-error-500' : ''}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-error-500" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              disabled={isLoading}
              className={errors.email ? 'border-error-500 focus-visible:ring-error-500' : ''}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-error-500" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.password}</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              disabled={isLoading}
              className={errors.password ? 'border-error-500 focus-visible:ring-error-500' : ''}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-error-500" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              disabled={isLoading}
              className={
                errors.confirmPassword ? 'border-error-500 focus-visible:ring-error-500' : ''
              }
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-error-500" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading} aria-label={t.submit}>
            {isLoading ? (
              <>
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                {t.loading}
              </>
            ) : (
              t.submit
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-neutral-600">
          <p>
            {t.haveAccount}{' '}
            <Link
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              {t.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
