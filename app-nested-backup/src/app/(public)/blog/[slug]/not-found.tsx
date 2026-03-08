/**
 * Blog post 404 - post not found.
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'

export default function BlogPostNotFound() {
  const { locale } = useLocale()
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900">
        {locale === 'ar' ? 'المقال غير موجود' : 'Post not found'}
      </h1>
      <p className="mt-4 text-gray-600">
        {locale === 'ar' ? 'قد يكون هذا المقال قد نُقل أو حُذف.' : 'This post may have been moved or deleted.'}
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/blog"
          className="rounded-lg bg-brand-primary px-6 py-3 font-medium text-white hover:bg-brand-primary-hover"
        >
          {locale === 'ar' ? 'العودة للمدونة' : 'Back to blog'}
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          {locale === 'ar' ? 'الرئيسية' : 'Home'}
        </Link>
      </div>
    </div>
  )
}
