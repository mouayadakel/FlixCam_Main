/**
 * @file page.tsx
 * @description 403 Forbidden error page
 * @module app/403
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
            <ShieldX className="h-8 w-8 text-error-600" />
          </div>
          <CardTitle className="text-3xl">403 - غير مصرح</CardTitle>
          <CardDescription className="text-base">
            ليس لديك الصلاحية للوصول إلى هذه الصفحة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-neutral-600">
            يبدو أنك تحاول الوصول إلى صفحة لا تملك الصلاحية لعرضها.
            إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بالمسؤول.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/admin/dashboard">العودة إلى لوحة التحكم</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">العودة إلى الصفحة الرئيسية</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
