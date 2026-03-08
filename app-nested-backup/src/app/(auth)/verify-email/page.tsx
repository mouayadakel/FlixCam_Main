/**
 * Verify email – handle token from link and show success or error.
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/use-locale'

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const { t: i18n } = useLocale()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.ok) setStatus('success')
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [token])

  if (status === 'loading') {
    return <p className="text-muted-foreground">{i18n('auth.verifyingEmail')}</p>
  }
  if (status === 'success') {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold">{i18n('auth.emailVerified')}</h1>
        <p className="mb-6 text-muted-foreground">{i18n('auth.emailVerifiedDesc')}</p>
        <Button asChild>
          <Link href="/login">{i18n('auth.signIn')}</Link>
        </Button>
      </>
    )
  }
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{i18n('auth.verificationFailed')}</h1>
      <p className="mb-6 text-muted-foreground">{i18n('auth.verificationFailedDesc')}</p>
      <Button asChild variant="outline">
        <Link href="/login">{i18n('auth.backToLogin')}</Link>
      </Button>
    </>
  )
}

export default function VerifyEmailPage() {
  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <VerifyContent />
      </Suspense>
    </main>
  )
}
