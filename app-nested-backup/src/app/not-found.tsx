/**
 * 404 Not Found – friendly error page with CTAs and search.
 * Matches 403 page design language.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Camera, Home, Package, MessageCircle } from 'lucide-react'
import { NotFoundSearch } from './not-found-search'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4" dir="rtl">
      <div className="flex flex-col items-center text-center">
        <Camera className="mb-4 h-16 w-16 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">عذراً، الصفحة غير موجودة</h1>
        <p className="mt-2 max-w-md text-muted-foreground">404 — Page Not Found</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          لم نتمكن من العثور على الصفحة التي تبحث عنها.
        </p>

        <div className="mt-6 w-full max-w-sm">
          <NotFoundSearch />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="default">
            <Link href="/">
              <Home className="ms-2 h-4 w-4" />
              العودة للرئيسية
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/equipment">
              <Package className="ms-2 h-4 w-4" />
              تصفح المعدات
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">
              <MessageCircle className="ms-2 h-4 w-4" />
              تواصل معنا
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
