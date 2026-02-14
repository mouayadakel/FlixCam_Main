/**
 * Homepage hero section – dramatic gradient background with floating search form,
 * text left + image right with overlay treatment. Polished animations.
 */

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight, Calendar } from 'lucide-react'

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'

function getDefaultDates() {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function HomeHero() {
  const { t } = useLocale()
  const router = useRouter()
  const [q, setQ] = useState('')
  const defaultDates = getDefaultDates()
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    router.push(`/equipment?${params.toString()}`)
  }

  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
      <div className="absolute -top-24 -end-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -start-32 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

      <PublicContainer>
        <div className="relative flex min-h-[400px] flex-col items-center gap-10 py-16 md:min-h-[440px] md:flex-row md:items-center md:gap-16 lg:py-20">
          {/* Text block – left on md+, first on small */}
          <div className="flex-1 text-center md:text-start opacity-0 animate-fade-in">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary-accent animate-pulse-subtle" />
              {t('home.heroSubtitle')}
            </div>
            <h1 className="text-hero-title text-white md:text-[44px] lg:text-[52px]">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75 md:text-lg">
              {t('home.heroSubtitle')}
            </p>

            {/* Search form – floating card style */}
            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-8 w-full max-w-2xl rounded-2xl bg-white p-2 shadow-modal sm:p-3 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
              aria-label={t('common.search')}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-[2]">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    id="hero-q"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t('home.heroSearchPlaceholder')}
                    className="h-12 border-border-light bg-surface-light ps-10 text-text-heading placeholder:text-text-muted/70 rounded-xl focus-visible:ring-brand-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1">
                  <div className="relative">
                    <Calendar className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <Input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-12 border-border-light bg-surface-light ps-10 text-text-heading rounded-xl focus-visible:ring-brand-primary/20"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-12 border-border-light bg-surface-light ps-10 text-text-heading rounded-xl focus-visible:ring-brand-primary/20"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 bg-brand-primary hover:bg-brand-primary-hover rounded-xl px-8 font-semibold shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  <Search className="me-2 h-4 w-4" />
                  {t('common.search')}
                </Button>
              </div>
            </form>

            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start opacity-0 animate-fade-in"
              style={{ animationDelay: '0.4s' }}
            >
              <Button
                size="lg"
                className="bg-white text-brand-primary hover:bg-white/90 rounded-xl px-8 font-semibold shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
                asChild
              >
                <Link href="/equipment">
                  {t('common.bookNow')}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-xl px-8 font-semibold backdrop-blur-sm transition-all"
                asChild
              >
                <Link href="/studios">{t('home.exploreStudios')}</Link>
              </Button>
            </div>
          </div>

          {/* Image – right on md+, with modern treatment */}
          <div
            className="relative w-full flex-shrink-0 md:w-[45%] lg:w-[420px] opacity-0 animate-slide-in-right"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 md:aspect-[16/10]">
              <Image
                src={HERO_IMAGE_URL}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 45vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            {/* Floating decorative element */}
            <div className="absolute -bottom-4 -start-4 h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-md animate-float" />
          </div>
        </div>
      </PublicContainer>
    </section>
  )
}
