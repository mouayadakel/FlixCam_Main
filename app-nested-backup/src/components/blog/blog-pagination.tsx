/**
 * Blog pagination - SEO-friendly URLs.
 */

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BlogPaginationProps {
  currentPage: number
  totalPages: number
  locale: string
  basePath?: string
  searchParams?: string
  /** Use ?page=N for category/tag pages; use /page/N for main blog */
  useQueryParam?: boolean
}

export function BlogPagination({
  currentPage,
  totalPages,
  locale,
  basePath = '/blog',
  searchParams = '',
  useQueryParam = false,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null

  const params = new URLSearchParams(searchParams)
  params.delete('page')
  const baseQs = params.toString()

  const buildHref = (page: number) => {
    if (useQueryParam) {
      const p = new URLSearchParams(baseQs)
      if (page > 1) p.set('page', String(page))
      const qs = p.toString()
      return page === 1 ? `${basePath}${qs ? `?${qs}` : ''}` : `${basePath}?${p.toString()}`
    }
    const suffix = baseQs ? `?${baseQs}` : ''
    return page === 1 ? `${basePath}${suffix}` : `${basePath}/page/${page}${suffix}`
  }

  const prevHref = currentPage > 1 ? buildHref(currentPage - 1) : ''
  const nextHref = currentPage < totalPages ? buildHref(currentPage + 1) : ''

  const prevLabel = locale === 'ar' ? 'السابق' : 'Previous'
  const nextLabel = locale === 'ar' ? 'التالي' : 'Next'
  const pageLabel =
    locale === 'ar' ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`

  return (
    <nav
      className="mt-12 flex items-center justify-center gap-2"
      aria-label={locale === 'ar' ? 'التنقل بين الصفحات' : 'Pagination'}
    >
      {currentPage > 1 ? (
        <Link
          href={prevHref}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
          rel="prev"
        >
          <ChevronLeft className="h-4 w-4" />
          {prevLabel}
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400" aria-hidden>
          <ChevronLeft className="h-4 w-4" />
          {prevLabel}
        </span>
      )}

      <span className="px-4 py-2 text-sm text-gray-600" aria-current="page">
        {pageLabel}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={nextHref}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
          rel="next"
        >
          {nextLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400" aria-hidden>
          {nextLabel}
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  )
}
