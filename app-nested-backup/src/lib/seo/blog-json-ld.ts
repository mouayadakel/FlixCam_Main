/**
 * JSON-LD schema generators for blog SEO.
 */

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export interface ArticleSchemaInput {
  title: string
  description: string
  slug: string
  coverImage: string
  publishedAt: Date | null
  updatedAt: Date
  authorName: string
  categoryName: string
}

export function buildArticleSchema(input: ArticleSchemaInput): object {
  const url = `${BASE_URL}/blog/${input.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    image: input.coverImage,
    url,
    datePublished: input.publishedAt?.toISOString() ?? input.updatedAt.toISOString(),
    dateModified: input.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: input.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'FlixCam',
      url: BASE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: input.categoryName,
  }
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export interface BlogSchemaInput {
  posts: Array<{
    slug: string
    titleAr: string
    titleEn: string
    excerptAr: string
    excerptEn: string
    publishedAt: Date | null
    updatedAt: Date
    author: { name: string }
  }>
  locale?: 'ar' | 'en'
}

export function buildBlogSchema(input: BlogSchemaInput): object {
  const locale = input.locale ?? 'ar'
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: locale === 'ar' ? 'مدونة FlixCam' : 'FlixCam Blog',
    url: `${BASE_URL}/blog`,
    description:
      locale === 'ar'
        ? 'نصائح ومقالات عن تأجير معدات التصوير السينمائي'
        : 'Tips and articles on cinematic equipment rental',
    blogPost: input.posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: locale === 'ar' ? p.titleAr : p.titleEn,
      description: locale === 'ar' ? p.excerptAr : p.excerptEn,
      url: `${BASE_URL}/blog/${p.slug}`,
      datePublished: p.publishedAt?.toISOString() ?? p.updatedAt.toISOString(),
      dateModified: p.updatedAt.toISOString(),
      author: p.author.name,
    })),
  }
}

export interface FAQItem {
  question: string
  answer: string
}

export function buildFAQPageSchema(items: FAQItem[]): object {
  if (items.length === 0) return {}
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export interface BlogPostPublic {
  content: unknown
  slug: string
  titleAr: string
  titleEn: string
  excerptAr: string
  excerptEn: string
  coverImage: string
  coverImageAltAr: string | null
  coverImageAltEn: string | null
  publishedAt: Date | null
  updatedAt: Date
  author: { name: string }
  category: { nameAr: string; nameEn: string; slug: string }
}

/**
 * Extract FAQ items from Tiptap JSON content for FAQPage schema.
 */
export function extractFAQFromContent(content: unknown): FAQItem[] {
  const items: FAQItem[] = []
  if (!content || typeof content !== 'object') return items

  const doc = content as { content?: Array<Record<string, unknown>> }
  const nodes = doc.content ?? []

  function walk(nodes: Array<Record<string, unknown>>) {
    for (const node of nodes) {
      if (node.type === 'faq') {
        const attrs = (node.attrs ?? {}) as Record<string, unknown>
        const faqItems = (attrs.items as Array<{ question: string; answer: string }>) ?? []
        items.push(...faqItems)
      }
      const childContent = node.content as Array<Record<string, unknown>> | undefined
      if (childContent?.length) {
        walk(childContent)
      }
    }
  }

  walk(nodes)
  return items
}
