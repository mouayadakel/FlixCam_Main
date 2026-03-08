/**
 * Blog pagination page - /blog/page/2, /blog/page/3, etc.
 */

import type { Metadata } from 'next'
import { BlogService } from '@/lib/services/blog.service'
import { BlogListingClient } from '@/components/blog/blog-listing-client'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const metadata: Metadata = {
  title: 'المدونة | Blog | FlixCam.rent',
  description: 'نصائح ومقالات عن تأجير معدات التصوير السينمائي',
  alternates: generateAlternatesMetadata('/blog'),
  openGraph: {
    title: 'المدونة | Blog | FlixCam.rent',
    description: 'نصائح ومقالات عن تأجير معدات التصوير السينمائي',
    url: `${BASE_URL}/blog`,
    type: 'website',
  },
}

export const revalidate = 60

type Props = {
  params: Promise<{ number: string }>
  searchParams: Promise<{ q?: string; category?: string; tags?: string; sort?: string }>
}

export default async function BlogPageNumberPage({ params, searchParams }: Props) {
  const { number } = await params
  const sp = await searchParams
  const page = parseInt(number, 10)
  if (isNaN(page) || page < 1) {
    return null
  }
  const tags = sp.tags ? (Array.isArray(sp.tags) ? sp.tags : sp.tags.split(',')) : []

  const [featured, result, categories, tagList] = await Promise.all([
    BlogService.getFeaturedPosts(3),
    BlogService.getPosts({
      page,
      limit: 12,
      sort: (sp.sort as 'newest' | 'popular' | 'relevant') ?? 'newest',
      category: sp.category,
      tags: tags.length ? tags : undefined,
      q: sp.q,
    }),
    BlogService.getCategories(),
    BlogService.getTags(),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <BlogListingClient
        featuredPosts={featured}
        initialPosts={result.posts}
        initialTotal={result.total}
        initialPage={page}
        initialTotalPages={result.totalPages}
        categories={categories}
        tags={tagList}
        initialSearchQuery={sp.q ?? ''}
        initialCategory={sp.category}
        initialTags={tags}
        initialSort={sp.sort ?? 'newest'}
      />
    </main>
  )
}
