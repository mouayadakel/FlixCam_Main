/**
 * Hero carousel – Embla-based hero banner with autoplay, dots, progress bar, video support.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { PublicSearch } from '@/components/public/public-search'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export interface HeroSlideData {
  id: string
  imageUrl: string
  mobileImageUrl: string | null
  videoUrl: string | null
  titleAr: string
  titleEn: string
  titleZh: string | null
  subtitleAr: string | null
  subtitleEn: string | null
  subtitleZh: string | null
  badgeTextAr: string | null
  badgeTextEn: string | null
  badgeTextZh: string | null
  ctaTextAr: string | null
  ctaTextEn: string | null
  ctaTextZh: string | null
  ctaUrl: string | null
  ctaStyle: string
  cta2TextAr: string | null
  cta2TextEn: string | null
  cta2TextZh: string | null
  cta2Url: string | null
  cta2Style: string | null
  order: number
  overlayOpacity: number
  textPosition: string
}

export interface HeroCarouselSettings {
  autoPlay: boolean
  autoPlayInterval: number
  transitionType: string
}

function getSlideText(
  slide: HeroSlideData,
  locale: string
): { title: string; subtitle: string; badge: string; ctaText: string; cta2Text: string } {
  const isAr = locale === 'ar'
  const isZh = locale === 'zh'
  return {
    title: isAr ? slide.titleAr : isZh ? slide.titleZh || slide.titleEn : slide.titleEn,
    subtitle: isAr
      ? slide.subtitleAr || slide.subtitleEn || ''
      : isZh
        ? slide.subtitleZh || slide.subtitleEn || ''
        : slide.subtitleEn || slide.subtitleAr || '',
    badge: isAr
      ? slide.badgeTextAr || slide.badgeTextEn || ''
      : isZh
        ? slide.badgeTextZh || slide.badgeTextEn || ''
        : slide.badgeTextEn || slide.badgeTextAr || '',
    ctaText: isAr
      ? slide.ctaTextAr || slide.ctaTextEn || ''
      : isZh
        ? slide.ctaTextZh || slide.ctaTextEn || ''
        : slide.ctaTextEn || slide.ctaTextAr || '',
    cta2Text: isAr
      ? slide.cta2TextAr || slide.cta2TextEn || ''
      : isZh
        ? slide.cta2TextZh || slide.cta2TextEn || ''
        : slide.cta2TextEn || slide.cta2TextAr || '',
  }
}

export function HeroCarousel({
  slides,
  settings,
}: {
  slides: HeroSlideData[]
  settings: HeroCarouselSettings
}) {
  const { locale, dir } = useLocale()
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      direction: dir === 'rtl' ? 'rtl' : 'ltr',
      duration: settings.transitionType === 'slide' ? 30 : 20,
    },
    [
      Autoplay({
        delay: settings.autoPlayInterval,
        stopOnInteraction: true,
        playOnInit:
          settings.autoPlay &&
          typeof window !== 'undefined' &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      }),
    ]
  )
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set())
  const [failedVideoMobileIds, setFailedVideoMobileIds] = useState<Set<string>>(new Set())
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleImageError = useCallback((slideId: string) => {
    setFailedImageIds((prev) => new Set(prev).add(slideId))
  }, [])
  const handleVideoMobileImageError = useCallback((slideId: string) => {
    setFailedVideoMobileIds((prev) => new Set(prev).add(slideId))
  }, [])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi]
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setProgress(0)
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  // Autoplay progress bar (resets each slide)
  useEffect(() => {
    if (!settings.autoPlay || !emblaApi || slides.length === 0) return
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const start = Date.now()
    const duration = settings.autoPlayInterval
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const p = Math.min(100, (elapsed / duration) * 100)
      setProgress(p)
      if (p >= 100) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }
    }, 50)
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [emblaApi, selectedIndex, settings.autoPlay, settings.autoPlayInterval, slides.length])

  if (slides.length === 0) return null

  const hasValidImageUrl = (url: string | null | undefined) =>
    typeof url === 'string' &&
    url.trim().length > 0 &&
    (url.startsWith('http://') || url.startsWith('https://'))

  return (
    <section
      className="relative overflow-hidden bg-hero-gradient"
      aria-roledescription="carousel"
      aria-label="Hero Banner"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
      <div className="absolute -end-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -start-32 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

      {/* Search bar – left corner at golden ratio (38.2% from top) */}
      <div className="pointer-events-none absolute left-0 right-0 top-[38.2%] z-10">
        <PublicContainer className="pointer-events-auto">
          <div className="w-full max-w-md">
            <PublicSearch />
          </div>
        </PublicContainer>
      </div>

      <div className="embla relative">
        <div
          className="embla__viewport min-h-[400px] overflow-hidden md:min-h-[440px]"
          ref={emblaRef}
        >
          <div className="embla__container flex touch-pan-y">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="embla__slide flex min-w-0 flex-[0_0_100%] flex-col"
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${slides.length}`}
              >
                <div className="relative min-h-[400px] w-full min-w-0 flex-1 md:min-h-[440px]">
                  {/* Background: video or image or fallback (hero gradient so text stays visible) */}
                  {hasValidImageUrl(slide.videoUrl) ? (
                    <div className="absolute inset-0">
                      <video
                        className="absolute inset-0 h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        aria-hidden
                      >
                        <source src={slide.videoUrl!} />
                      </video>
                      {failedVideoMobileIds.has(slide.id) || !hasValidImageUrl(slide.imageUrl) ? (
                        <div
                          className="absolute inset-0 bg-hero-gradient md:hidden"
                          aria-hidden
                          role="img"
                          aria-label="Image unavailable"
                        />
                      ) : (
                        <Image
                          src={slide.imageUrl}
                          alt={getSlideText(slide, locale).title || 'FlixCam hero banner'}
                          fill
                          className="object-cover md:hidden"
                          sizes="100vw"
                          aria-hidden
                          onError={() => handleVideoMobileImageError(slide.id)}
                        />
                      )}
                    </div>
                  ) : !hasValidImageUrl(slide.imageUrl) || failedImageIds.has(slide.id) ? (
                    <div
                      className="absolute inset-0 bg-hero-gradient"
                      aria-hidden
                      role="img"
                      aria-label="Image unavailable"
                    />
                  ) : (
                    <>
                      {hasValidImageUrl(slide.mobileImageUrl) ? (
                        <>
                          <span className="absolute inset-0 md:hidden">
                            <Image
                              src={slide.mobileImageUrl!}
                              alt={getSlideText(slide, locale).title || 'FlixCam hero banner'}
                              fill
                              className="object-cover"
                              sizes="100vw"
                              priority={index === 0}
                              aria-hidden
                              onError={() => handleImageError(slide.id)}
                            />
                          </span>
                          <span className="absolute inset-0 hidden md:block">
                            <Image
                              src={slide.imageUrl}
                              alt={getSlideText(slide, locale).title || 'FlixCam hero banner'}
                              fill
                              className="object-cover"
                              sizes="100vw"
                              priority={index === 0}
                              aria-hidden
                              onError={() => handleImageError(slide.id)}
                            />
                          </span>
                        </>
                      ) : (
                        <Image
                          src={slide.imageUrl}
                          alt={getSlideText(slide, locale).title || 'FlixCam hero banner'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 100vw"
                          priority={index === 0}
                          aria-hidden
                          onError={() => handleImageError(slide.id)}
                        />
                      )}
                    </>
                  )}
                  {/* Overlay */}
                  <div
                    className="hero-carousel-overlay pointer-events-none absolute inset-0 z-[1] bg-black transition-opacity"
                    style={{ ['--hero-overlay-opacity' as string]: String(slide.overlayOpacity) }}
                    aria-hidden
                  />
                  {/* Content */}
                  <PublicContainer className="relative z-[2]">
                    <div
                      className={`relative flex min-h-[400px] flex-col items-center justify-center gap-10 py-16 md:min-h-[440px] md:flex-row md:items-center md:gap-16 lg:py-20 ${
                        slide.textPosition === 'center'
                          ? 'text-center'
                          : slide.textPosition === 'end'
                            ? 'text-end md:flex-row-reverse'
                            : 'text-center md:text-start'
                      }`}
                    >
                      <div
                        className={`flex flex-1 flex-col ${
                          slide.textPosition === 'center'
                            ? 'items-center'
                            : slide.textPosition === 'end'
                              ? 'items-end'
                              : 'items-center md:items-start'
                        }`}
                      >
                        {getSlideText(slide, locale).badge && (
                          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
                            <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-brand-secondary-accent" />
                            {getSlideText(slide, locale).badge}
                          </div>
                        )}
                        <h1 className="text-hero-title text-white md:text-[44px] lg:text-[52px]">
                          {getSlideText(slide, locale).title}
                        </h1>
                        {getSlideText(slide, locale).subtitle && (
                          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75 md:text-lg">
                            {getSlideText(slide, locale).subtitle}
                          </p>
                        )}
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                          {slide.ctaUrl && getSlideText(slide, locale).ctaText && (
                            <Button
                              size="lg"
                              variant={slide.ctaStyle === 'outline' ? 'outline' : 'default'}
                              className={
                                slide.ctaStyle === 'outline'
                                  ? 'rounded-xl border-white/30 px-8 font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:text-white'
                                  : 'rounded-xl bg-white px-8 font-semibold text-brand-primary shadow-lg hover:bg-white/90'
                              }
                              asChild
                            >
                              <Link href={slide.ctaUrl}>
                                {getSlideText(slide, locale).ctaText}
                                <ArrowRight className="ms-2 h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {slide.cta2Url && getSlideText(slide, locale).cta2Text && (
                            <Button
                              size="lg"
                              variant="outline"
                              className="rounded-xl border-white/30 px-8 font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
                              asChild
                            >
                              <Link href={slide.cta2Url}>
                                {getSlideText(slide, locale).cta2Text}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </PublicContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot navigation */}
        <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`h-2 rounded-full transition-all hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-white ${
                selectedIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={selectedIndex === index ? 'true' : undefined}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>

        {/* Autoplay progress bar (current slide) */}
        {settings.autoPlay && slides.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/20"
            role="presentation"
          >
            <div
              className="hero-carousel-progress-fill h-full bg-white/70 transition-all duration-100"
              style={{ ['--hero-progress' as string]: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
