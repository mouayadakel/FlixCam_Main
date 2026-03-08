'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale } = useLocale()

  useEffect(() => {
    console.error('[BlogError]', error)
  }, [error])

  const title = locale === 'ar' ? 'حدث خطأ' : 'Something went wrong'
  const message =
    locale === 'ar'
      ? 'تعذر تحميل المدونة. يرجى المحاولة مرة أخرى.'
      : 'We couldn\'t load the blog. Please try again.'
  const retry = locale === 'ar' ? 'إعادة المحاولة' : 'Try again'
  const backToBlog = locale === 'ar' ? 'العودة للمدونة' : 'Back to blog'
  const home = locale === 'ar' ? 'الرئيسية' : 'Home'

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <AlertCircle className="h-16 w-16 text-red-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button onClick={reset} variant="default">
          {retry}
        </Button>
        <Button asChild variant="outline">
          <Link href="/blog">{backToBlog}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">{home}</Link>
        </Button>
      </div>
    </div>
  )
}
