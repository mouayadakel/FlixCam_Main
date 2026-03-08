/**
 * Blog post detail client - cover, content, TOC, share, author, reactions.
 */

'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import type { BlogPostPublic, BlogPostListItem } from '@/lib/types/blog.types'
import type { ReactionCounts } from '@/lib/types/blog.types'
import { useLocale } from '@/hooks/use-locale'

const TiptapRenderer = dynamic(() => import('./tiptap-renderer').then((m) => ({ default: m.TiptapRenderer })), {
  loading: () => <div className="min-h-[200px] animate-pulse rounded-lg bg-gray-100" />,
  ssr: true,
})
import { ShareBar } from './share-bar'
import { AuthorBio } from './author-bio'
import { TableOfContents } from './table-of-contents'
import { ReadingProgress } from './reading-progress'
import { Reactions } from './reactions'
import { ViewCounter } from './view-counter'
import { BlogStatusBadge } from './blog-status-badge'
import { BlogRelatedEquipment } from './blog-related-equipment'
import { BlogStickyCta } from './blog-sticky-cta'
import { BlogNewsletterCta } from './blog-newsletter-cta'

interface BlogPostClientProps {
  post: BlogPostPublic
  relatedPosts: BlogPostListItem[]
  reactionCounts: ReactionCounts
  isPreview: boolean
  postUrl: string
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function BlogPostClient({ post, relatedPosts, reactionCounts, isPreview, postUrl }: BlogPostClientProps) {
  const { locale } = useLocale()
  const title = locale === 'ar' ? post.titleAr : post.titleEn
  const coverAlt = locale === 'ar' ? post.coverImageAltAr ?? post.titleAr : post.coverImageAltEn ?? post.titleEn

  return (
    <article className="mx-auto max-w-4xl">
      <ViewCounter postId={post.id} slug={post.slug} />
      <BlogStickyCta
        locale={locale}
        categorySlug={post.category.slug}
        primaryCtaTextAr={post.primaryCtaTextAr}
        primaryCtaTextEn={post.primaryCtaTextEn}
        primaryCtaUrl={post.primaryCtaUrl}
        secondaryCtaTextAr={post.secondaryCtaTextAr}
        secondaryCtaTextEn={post.secondaryCtaTextEn}
        secondaryCtaUrl={post.secondaryCtaUrl}
        relatedEquipmentIds={post.relatedEquipmentIds ?? []}
      />
      <ReadingProgress />

      {/* Preview banner */}
      {isPreview && (
        <div className="flex items-center justify-center gap-3 bg-amber-500 py-2.5 text-center text-sm font-medium text-white">
          <span>{locale === 'ar' ? 'معاينة' : 'Preview'}</span>
          <BlogStatusBadge status={post.status} locale={locale === 'ar' ? 'ar' : 'en'} className="border-white/30 bg-white/20 text-white" />
        </div>
      )}

      {/* Cover image - dark section */}
      <header className="relative h-[320px] overflow-hidden bg-gray-900 md:h-[420px]">
        <Image
          src={post.coverImage}
          alt={coverAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 896px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <nav className="mb-4 text-sm text-gray-300" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">
              {locale === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:text-white">
              {locale === 'ar' ? 'المدونة' : 'Blog'}
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/blog/category/${post.category.slug}`} className="hover:text-white">
              {locale === 'ar' ? post.category.nameAr : post.category.nameEn}
            </Link>
          </nav>
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="mb-2 inline-block w-fit rounded-full bg-brand-primary/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-primary"
          >
            {locale === 'ar' ? post.category.nameAr : post.category.nameEn}
          </Link>
          <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">{title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <span>{post.author.name}</span>
            <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </time>
            {post.readingTime && (
              <span>
                {post.readingTime} {locale === 'ar' ? 'دقيقة قراءة' : 'min read'}
              </span>
            )}
            {post.views > 0 && (
              <span>
                {post.views} {locale === 'ar' ? 'مشاهدة' : 'views'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content - light section with sidebar */}
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Main content */}
          <div className="min-w-0 flex-1">
            <div className="prose prose-lg max-w-none prose-headings:font-bold prose-p:text-gray-700 prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline">
              <TiptapRenderer content={post.content} locale={locale} />
            </div>

            <ShareBar url={postUrl} title={title} locale={locale} postId={post.id} />

            {post.relatedEquipmentIds?.length > 0 && (
              <BlogRelatedEquipment
                equipmentIds={post.relatedEquipmentIds}
                locale={locale}
              />
            )}

            <Reactions
              postId={post.id}
              initialCounts={reactionCounts}
              locale={locale}
            />

            <BlogNewsletterCta locale={locale} />

            <AuthorBio author={post.author} locale={locale} />
          </div>

          {/* TOC sidebar */}
          <aside className="w-56 shrink-0">
            <TableOfContents content={post.content} locale={locale} />
          </aside>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 border-t border-gray-200 pt-12">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              {locale === 'ar' ? 'مقالات ذات صلة' : 'Related Articles'}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                    <Image
                      src={p.coverImage}
                      alt={locale === 'ar' ? p.coverImageAltAr ?? p.titleAr : p.coverImageAltEn ?? p.titleEn}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-brand-primary">
                      {locale === 'ar' ? p.titleAr : p.titleEn}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(p.publishedAt ?? p.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}
