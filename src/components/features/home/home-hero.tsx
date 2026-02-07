/**
 * Homepage hero section – banner_contained, brand primary bg,
 * text left + image right (cutout). Responsive: stack on small.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'

export function HomeHero() {
  const { t } = useLocale()

  return (
    <section className="relative overflow-hidden rounded-b-hero-banner bg-brand-primary text-white">
      <PublicContainer>
        <div className="flex min-h-[320px] flex-col items-center gap-8 py-12 md:min-h-[360px] md:flex-row md:items-center md:gap-12 lg:py-16">
          {/* Text block – left on md+, first on small */}
          <div className="flex-1 text-center md:text-start">
            <h1 className="text-hero-title leading-tight text-inverse-heading md:text-3xl lg:text-4xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-4 text-body-main text-inverse-body">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <Button
                size="lg"
                className="bg-white text-brand-primary hover:bg-white/90"
                asChild
              >
                <Link href="/equipment">{t('common.bookNow')}</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/studios">{t('home.exploreStudios')}</Link>
              </Button>
            </div>
          </div>

          {/* Image – right on md+, with cutout overlap */}
          <div className="relative w-full flex-shrink-0 md:w-[45%] lg:w-[400px]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-public-card md:aspect-[16/10]">
              <Image
                src={HERO_IMAGE_URL}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 45vw"
                priority
              />
            </div>
          </div>
        </div>
      </PublicContainer>
    </section>
  )
}
