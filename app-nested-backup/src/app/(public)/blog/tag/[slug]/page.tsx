/**
 * Blog tag page - posts filtered by tag.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogService } from '@/lib/services/blog.service'
import { BlogListingClient } from '@/components/blog/blog-listing-client'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tag = await BlogService.getTagBySlug(slug)
  if (!tag) return { title: 'Tag not found' }
  return {
    title: `${tag.nameEn} | ${tag.nameAr} | Blog | FlixCam.rent`,
    alternates: { canonical: `${BASE_URL}/blog/tag/${slug}` },
    openGraph: {
      title: `${tag.nameEn} | Blog | FlixCam.rent`,
      url: `${BASE_URL}/blog/tag/${slug}`,
      type: 'website',
    },
  }
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const tag = await BlogService.getTagBySlug(slug)
  if (!tag) notFound()

  const [featured, result, categories, tags] = await Promise.all([
    BlogService.getFeaturedPosts(3),
    BlogService.getPostsByTag(slug, page, 12),
    BlogService.getCategories(),
    BlogService.getTags(),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          {tag.nameEn} / {tag.nameAr}
        </h1>
        <BlogListingClient
          featuredPosts={featured}
          initialPosts={result.posts}
          initialTotal={result.total}
          initialPage={page}
          initialTotalPages={result.totalPages}
          categories={categories}
          tags={tags}
          initialTags={[slug]}
          initialSort={(sp.sort as 'newest' | 'popular' | 'relevant') ?? 'newest'}
          basePath={`/blog/tag/${slug}`}
        />
      </div>
    </main>
  )
}
