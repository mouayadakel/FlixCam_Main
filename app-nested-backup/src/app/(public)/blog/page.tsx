/**
 * Blog listing page - featured hero, search, filters, post grid.
 */

import type { Metadata } from 'next'
import { BlogService } from '@/lib/services/blog.service'
import { BlogListingClient } from '@/components/blog/blog-listing-client'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { buildBlogSchema } from '@/lib/seo/blog-json-ld'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const metadata: Metadata = {
  title: 'المدونة | Blog | FlixCam.rent',
  description: 'نصائح ومقالات عن تأجير معدات التصوير السينمائي | Tips and articles on cinematic equipment rental',
  alternates: generateAlternatesMetadata('/blog'),
  openGraph: {
    title: 'المدونة | Blog | FlixCam.rent',
    description: 'نصائح ومقالات عن تأجير معدات التصوير السينمائي',
    url: `${BASE_URL}/blog`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'المدونة | Blog | FlixCam.rent',
    description: 'نصائح ومقالات عن تأجير معدات التصوير السينمائي',
  },
}

export const revalidate = 60

type Props = {
  searchParams: Promise<{ q?: string; category?: string; tags?: string; sort?: string; page?: string }>
}

export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const tags = params.tags ? (Array.isArray(params.tags) ? params.tags : params.tags.split(',')) : []

  const [featured, result, categories, tagList, feedPosts] = await Promise.all([
    BlogService.getFeaturedPosts(3),
    BlogService.getPosts({
      page,
      limit: 12,
      sort: (params.sort as 'newest' | 'popular' | 'relevant') ?? 'newest',
      category: params.category,
      tags: tags.length ? tags : undefined,
      q: params.q,
    }),
    BlogService.getCategories(),
    BlogService.getTags(),
    BlogService.getPostsForFeed(20),
  ])

  const blogSchema = buildBlogSchema({ posts: feedPosts, locale: 'ar' })

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <BlogListingClient
        featuredPosts={featured}
        initialPosts={result.posts}
        initialTotal={result.total}
        initialPage={page}
        initialTotalPages={result.totalPages}
        categories={categories}
        tags={tagList}
        initialSearchQuery={params.q ?? ''}
        initialCategory={params.category}
        initialTags={tags}
        initialSort={params.sort ?? 'newest'}
      />
    </div>
  )
}
