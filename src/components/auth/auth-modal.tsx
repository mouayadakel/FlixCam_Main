/**
 * @file auth-modal.tsx
 * @description Global Login/Register modal with tabs, blurred overlay, and role-based redirect
 * @module components/auth
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import { useAuthModal } from '@/components/auth/auth-modal-provider'
import {
  loginSchema,
  registerFormSchema,
  type LoginFormData,
  type RegisterFormData,
} from '@/lib/validators/auth.validator'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const CLIENT_ROLE = 'DATA_ENTRY'

const translations = {
  ar: {
    register: 'إنشاء حساب',
    login: 'تسجيل الدخول',
    registerTab: 'إنشاء حساب',
    loginTab: 'تسجيل الدخول',
    usernameLabel: 'اسم المستخدم',
    usernamePlaceholder: 'معرف المستخدم / البريد الإلكتروني',
    name: 'الاسم (اختياري)',
    namePlaceholder: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'example@email.com',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    keepMeSignedIn: 'إبقني مسجلاً',
    forgotPassword: 'نسيت كلمة المرور؟',
    submitRegister: 'إنشاء الحساب',
    submitLogin: 'تسجيل الدخول',
    signIn: 'تسجيل الدخول',
    quickAccessWith: 'وصول سريع عبر',
    loading: 'جاري التحميل...',
    haveAccount: 'لديك حساب بالفعل؟',
    noAccount: 'ليس لديك حساب؟',
    logIn: 'تسجيل الدخول',
    registerLink: 'إنشاء حساب',
    loginError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    registerError: 'تحقق من البيانات وحاول مجدداً.',
    emailExists: 'البريد مسجل مسبقاً. سجّل الدخول أو استخدم بريداً آخر.',
    tooManyRequests: 'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.',
    error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
  },
  en: {
    register: 'Register',
    login: 'Log in',
    registerTab: 'REGISTER',
    loginTab: 'LOGIN',
    usernameLabel: 'Username',
    usernamePlaceholder: 'User ID / Email Address',
    name: 'Name (optional)',
    namePlaceholder: 'Full name',
    email: 'Email Address',
    emailPlaceholder: 'example@email.com',
    password: 'Password',
    passwordPlaceholder: 'Enter Your Password',
    confirmPassword: 'Confirm Password',
    keepMeSignedIn: 'Keep Me Signed In',
    forgotPassword: 'Forgot Password?',
    submitRegister: 'Create Account',
    submitLogin: 'Sign In',
    signIn: 'SIGN IN',
    quickAccessWith: 'Quick Access With',
    loading: 'Loading...',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    logIn: 'Log in',
    registerLink: 'Register',
    loginError: 'Email or password is incorrect',
    registerError: 'Check your data and try again.',
    emailExists: 'Email already registered. Sign in or use another email.',
    tooManyRequests: 'Too many attempts. Please wait and try again.',
    error: 'Something went wrong. Please try again.',
  },
} as const

export function AuthModal() {
  const router = useRouter()
  const { toast } = useToast()
  const { locale, isRtl } = useLocale()
  const { isOpen, tab, closeAuthModal, setTab } = useAuthModal()
  const [isLoading, setIsLoading] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const t = translations[locale === 'ar' ? 'ar' : 'en']

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) closeAuthModal()
  }

  const redirectByRole = async () => {
    closeAuthModal()
    await router.refresh()
    const session = await getSession()
    const role = session?.user?.role as string | undefined
    const destination =
      role === CLIENT_ROLE ? '/portal/dashboard' : '/admin/dashboard'
    router.push(destination)
  }

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        toast({
          title: t.loginError,
          variant: 'destructive',
        })
        return
      }
      if (result?.ok) {
        toast({
          title: isRtl ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully',
          description: isRtl ? 'جاري التوجيه...' : 'Redirecting...',
        })
        await redirectByRole()
      }
    } catch (err) {
      console.error('Login error:', err)
      toast({ title: t.error, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const onRegisterSubmit = async (data: RegisterFormData) => {
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
            title: t.emailExists,
            description: message ?? undefined,
            variant: 'destructive',
          })
          return
        }
        if (res.status === 429) {
          toast({
            title: t.tooManyRequests,
            variant: 'destructive',
          })
          return
        }
        toast({
          title: t.registerError,
          description: message ?? undefined,
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
          title: isRtl ? 'تم إنشاء الحساب' : 'Account created',
          description: isRtl ? 'سجّل الدخول من الصفحة التالية.' : 'Please sign in on the next page.',
        })
        setTab('login')
        setIsLoading(false)
        return
      }
      toast({
        title: isRtl ? 'تم إنشاء الحساب' : 'Account created',
        description: isRtl ? 'جاري التوجيه...' : 'Redirecting...',
      })
      await redirectByRole()
    } catch (err) {
      console.error('Register error:', err)
      toast({ title: t.error, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-[400px] gap-0 border-border-light bg-white p-8 shadow-modal sm:rounded-lg rounded-public-card"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {tab === 'register' ? t.register : t.login}
        </DialogTitle>
        <div className="flex flex-col gap-5" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="text-center">
            <p className="text-xl font-bold text-brand-primary">FlixCam.rent</p>
          </div>
          <div className="flex gap-5 border-b border-border-light">
            <button
              type="button"
              onClick={() => setTab('register')}
              className={cn(
                'pb-2 text-base font-medium uppercase tracking-wide transition-colors',
                tab === 'register'
                  ? 'border-b-2 border-brand-primary text-text-heading'
                  : 'border-b-2 border-transparent text-text-muted hover:text-text-heading'
              )}
            >
              {t.registerTab}
            </button>
            <button
              type="button"
              onClick={() => setTab('login')}
              className={cn(
                'pb-2 text-base font-medium uppercase tracking-wide transition-colors',
                tab === 'login'
                  ? 'border-b-2 border-brand-primary text-text-heading'
                  : 'border-b-2 border-transparent text-text-muted hover:text-text-heading'
              )}
            >
              {t.loginTab}
            </button>
          </div>

          {tab === 'register' ? (
            <form
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="auth-modal-name" className="text-sm font-medium">
                  {t.name}
                </Label>
                <Input
                  id="auth-modal-name"
                  type="text"
                  autoComplete="name"
                  placeholder={t.namePlaceholder}
                  disabled={isLoading}
                  className={cn(
                    'px-4 py-3 text-base',
                    registerForm.formState.errors.name &&
                      'border-error-500 focus-visible:ring-error-500'
                  )}
                  {...registerForm.register('name')}
                />
                {registerForm.formState.errors.name && (
                  <p className="text-sm text-error-500" role="alert">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-modal-reg-email" className="text-sm font-medium">
                  {t.email}
                </Label>
                <Input
                  id="auth-modal-reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder={t.emailPlaceholder}
                  disabled={isLoading}
                  className={cn(
                    'px-4 py-3 text-base',
                    registerForm.formState.errors.email &&
                      'border-error-500 focus-visible:ring-error-500'
                  )}
                  {...registerForm.register('email')}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-error-500" role="alert">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-modal-reg-password" className="text-sm font-medium">
                  {t.password}
                </Label>
                <Input
                  id="auth-modal-reg-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className={cn(
                    'px-4 py-3 text-base',
                    registerForm.formState.errors.password &&
                      'border-error-500 focus-visible:ring-error-500'
                  )}
                  {...registerForm.register('password')}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-error-500" role="alert">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-modal-reg-confirm" className="text-sm font-medium">
                  {t.confirmPassword}
                </Label>
                <Input
                  id="auth-modal-reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className={cn(
                    'px-4 py-3 text-base',
                    registerForm.formState.errors.confirmPassword &&
                      'border-error-500 focus-visible:ring-error-500'
                  )}
                  {...registerForm.register('confirmPassword')}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-error-500" role="alert">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ms-2" />
                    {t.loading}
                  </>
                ) : (
                  t.submitRegister
                )}
              </Button>
              <p className="text-center text-sm text-text-body">
                {t.haveAccount}{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="font-medium text-brand-primary hover:underline"
                >
                  {t.logIn}
                </button>
              </p>
            </form>
          ) : (
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="auth-modal-login-email" className="text-sm font-medium text-text-heading">
                  {t.usernameLabel}
                </Label>
                <Input
                  id="auth-modal-login-email"
                  type="email"
                  autoComplete="email"
                  placeholder={t.usernamePlaceholder}
                  disabled={isLoading}
                  className={cn(
                    'h-12 rounded-lg border-border-input px-4 py-3 text-base',
                    loginForm.formState.errors.email &&
                      'border-error-500 focus-visible:ring-error-500'
                  )}
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-error-500" role="alert">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-modal-login-password" className="text-sm font-medium text-text-heading">
                  {t.password}
                </Label>
                <Input
                  id="auth-modal-login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t.passwordPlaceholder}
                  disabled={isLoading}
                  className={cn(
                    'h-12 rounded-lg border-border-input px-4 py-3 text-base',
                    loginForm.formState.errors.password &&
                      'border-error-500 focus-visible:ring-error-500'
                  )}
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-error-500" role="alert">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-body">
                  <Checkbox
                    checked={keepSignedIn}
                    onCheckedChange={(v) => setKeepSignedIn(v === true)}
                  />
                  {t.keepMeSignedIn}
                </label>
                <Link
                  href="/forgot-password"
                  onClick={closeAuthModal}
                  className="text-sm font-medium text-brand-primary hover:underline"
                >
                  {t.forgotPassword}
                </Link>
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-lg bg-brand-primary text-base font-semibold uppercase hover:bg-brand-primary-hover"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ms-2" />
                    {t.loading}
                  </>
                ) : (
                  t.signIn
                )}
              </Button>
              <div className="space-y-4 pt-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border-light" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-text-muted">{t.quickAccessWith}</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white transition-opacity hover:opacity-90"
                    aria-label="Facebook"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DA1F2] text-white transition-opacity hover:opacity-90"
                    aria-label="Twitter"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-white transition-opacity hover:opacity-90"
                    aria-label="Google"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-center text-sm text-text-body">
                {t.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="font-medium text-brand-primary hover:underline"
                >
                  {t.registerLink}
                </button>
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
