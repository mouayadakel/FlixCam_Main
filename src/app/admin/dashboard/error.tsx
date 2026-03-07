/**
 * @file error.tsx
 * @description Error boundary for dashboard page
 * @module app/admin/dashboard
 */

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-error-600">
            <AlertCircle className="h-5 w-5" />
            خطأ في تحميل لوحة التحكم
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">
            حدث خطأ أثناء تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.
          </p>
          {error.message && (
            <details className="rounded bg-neutral-100 p-3 text-xs">
              <summary className="cursor-pointer font-medium">تفاصيل الخطأ</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              إعادة المحاولة
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              تحديث الصفحة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
