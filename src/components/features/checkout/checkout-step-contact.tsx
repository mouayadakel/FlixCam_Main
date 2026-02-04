/**
 * Checkout Step 1: Contact – Phone+OTP or Email+Password (Phase 3.2 deferred registration).
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  sendOtpSchema,
  verifyOtpSchema,
  deferredRegisterSchema,
  type SendOtpInput,
  type VerifyOtpInput,
  type DeferredRegisterInput,
} from '@/lib/validators/auth.validator'
import { useCartStore } from '@/lib/stores/cart.store'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface CheckoutStepContactProps {
  onSuccess: () => void
}

export function CheckoutStepContact({ onSuccess }: CheckoutStepContactProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const syncCart = useCartStore((s) => s.syncCart)

  const [otpSent, setOtpSent] = useState(false)
  const [phoneValue, setPhoneValue] = useState('')
  const [sendOtpLoading, setSendOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)

  const phoneForm = useForm<SendOtpInput>({
    resolver: zodResolver(sendOtpSchema),
    defaultValues: { phone: '' },
  })

  const otpForm = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { phone: '', code: '' },
  })

  const registerForm = useForm<DeferredRegisterInput>({
    resolver: zodResolver(deferredRegisterSchema),
    defaultValues: { email: '', password: '', name: '' },
  })

  const handleSendOtp = async (data: SendOtpInput) => {
    setSendOtpLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: t('common.error'), description: json.error ?? 'Failed to send code', variant: 'destructive' })
        return
      }
      setPhoneValue(data.phone)
      otpForm.setValue('phone', data.phone)
      setOtpSent(true)
      toast({ title: t('checkout.sendingOtp'), description: 'تم إرسال الرمز' })
    } finally {
      setSendOtpLoading(false)
    }
  }

  const handleVerifyOtp = async (data: VerifyOtpInput) => {
    setVerifyLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone, code: data.code }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: t('common.error'), description: json.error ?? 'Verification failed', variant: 'destructive' })
        return
      }
      const { oneTimeToken } = json
      const result = await signIn('phone-otp', { oneTimeToken, redirect: false })
      if (result?.error) {
        toast({ title: t('common.error'), description: 'تسجيل الدخول فشل', variant: 'destructive' })
        return
      }
      if (result?.ok) {
        await syncCart()
        toast({ title: 'تم التحقق', description: 'جاري المتابعة...' })
        onSuccess()
      }
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleRegister = async (data: DeferredRegisterInput) => {
    setRegisterLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: t('common.error'), description: json.error ?? 'Registration failed', variant: 'destructive' })
        return
      }
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        toast({ title: t('common.error'), description: 'تسجيل الدخول فشل', variant: 'destructive' })
        return
      }
      if (result?.ok) {
        await syncCart()
        toast({ title: 'تم إنشاء الحساب', description: 'جاري المتابعة...' })
        onSuccess()
      }
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <Tabs defaultValue="phone" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="phone">{t('checkout.contactByPhone')}</TabsTrigger>
          <TabsTrigger value="email">{t('checkout.contactByEmail')}</TabsTrigger>
        </TabsList>
        <TabsContent value="phone" className="mt-4 space-y-4">
          {!otpSent ? (
            <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
              <div>
                <Label htmlFor="phone">{t('checkout.phonePlaceholder')}</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                  {...phoneForm.register('phone')}
                  className="mt-1"
                />
                {phoneForm.formState.errors.phone && (
                  <p className="mt-1 text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={sendOtpLoading}>
                {sendOtpLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                {t('checkout.sendOtp')}
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                تم إرسال رمز إلى {phoneValue}
                <button
                  type="button"
                  className="ms-2 text-primary underline"
                  onClick={() => setOtpSent(false)}
                >
                  تغيير
                </button>
              </p>
              <input type="hidden" {...otpForm.register('phone')} />
              <div>
                <Label htmlFor="otp">{t('checkout.otpPlaceholder')}</Label>
                <Input
                  id="otp"
                  dir="ltr"
                  placeholder="000000"
                  maxLength={6}
                  {...otpForm.register('code')}
                  className="mt-1"
                />
                {otpForm.formState.errors.code && (
                  <p className="mt-1 text-sm text-destructive">{otpForm.formState.errors.code.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={verifyLoading}>
                {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                {t('checkout.verify')}
              </Button>
            </form>
          )}
        </TabsContent>
        <TabsContent value="email" className="mt-4 space-y-4">
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('checkout.emailPlaceholder')}</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                {...registerForm.register('email')}
                className="mt-1"
              />
              {registerForm.formState.errors.email && (
                <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">{t('checkout.passwordPlaceholder')}</Label>
              <Input
                id="password"
                type="password"
                {...registerForm.register('password')}
                className="mt-1"
              />
              {registerForm.formState.errors.password && (
                <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="name">{t('checkout.namePlaceholder')}</Label>
              <Input id="name" {...registerForm.register('name')} className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={registerLoading}>
              {registerLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              {t('checkout.registerAndContinue')}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary underline">
              {t('checkout.alreadyHaveAccount')}
            </Link>
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
