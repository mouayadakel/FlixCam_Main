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
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast({ title: 'Invalid link', description: 'Missing reset token.', variant: 'destructive' })
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
      toast({ title: 'Password updated', description: 'You can sign in with your new password.' })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Something went wrong',
        variant: 'destructive',
      })
    }
  }

  if (done) {
    return (
      <>
        <h1 className="text-2xl font-bold mb-4">Password updated</h1>
        <p className="text-muted-foreground mb-6">You can now sign in with your new password.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </>
    )
  }

  if (!token) {
    return (
      <>
        <h1 className="text-2xl font-bold mb-4">Invalid link</h1>
        <p className="text-muted-foreground mb-6">This reset link is missing the token. Request a new one from the forgot password page.</p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request reset link</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Set new password</h1>
      <p className="text-muted-foreground mb-6">Enter your new password below.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" {...register('password')} className="mt-1" autoComplete="new-password" />
          {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" {...register('confirmPassword')} className="mt-1" autoComplete="new-password" />
          {errors.confirmPassword && <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" className="w-full">Update password</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-brand-primary underline">Back to login</Link>
      </p>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="container mx-auto max-w-md py-12 px-4">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
