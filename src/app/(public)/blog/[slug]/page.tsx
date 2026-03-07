/**
 * Blog post detail page.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogService } from '@/lib/services/blog.service'
import { BlogPostClient } from '@/components/blog/blog-post-client'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string; token?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { preview, token } = await searchParams
  const isValidPreview = Boolean(preview === 'true' && token && process.env.BLOG_PREVIEW_TOKEN === token)

  const post = await BlogService.getPostBySlug(slug, {
    allowDraft: isValidPreview,
    previewToken: token ?? undefined,
  })
  if (!post) return { title: 'Post not found' }

  const locale = 'ar'
  const title = locale === 'ar' ? post.metaTitleAr ?? post.titleAr : post.metaTitleEn ?? post.titleEn
  const description = locale === 'ar' ? post.metaDescriptionAr ?? post.excerptAr : post.metaDescriptionEn ?? post.excerptEn
  const keywords = locale === 'ar' ? post.metaKeywordsAr : post.metaKeywordsEn
  const imageUrl =
    post.ogImage && post.ogImage.startsWith('http')
      ? post.ogImage
      : post.coverImage?.startsWith('http')
        ? post.coverImage
        : `${BASE_URL}/api/og?slug=${post.slug}`

  return {
    title: `${title} | FlixCam.rent`,
    description,
    keywords: keywords ? keywords.split(',').map((k) => k.trim()) : undefined,
    alternates: generateAlternatesMetadata(`/blog/${post.slug}`),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview, token } = await searchParams
  const isValidPreview = Boolean(preview === 'true' && token && process.env.BLOG_PREVIEW_TOKEN === token)

  const post = await BlogService.getPostBySlug(slug, {
    allowDraft: isValidPreview,
    previewToken: token ?? undefined,
  })

  if (!post) notFound()

  const relatedPosts = await BlogService.getRelatedPosts(post.id, post.category.id, 3)
  const reactionCounts = await BlogService.getReactionCounts(post.id)
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

  const { buildArticleSchema, buildBreadcrumbSchema, buildFAQPageSchema, extractFAQFromContent } = await import(
    '@/lib/seo/blog-json-ld'
  )
  const articleSchema = buildArticleSchema({
    title: post.titleEn,
    description: post.metaDescriptionEn ?? post.excerptEn,
    slug: post.slug,
    coverImage: post.coverImage.startsWith('http') ? post.coverImage : `${baseUrl}${post.coverImage}`,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    authorName: post.author.name,
    categoryName: post.category.nameEn,
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: baseUrl },
    { name: 'Blog', url: `${baseUrl}/blog` },
    { name: post.category.nameEn, url: `${baseUrl}/blog/category/${post.category.slug}` },
    { name: post.titleEn, url: `${baseUrl}/blog/${post.slug}` },
  ])
  const faqItems = extractFAQFromContent(post.content)
  const faqSchema = faqItems.length > 0 ? buildFAQPageSchema(faqItems) : null

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <BlogPostClient
        post={post}
        relatedPosts={relatedPosts}
        reactionCounts={reactionCounts}
        isPreview={!!isValidPreview}
        postUrl={`${baseUrl}/blog/${post.slug}`}
      />
    </main>
  )
}
