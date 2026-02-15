/**
 * Homepage hero section – dynamic carousel when banner data exists,
 * otherwise static gradient + CTA. Polished animations.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { HeroCarousel } from '@/components/features/home/hero-carousel'
import type { HeroBannerPublic } from '@/lib/services/hero-banner.service'

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'

export function HomeHero({ banner }: { banner?: HeroBannerPublic | null }) {
  const { t } = useLocale()

  if (banner?.slides?.length) {
    return (
      <HeroCarousel
        slides={banner.slides}
        settings={{
          autoPlay: banner.autoPlay,
          autoPlayInterval: banner.autoPlayInterval,
          transitionType: banner.transitionType,
        }}
      />
    )
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

            {/* Search form hidden */}

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
