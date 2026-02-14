/**
 * Homepage testimonials – card-based layout with avatars, quotes, star ratings, and author names.
 * Modern card design with subtle shadows and quotation marks.
 */

'use client'

import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { getMessages } from '@/lib/i18n/translate'
import { PublicContainer } from '@/components/public/public-container'
import { Quote } from 'lucide-react'

const AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face'

interface TestimonialEntry {
  quote: string
  authorName: string
  rating: number
}

export function HomeTestimonials() {
  const { locale, t } = useLocale()
  const messages = getMessages(locale) as Record<string, unknown>
  const home = messages?.home as Record<string, unknown> | undefined
  const testimonials = (home?.testimonials as TestimonialEntry[] | undefined) ?? []

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-white border-t border-border-light/50">
      <PublicContainer>
        <div className="mb-12 text-center">
          <h2 className="text-section-title text-text-heading">
            {t('home.testimonialsTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-body-main text-text-body">
            {t('home.heroSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {testimonials.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className="group relative flex flex-col rounded-2xl border border-border-light/60 bg-surface-light/30 p-6 transition-all duration-300 hover:bg-white hover:shadow-card-hover hover:border-brand-primary/10 opacity-0 animate-fade-in-up md:p-8"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              {/* Quotation mark */}
              <Quote className="mb-4 h-8 w-8 text-brand-primary/20 transition-colors group-hover:text-brand-primary/40" />

              {/* Quote text */}
              <p className="flex-1 text-body-main leading-relaxed text-text-body">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Rating stars */}
              <div className="mt-4 flex gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${
                      i < (item.rating ?? 5)
                        ? 'text-warning-500'
                        : 'text-border-light'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Author */}
              <div className="mt-4 flex items-center gap-3 border-t border-border-light/60 pt-4">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-primary/10">
                  <Image
                    src={AVATAR_PLACEHOLDER}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <span className="text-sm font-semibold text-text-heading">
                  {item.authorName}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PublicContainer>
    </section>
  )
}
