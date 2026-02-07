/**
 * Homepage testimonials – centered stack: avatar, quote, star rating, author.
 * Content from i18n home.testimonials.
 */

'use client'

import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { getMessages } from '@/lib/i18n/translate'
import { PublicContainer } from '@/components/public/public-container'

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
    <section className="py-12 md:py-16 lg:py-20 border-t border-border-light bg-surface-light">
      <PublicContainer>
        <h2 className="mb-10 text-center text-section-title text-text-heading">
          {t('home.testimonialsTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface-light">
                <Image
                  src={AVATAR_PLACEHOLDER}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <p className="mt-4 text-body-main text-text-body">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-2 flex gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < (item.rating ?? 5)
                        ? 'text-warning-500'
                        : 'text-border-light'
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="mt-2 text-label-small font-medium uppercase tracking-wide text-text-muted">
                {item.authorName}
              </p>
            </div>
          ))}
        </div>
      </PublicContainer>
    </section>
  )
}
