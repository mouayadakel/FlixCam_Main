'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()

  useEffect(() => {
    console.error('[PublicError]', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <AlertCircle className="h-16 w-16 text-destructive" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-text-heading">{t('common.error')}</h1>
      <p className="mt-2 text-text-muted">{t('home.sectionLoadError')}</p>
      {error.digest && <p className="mt-1 text-xs text-muted-foreground">ID: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button onClick={reset} variant="default">
          <RefreshCw className="ms-2 h-4 w-4" />
          {t('common.retry')}
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t('nav.home')}</Link>
        </Button>
      </div>
    </div>
  )
}
