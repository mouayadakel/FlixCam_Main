/**
 * @file page.tsx
 * @description Login page with Arabic-first RTL layout, Zod validation, and error handling
 * @module app/(auth)/login
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { loginSchema, type LoginFormData } from '@/lib/validators/auth.validator'
import { Languages, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<'ar' | 'en'>('ar')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (!searchParams) return
    // #region agent log
    const hasEmail = searchParams.get('email')
    const hasPassword = searchParams.has('password')
    if (hasEmail || hasPassword) {
      fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:useEffect:urlParams', message: 'login page loaded with email or password in URL', data: { hasEmail: !!hasEmail, hasPassword }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {})
    }
    // #endregion
    // Never leave password in URL (security + history). Strip it without reload.
    if (typeof window !== 'undefined' && searchParams.has('password')) {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('password')
      const clean = next.toString()
      const newUrl = clean ? `${window.location.pathname}?${clean}` : window.location.pathname
      window.history.replaceState(null, '', newUrl)
    }
    // Check for error in URL params
      const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        Configuration: 'الإعدادات غير صحيحة. يرجى التحقق من إعدادات الخادم.',
        CredentialsSignin: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        VendorAccessDenied: 'ليس لديك صلاحية للوصول إلى لوحة الموردين. يرجى التواصل مع الإدارة.',
        Default: 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
      }
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: errorMessages[errorParam] || errorMessages.Default,
        variant: 'destructive',
      })
    }

    // Pre-fill email if provided in URL
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setValue('email', emailParam)
    }
  }, [searchParams, setValue, toast])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:onSubmit:entry', message: 'onSubmit called', data: { email: data.email, hasPassword: !!data.password }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {})
    // #endregion

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:onSubmit:afterSignIn', message: 'signIn result', data: { ok: result?.ok, error: result?.error, url: result?.url ?? null }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {})
      // #endregion

      if (result?.error) {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:onSubmit:branch', message: 'branch result.error', data: { branch: 'error' }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {})
        // #endregion
        toast({
          title: 'خطأ في تسجيل الدخول',
          description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          variant: 'destructive',
        })
      } else if (result?.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:onSubmit:branch', message: 'branch result.ok', data: { branch: 'ok' }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {})
        // #endregion
        toast({
          title: 'تم تسجيل الدخول بنجاح',
          description: 'جاري التوجيه إلى لوحة التحكم...',
        })
        // Full page redirect so the session cookie is sent on the next request.
        const callbackUrl = searchParams?.get('callbackUrl')
        let destination =
          callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
            ? callbackUrl
            : null
        if (!destination) {
          const session = await getSession()
          const role = session?.user?.role as string | undefined
          if (role === 'DATA_ENTRY') destination = '/portal/dashboard'
          else if (role === 'VENDOR') destination = '/vendor/dashboard'
          else destination = '/admin/dashboard'
        }
        window.location.href = destination
        return
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:onSubmit:catch', message: 'onSubmit catch', data: { errorMessage: error instanceof Error ? error.message : String(error) }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {})
      // #endregion
      console.error('Login error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
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
      title: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      submit: 'تسجيل الدخول',
      loading: 'جاري التحميل...',
      forgotPassword: 'نسيت كلمة المرور؟',
      noAccount: 'ليس لديك حساب؟',
      signUp: 'إنشاء حساب',
    },
    en: {
      title: 'Sign In',
      email: 'Email Address',
      password: 'Password',
      submit: 'Sign In',
      loading: 'Loading...',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
    },
  }

  const t = translations[language]

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        {/* Header */}
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

        {/* Form */}
        <form
          method="post"
          onSubmit={(e) => {
            // #region agent log
            const form = e.currentTarget
            fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:form:onSubmit', message: 'form submit event', data: { method: form.method, action: form.action || '(current)' }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {})
            // #endregion
            handleSubmit(onSubmit)(e)
          }}
          className="space-y-6"
        >
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={language === 'ar' ? 'example@email.com' : 'example@email.com'}
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

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t.password}</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                {t.forgotPassword}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
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

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            aria-label={t.submit}
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                {t.loading}
              </>
            ) : (
              t.submit
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-neutral-600">
          <p>
            {t.noAccount}{' '}
            <Link
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              {t.signUp}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
