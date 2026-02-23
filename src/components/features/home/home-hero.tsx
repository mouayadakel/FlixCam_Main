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
import { PublicSearch } from '@/components/public/public-search'
import type { HeroBannerPublic } from '@/lib/services/hero-banner.service'

const DEFAULT_HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'

export function HomeHero({
  banner,
  heroImageUrl,
}: {
  banner?: HeroBannerPublic | null
  heroImageUrl?: string | null
}) {
  const resolvedHeroImage = heroImageUrl || DEFAULT_HERO_IMAGE_URL
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
      <div className="absolute -end-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -start-32 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

      <PublicContainer>
        {/* Search bar – left corner at golden ratio (38.2% from top) */}
        <div className="absolute left-0 right-0 top-[38.2%] z-10">
          <PublicContainer>
            <div className="w-full max-w-md animate-fade-in opacity-0 [animation-delay:0.2s]">
              <PublicSearch />
            </div>
          </PublicContainer>
        </div>

        <div className="relative flex min-h-[400px] flex-col items-center gap-10 py-16 md:min-h-[440px] md:flex-row md:items-center md:gap-16 lg:py-20">
          {/* Text block – left on md+, first on small */}
          <div className="flex-1 animate-fade-in text-center opacity-0 md:text-start">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-brand-secondary-accent" />
              {t('home.heroSubtitle')}
            </div>
            <h1 className="text-[28px] font-extrabold leading-tight text-white min-[640px]:text-hero-title md:text-[44px] lg:text-[52px]">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75 md:text-lg">
              {t('home.heroSubtitle')}
            </p>

            <div className="mt-8 flex animate-fade-in flex-wrap items-center justify-center gap-3 opacity-0 [animation-delay:0.4s] md:justify-start">
              <Button
                size="lg"
                className="min-h-[44px] w-full rounded-[4px] bg-white px-8 font-semibold text-[#1A1A1A] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl active:scale-95 sm:w-auto"
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
                className="rounded-[4px] border-white/30 px-8 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/studios">{t('home.exploreStudios')}</Link>
              </Button>
            </div>
          </div>

          {/* Image – right on md+, with modern treatment */}
          <div className="relative w-full flex-shrink-0 animate-slide-in-right opacity-0 [animation-delay:0.3s] md:w-[45%] lg:w-[420px]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 md:aspect-[16/10]">
              <Image
                src={resolvedHeroImage}
                alt="FlixCam — تأجير المعدات السينمائية واستوديوهات التصوير الاحترافي"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 45vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            {/* Floating decorative element */}
            <div className="absolute -bottom-4 -start-4 h-24 w-24 animate-float rounded-2xl bg-white/10 backdrop-blur-md" />
          </div>
        </div>
      </PublicContainer>
    </section>
  )
}
