/**
 * Forgot password – request reset link by email.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'

const schema = z.object({ email: z.string().email('Invalid email') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const { t: i18n } = useLocale()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setSent(true)
      toast({
        title: i18n('auth.checkYourEmail'),
        description: i18n('auth.resetLinkSent'),
      })
    } catch (e) {
      toast({
        title: i18n('auth.loginError'),
        description: e instanceof Error ? e.message : i18n('auth.unexpectedError'),
        variant: 'destructive',
      })
    }
  }

  if (sent) {
    return (
      <main className="container mx-auto max-w-md px-4 py-12">
        <h1 className="mb-4 text-2xl font-bold">{i18n('auth.checkYourEmail')}</h1>
        <p className="mb-6 text-muted-foreground">{i18n('auth.resetLinkSent')}</p>
        <Button asChild variant="outline">
          <Link href="/login">{i18n('auth.backToLogin')}</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <h1 className="mb-4 text-2xl font-bold">{i18n('auth.forgotPassword')}</h1>
      <p className="mb-6 text-muted-foreground">{i18n('auth.forgotPasswordDesc')}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">{i18n('auth.email')}</Label>
          <Input
            id="email"
            type="email"
            disabled={isSubmitting}
            {...register('email')}
            className="mt-1"
          />
          {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {i18n('auth.sending')}
            </>
          ) : (
            i18n('auth.sendResetLink')
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-brand-primary underline">
          {i18n('auth.backToLogin')}
        </Link>
      </p>
    </main>
  )
}
