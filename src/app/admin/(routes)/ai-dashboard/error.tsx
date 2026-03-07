'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AIDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AI Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center" dir="rtl">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">حدث خطأ في لوحة الذكاء الاصطناعي</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>حاول مجدداً</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/admin')}>
          لوحة التحكم
        </Button>
      </div>
    </div>
  )
}
