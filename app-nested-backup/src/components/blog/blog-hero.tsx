/**
 * Featured post hero - dark gradient overlay, cover image, category badge.
 */

import Link from 'next/link'
import Image from 'next/image'
import type { BlogPostListItem } from '@/lib/types/blog.types'
import { CategoryBadge } from './category-badge'

interface BlogHeroProps {
  post: BlogPostListItem
  locale: string
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function BlogHero({ post, locale }: BlogHeroProps) {
  const title = locale === 'ar' ? post.titleAr : post.titleEn
  const excerpt = locale === 'ar' ? post.excerptAr : post.excerptEn
  const coverAlt = locale === 'ar' ? post.coverImageAltAr ?? post.titleAr : post.coverImageAltEn ?? post.titleEn

  return (
    <header className="relative overflow-hidden rounded-2xl bg-gray-900" role="banner">
      <div className="absolute inset-0">
        <Image
          src={post.coverImage}
          alt={coverAlt}
          fill
          className="object-cover opacity-60"
          sizes="(max-width: 768px) 100vw, 1280px"
          priority
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-transparent"
          aria-hidden
        />
      </div>
      <div className="relative flex min-h-[320px] flex-col justify-end p-8 md:min-h-[400px] md:p-12">
        <CategoryBadge
          nameAr={post.category.nameAr}
          nameEn={post.category.nameEn}
          slug={post.category.slug}
          locale={locale}
          className="mb-2"
        />
        <Link href={`/blog/${post.slug}`} className="group">
          <h1 className="mb-2 text-3xl font-bold text-white transition-colors group-hover:text-brand-primary md:text-4xl lg:text-5xl">
            {title}
          </h1>
        </Link>
        <p className="max-w-2xl text-lg text-gray-300 line-clamp-2">{excerpt}</p>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
          <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>
            {formatDate(post.publishedAt ?? post.createdAt)}
          </time>
          {post.readingTime && (
            <span>
              {post.readingTime} {locale === 'ar' ? 'دقيقة قراءة' : 'min read'}
            </span>
          )}
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-6 inline-flex w-fit items-center rounded-lg bg-brand-primary px-6 py-3 font-medium text-white transition-colors hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          {locale === 'ar' ? 'اقرأ المزيد' : 'Read more'}
        </Link>
      </div>
    </header>
  )
}
