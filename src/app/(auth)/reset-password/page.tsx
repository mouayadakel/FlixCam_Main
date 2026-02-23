/**
 * Reset password – form with token from URL, submits to API.
 */

'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'

const schema = z
  .object({
    password: z
      .string()
      .min(6, 'At least 6 characters')
      .max(100)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Include lowercase, uppercase, and a number',
      }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? ''
  const { toast } = useToast()
  const { t: i18n } = useLocale()
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast({
        title: i18n('auth.invalidLink'),
        description: i18n('auth.missingToken'),
        variant: 'destructive',
      })
      return
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setDone(true)
      toast({ title: i18n('auth.passwordUpdated'), description: i18n('auth.canSignInNow') })
    } catch (e) {
      toast({
        title: i18n('auth.loginError'),
        description: e instanceof Error ? e.message : i18n('auth.unexpectedError'),
        variant: 'destructive',
      })
    }
  }

  if (done) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold">{i18n('auth.passwordUpdated')}</h1>
        <p className="mb-6 text-muted-foreground">{i18n('auth.canSignInNow')}</p>
        <Button asChild>
          <Link href="/login">{i18n('auth.signIn')}</Link>
        </Button>
      </>
    )
  }

  if (!token) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold">{i18n('auth.invalidLink')}</h1>
        <p className="mb-6 text-muted-foreground">{i18n('auth.missingToken')}</p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">{i18n('auth.requestResetLink')}</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{i18n('auth.setNewPassword')}</h1>
      <p className="mb-6 text-muted-foreground">{i18n('auth.setNewPasswordDesc')}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="password">{i18n('auth.newPassword')}</Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
            className="mt-1"
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="confirmPassword">{i18n('auth.confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className="mt-1"
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full">
          {i18n('auth.updatePassword')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-brand-primary underline">
          {i18n('auth.backToLogin')}
        </Link>
      </p>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
