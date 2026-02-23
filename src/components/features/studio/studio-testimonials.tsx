/**
 * Studio testimonials: social proof carousel/grid
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

export interface StudioTestimonial {
  id: string
  name: string
  role: string | null
  text: string
  rating: number
  avatarUrl: string | null
}

interface StudioTestimonialsProps {
  testimonials: StudioTestimonial[]
}

export function StudioTestimonials({ testimonials }: StudioTestimonialsProps) {
  const { t } = useLocale()
  const [activeIndex, setActiveIndex] = useState(0)

  if (testimonials.length === 0) return null

  const showNav = testimonials.length > 1
  const current = testimonials[activeIndex]

  const prev = () => setActiveIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1))
  const next = () => setActiveIndex((i) => (i === testimonials.length - 1 ? 0 : i + 1))

  return (
    <section className="space-y-4 rounded-2xl border border-border-light/40 bg-white p-6 shadow-card" dir="rtl">
      <h3 className="text-lg font-semibold text-text-heading">
        {t('studios.testimonials')}
      </h3>

      {/* Featured testimonial */}
      <div className="relative rounded-xl bg-surface-light p-5">
        <Quote className="absolute top-4 end-4 h-8 w-8 text-primary/10" />

        <div className="space-y-3">
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <Star
                key={v}
                className={`h-4 w-4 ${
                  v <= current.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                }`}
              />
            ))}
          </div>

          {/* Text */}
          <p className="text-sm leading-relaxed text-text-body">&quot;{current.text}&quot;</p>

          {/* Author */}
          <div className="flex items-center gap-3">
            {current.avatarUrl ? (
              <Image
                src={current.avatarUrl}
                alt={current.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary">
                {current.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-text-heading">{current.name}</p>
              {current.role && (
                <p className="text-xs text-text-muted">{current.role}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {showNav && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex ? 'w-6 bg-primary' : 'w-2 bg-neutral-200 hover:bg-neutral-300'
                }`}
                aria-label={`testimonial ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={prev}
              className="rounded-lg border border-border-light/40 p-1.5 text-text-muted transition-colors hover:bg-surface-light hover:text-text-heading"
              aria-label="Previous"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-lg border border-border-light/40 p-1.5 text-text-muted transition-colors hover:bg-surface-light hover:text-text-heading"
              aria-label="Next"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
