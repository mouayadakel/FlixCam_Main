/**
 * Blog category page - posts filtered by category.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogService } from '@/lib/services/blog.service'
import { BlogListingClient } from '@/components/blog/blog-listing-client'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; sort?: string; q?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await BlogService.getCategoryBySlug(slug)
  if (!category) return { title: 'Category not found' }
  return {
    title: `${category.nameEn} | ${category.nameAr} | Blog | FlixCam.rent`,
    description: category.descriptionEn ?? category.descriptionAr ?? `Blog posts in ${category.nameEn}`,
    alternates: { canonical: `${BASE_URL}/blog/category/${slug}` },
    openGraph: {
      title: `${category.nameEn} | Blog | FlixCam.rent`,
      url: `${BASE_URL}/blog/category/${slug}`,
      type: 'website',
    },
  }
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const category = await BlogService.getCategoryBySlug(slug)
  if (!category) notFound()

  const [featured, result, categories, tags] = await Promise.all([
    BlogService.getFeaturedPosts(3),
    BlogService.getPostsByCategory(slug, page, 12),
    BlogService.getCategories(),
    BlogService.getTags(),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          {category.nameEn} / {category.nameAr}
        </h1>
        <BlogListingClient
          featuredPosts={featured}
          initialPosts={result.posts}
          initialTotal={result.total}
          initialPage={page}
          initialTotalPages={result.totalPages}
          categories={categories}
          tags={tags}
          initialCategory={slug}
          initialSort={(sp.sort as 'newest' | 'popular' | 'relevant') ?? 'newest'}
          basePath={`/blog/category/${slug}`}
        />
      </div>
    </main>
  )
}
