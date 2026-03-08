/**
 * Studio breadcrumb: structured breadcrumb with i18n
 */

'use client'

import Link from 'next/link'
import { ChevronLeft, Home } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'

interface StudioBreadcrumbProps {
  studioName?: string
}

export function StudioBreadcrumb({ studioName }: StudioBreadcrumbProps) {
  const { t } = useLocale()
  return (
    <nav className="mb-6" aria-label="Breadcrumb" dir="rtl">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">{t('nav.home')}</span>
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronLeft className="h-3.5 w-3.5" />
        </li>
        <li>
          <Link
            href="/studios"
            className="rounded-md px-1.5 py-1 transition-colors hover:text-foreground"
          >
            {t('studios.breadcrumbStudios')}
          </Link>
        </li>
        {studioName && (
          <>
            <li aria-hidden="true">
              <ChevronLeft className="h-3.5 w-3.5" />
            </li>
            <li>
              <span className="px-1.5 py-1 font-medium text-foreground">{studioName}</span>
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}
