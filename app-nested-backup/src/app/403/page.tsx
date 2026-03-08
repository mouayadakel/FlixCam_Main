/**
 * @file page.tsx
 * @description 403 Forbidden - Access Denied
 * @module app/403
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldX, Home, ArrowRight } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4" dir="rtl">
      <div className="flex flex-col items-center text-center">
        <ShieldX className="mb-4 h-16 w-16 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">تم رفض الوصول</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          ليس لديك صلاحية لعرض هذه الصفحة. يرجى التواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="default">
            <Link href="/">
              <Home className="ms-2 h-4 w-4" />
              الصفحة الرئيسية
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">
              <ArrowRight className="ms-2 h-4 w-4" />
              العودة لتسجيل الدخول
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
