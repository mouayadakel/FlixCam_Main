/**
 * Blog post card - image, title, excerpt, date, category, reading time.
 */

import Link from 'next/link'
import Image from 'next/image'
import type { BlogPostListItem } from '@/lib/types/blog.types'
import { CategoryBadge } from './category-badge'

interface BlogCardProps {
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

export function BlogCard({ post, locale }: BlogCardProps) {
  const title = locale === 'ar' ? post.titleAr : post.titleEn
  const excerpt = locale === 'ar' ? post.excerptAr : post.excerptEn
  const coverAlt = locale === 'ar' ? post.coverImageAltAr ?? post.titleAr : post.coverImageAltEn ?? post.titleEn

  return (
    <article className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          <Image
            src={post.coverImage}
            alt={coverAlt}
            fill
            className="object-cover transition-transform duration-350 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {post.trending && (
            <span className="absolute start-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white animate-pulse-subtle">
              {locale === 'ar' ? 'رائج' : 'Trending'}
            </span>
          )}
        </div>
        <div className="p-5">
          <CategoryBadge
            nameAr={post.category.nameAr}
            nameEn={post.category.nameEn}
            slug={post.category.slug}
            locale={locale}
            clickable={false}
            className="mb-2"
          />
          <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-brand-primary">
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{excerpt}</p>
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
            <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </time>
            {post.readingTime && (
              <>
                <span aria-hidden>·</span>
                <span>{post.readingTime} min</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}
