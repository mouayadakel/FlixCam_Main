/**
 * @file page.tsx
 * @description Login page with shared LoginForm, role-based redirect, and URL error/email handling.
 * @module app/(auth)/login
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import { LoginForm } from '@/components/auth/forms'

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

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [language, setLanguage] = useState<'ar' | 'en'>('ar')
  const { t } = useLocale()

  const callbackUrl = searchParams?.get('callbackUrl') ?? undefined
  const emailParam = searchParams?.get('email') ?? undefined

  useEffect(() => {
    if (!searchParams) return
    if (typeof window !== 'undefined' && searchParams.has('password')) {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('password')
      const clean = next.toString()
      const newUrl = clean ? `${window.location.pathname}?${clean}` : window.location.pathname
      window.history.replaceState(null, '', newUrl)
    }
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        Configuration: t('auth.configError'),
        CredentialsSignin: t('auth.invalidCredentials'),
        VendorAccessDenied: t('auth.vendorAccessDenied'),
        Default: t('auth.defaultError'),
      }
      toast({
        title: t('auth.loginError'),
        description: errorMessages[errorParam] ?? errorMessages.Default,
        variant: 'destructive',
      })
    }
  }, [searchParams, toast, t])

  const handleLoginSuccess = async () => {
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
            {t('auth.loginTab')}
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

        <LoginForm
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => router.push('/register')}
          callbackUrl={callbackUrl}
          defaultEmail={emailParam}
        />
      </div>
    </div>
  )
}
