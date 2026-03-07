/**
 * Blog listing client - featured hero, search, filters, post grid, pagination.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { BlogPostListItem } from '@/lib/types/blog.types'
import { useLocale } from '@/hooks/use-locale'
import { BlogHero } from './blog-hero'
import { BlogGrid } from './blog-grid'
import { BlogSearch } from './blog-search'
import { BlogFilters } from './blog-filters'
import { BlogPagination } from './blog-pagination'

interface BlogListingClientProps {
  featuredPosts: BlogPostListItem[]
  initialPosts: BlogPostListItem[]
  initialTotal: number
  initialPage: number
  initialTotalPages: number
  categories: { id: string; nameAr: string; nameEn: string; slug: string; sortOrder: number }[]
  tags: { id: string; nameAr: string; nameEn: string; slug: string }[]
  initialSearchQuery?: string
  initialCategory?: string
  initialTags?: string[]
  initialSort?: string
  /** Base path for pagination, e.g. /blog or /blog/category/x or /blog/tag/y */
  basePath?: string
}

export function BlogListingClient({
  featuredPosts,
  initialPosts,
  initialTotal,
  initialPage,
  initialTotalPages,
  categories,
  tags,
  initialSearchQuery = '',
  initialCategory,
  initialTags = [],
  initialSort = 'newest',
  basePath = '/blog',
}: BlogListingClientProps) {
  const { locale, t } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const title = t('blog.title')
  const subtitle = t('blog.subtitle')
  const latestTitle = t('blog.latestArticles')
  const emptyTitle = t('blog.noPosts')
  const emptySubtitle = t('blog.noPostsSubtitle')
  const searchPlaceholder = t('blog.searchPlaceholder')

  const buildUrl = (updates: Record<string, string | string[] | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.delete(key)
        value.forEach((v) => params.append(key, v))
      } else {
        params.set(key, value)
      }
    })
    params.set('page', '1')
    const qs = params.toString()
    return qs ? `/blog?${qs}` : '/blog'
  }

  const handleSearch = (q: string) => {
    router.push(buildUrl({ q: q || undefined }))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero - dark section */}
      {featuredPosts[0] ? (
        <BlogHero post={featuredPosts[0]} locale={locale} />
      ) : (
        <header className="relative mb-12 overflow-hidden rounded-2xl bg-gray-900">
          <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
            <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
            <p className="mt-2 text-gray-400">{subtitle}</p>
          </div>
        </header>
      )}

      {/* Search + Filters */}
      <section className="mb-8 space-y-4">
        <div className="max-w-md">
          <BlogSearch
            placeholder={searchPlaceholder}
            defaultValue={initialSearchQuery}
            onSearch={handleSearch}
          />
        </div>
        <BlogFilters
          categories={categories}
          tags={tags}
          locale={locale}
          selectedCategory={initialCategory}
          selectedTags={initialTags}
          sort={initialSort}
        />
      </section>

      {/* Posts grid */}
      <section>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">{latestTitle}</h2>
        {initialPosts.length > 0 ? (
          <>
            <BlogGrid posts={initialPosts} locale={locale} />
            <BlogPagination
              currentPage={initialPage}
              totalPages={initialTotalPages}
              locale={locale}
              basePath={basePath}
              searchParams={searchParams?.toString() ?? ''}
              useQueryParam={basePath !== '/blog'}
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
            <p className="text-lg text-gray-600">{emptyTitle}</p>
            <p className="mt-2 text-sm text-gray-500">{emptySubtitle}</p>
          </div>
        )}
      </section>
    </div>
  )
}
