/**
 * @file error.tsx
 * @description Admin error boundary – shows when an error occurs in admin routes
 * @module app/admin
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] Error boundary', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4" dir="rtl">
      <div className="flex flex-col items-center text-center">
        <AlertTriangle className="mb-4 h-16 w-16 text-destructive" aria-hidden />
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">حدث خطأ</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          واجهت لوحة التحكم مشكلة. يرجى المحاولة مرة أخرى أو العودة للوحة التحكم.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button onClick={reset} variant="default">
            <RefreshCw className="ms-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">
              <Home className="ms-2 h-4 w-4" />
              لوحة التحكم
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
