/**
 * Root page at /. Renders the public homepage.
 * Inline implementation to avoid route-group resolution issues with Turbopack.
 */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { prisma } from '@/lib/db/prisma'
import { HeroBannerService } from '@/lib/services/hero-banner.service'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { getPublicFeatureFlags } from '@/lib/utils/public-feature-flags'
import { getPublicMarketingTrackingConfig } from '@/lib/services/marketing-settings.service'
import { buildLocalBusinessSchema, buildOrganizationSchema, buildWebSiteSchema } from '@/lib/seo/schemas'
import { PublicLayoutClient } from '@/components/public/public-layout-client'
import { SectionErrorBoundary } from '@/components/error/section-error-boundary'
import Link from 'next/link'
import { HomeHero } from '@/components/features/home/home-hero'
import { HomeCategoryCards } from '@/components/features/home/home-category-cards'
import { HomeFeaturedEquipment } from '@/components/features/home/home-featured-equipment'
import { HomeNewArrivals } from '@/components/features/home/home-new-arrivals'
import { HomeKitTeaser } from '@/components/features/home/home-kit-teaser'
import { HomeTrustSignals } from '@/components/features/home/home-trust-signals'
import { HomeTopBrands } from '@/components/features/home/home-top-brands'
import { HomeTestimonials } from '@/components/features/home/home-testimonials'
import { HomeFaq } from '@/components/features/home/home-faq'
import { HomeCta } from '@/components/features/home/home-cta'
import { HomeStudios } from '@/components/features/home/home-studios'
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/cookie'
import { parseLocale } from '@/lib/i18n/locales'
import { logger } from '@/lib/logger'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const metadata: Metadata = {
  title: t('ar', 'seo.homeTitle'),
  description: t('ar', 'seo.homeDescription'),
  alternates: generateAlternatesMetadata('/'),
  openGraph: {
    title: t('ar', 'seo.homeTitle'),
    description: t('ar', 'seo.homeDescription'),
    url: BASE_URL,
    siteName: 'FlixCam.rent',
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: t('ar', 'seo.homeTitle'),
    description: t('ar', 'seo.homeDescription'),
  },
}

const FEATURED_DISPLAY_COUNT_KEY = 'settings.featured_equipment_display_count'
const FEATURED_DISPLAY_COUNT_DEFAULT = 8
const FEATURED_DISPLAY_COUNT_ALLOWED = [4, 6, 8, 12] as const

async function getRequestLocale() {
  const cookieStore = await cookies()
  return parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value)
}

type HomeSectionKey =
  | 'categories'
  | 'featured'
  | 'studios'
  | 'new_arrivals'
  | 'kit_teaser'
  | 'trust_signals'
  | 'top_brands'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'how_it_works'

type HomeSectionSettings = {
  key: HomeSectionKey
  label: string
  maxItems?: number
  compactMode?: 'compact' | 'comfortable'
  showProductCount?: boolean
  hideWithoutLogo?: boolean
}

type HomeSectionControl = { order: number; isVisible: boolean; settings: HomeSectionSettings }

const HOME_SECTION_DEFAULTS: Record<HomeSectionKey, HomeSectionControl> = {
  categories: {
    order: 10,
    isVisible: true,
    settings: {
      key: 'categories',
      label: 'Categories',
      maxItems: 10,
      compactMode: 'compact',
      showProductCount: false,
    },
  },
  featured: {
    order: 20,
    isVisible: true,
    settings: { key: 'featured', label: 'Featured Equipment', maxItems: 8 },
  },
  studios: { order: 30, isVisible: true, settings: { key: 'studios', label: 'Studios' } },
  new_arrivals: {
    order: 40,
    isVisible: true,
    settings: { key: 'new_arrivals', label: 'New Arrivals', maxItems: 8 },
  },
  kit_teaser: { order: 50, isVisible: true, settings: { key: 'kit_teaser', label: 'Kit Teaser' } },
  trust_signals: {
    order: 60,
    isVisible: true,
    settings: { key: 'trust_signals', label: 'Trust Signals' },
  },
  top_brands: {
    order: 70,
    isVisible: true,
    settings: {
      key: 'top_brands',
      label: 'Top Brands',
      maxItems: 12,
      compactMode: 'compact',
      showProductCount: true,
      hideWithoutLogo: false,
    },
  },
  testimonials: {
    order: 80,
    isVisible: true,
    settings: { key: 'testimonials', label: 'Testimonials' },
  },
  faq: { order: 90, isVisible: true, settings: { key: 'faq', label: 'FAQ' } },
  cta: { order: 100, isVisible: true, settings: { key: 'cta', label: 'CTA Banner' } },
  how_it_works: {
    order: 110,
    isVisible: true,
    settings: { key: 'how_it_works', label: 'How It Works Block' },
  },
}

function getSectionKeyFromSettings(settings: unknown): HomeSectionKey | null {
  if (!settings || typeof settings !== 'object') return null
  const key = (settings as Record<string, unknown>).key
  if (typeof key !== 'string') return null
  return key in HOME_SECTION_DEFAULTS ? (key as HomeSectionKey) : null
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function getFeaturedDisplayCount(): Promise<number> {
  const row = await prisma.integrationConfig.findFirst({
    where: { key: FEATURED_DISPLAY_COUNT_KEY, deletedAt: null },
    select: { value: true },
  })
  if (row?.value == null) return FEATURED_DISPLAY_COUNT_DEFAULT
  const n = parseInt(row.value, 10)
  const allowed = FEATURED_DISPLAY_COUNT_ALLOWED as readonly number[]
  return Number.isNaN(n) || !allowed.includes(n) ? FEATURED_DISPLAY_COUNT_DEFAULT : n
}

async function getFeaturedEquipment() {
  const [count, data] = await Promise.all([
    getFeaturedDisplayCount(),
    prisma.equipment.findMany({
      where: { deletedAt: null, isActive: true, featured: true },
      take: 200,
      select: {
        id: true,
        sku: true,
        model: true,
        dailyPrice: true,
        quantityAvailable: true,
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        media: {
          where: { deletedAt: null, type: 'image' },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: 1,
          select: { id: true, url: true, type: true },
        },
      },
    }),
  ])
  const mapped = data.map((e) => ({
    ...e,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    quantityAvailable: e.quantityAvailable ?? 0,
  }))
  const shuffled = shuffleArray(mapped)
  return shuffled.slice(0, count)
}

async function getCategoriesForHome(limit = 10) {
  const locale = await getRequestLocale()
  const list = await prisma.category.findMany({
    where: { deletedAt: null, parentId: null, isActive: true },
    select: {
      id: true,
      name: true,
      nameAr: true,
      nameEn: true,
      nameZh: true,
      nameFr: true,
      slug: true,
      _count: { select: { equipment: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: limit,
  })
  return list.map((c) => ({
    id: c.id,
    name:
      locale === 'ar'
        ? c.nameAr ?? c.name
        : locale === 'en'
          ? c.nameEn ?? c.name
          : locale === 'zh'
            ? c.nameZh ?? c.name
            : locale === 'fr'
              ? c.nameFr ?? c.name
              : c.name,
    slug: c.slug,
    equipmentCount: c._count.equipment,
  }))
}

async function getHomeStats() {
  return unstable_cache(
    async () => {
      const [equipmentCount, bookingCount] = await Promise.all([
        prisma.equipment.count({ where: { deletedAt: null, isActive: true } }),
        prisma.booking.count({ where: { deletedAt: null } }).catch(() => 0),
      ])
      return { equipmentCount, rentalsCount: bookingCount, yearFounded: 2020 }
    },
    ['public-home-stats'],
    { revalidate: 600 }
  )()
}

async function getNewArrivals() {
  return unstable_cache(
    async () => {
      const data = await prisma.equipment.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          sku: true,
          model: true,
          dailyPrice: true,
          quantityAvailable: true,
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 1,
        select: { id: true, url: true, type: true },
      },
        },
      })
      return data.map((e) => ({
        ...e,
        dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
        quantityAvailable: e.quantityAvailable ?? 0,
      }))
    },
    ['public-home-new-arrivals'],
    { revalidate: 300 }
  )()
}

async function getHeroBanner() {
  try {
    return await unstable_cache(
      async () => HeroBannerService.getActiveBannerByPage('home'),
      ['public-hero-banner-home'],
      { revalidate: 300, tags: ['public-hero-banner-home'] }
    )()
  } catch {
    return null
  }
}

async function getHeroImageUrl(): Promise<string | null> {
  try {
    const row = await prisma.integrationConfig.findFirst({
      where: { key: 'home_hero_image', deletedAt: null },
      select: { value: true },
    })
    return row?.value || null
  } catch {
    return null
  }
}

async function getHomeSectionControls(): Promise<Record<HomeSectionKey, HomeSectionControl>> {
  try {
    const page = await prisma.websitePage.findUnique({
      where: { slug: 'home' },
      include: {
        sections: {
          where: { type: 'CUSTOM' },
          select: { order: true, isVisible: true, settings: true },
        },
      },
    })
    if (!page) return HOME_SECTION_DEFAULTS

    const controls = { ...HOME_SECTION_DEFAULTS }
    for (const section of page.sections) {
      const key = getSectionKeyFromSettings(section.settings)
      if (!key) continue
      const parsedSettings =
        section.settings && typeof section.settings === 'object'
          ? (section.settings as Partial<HomeSectionSettings>)
          : {}
      controls[key] = {
        order: section.order,
        isVisible: section.isVisible,
        settings: {
          ...HOME_SECTION_DEFAULTS[key].settings,
          ...parsedSettings,
          key,
        },
      }
    }
    return controls
  } catch {
    return HOME_SECTION_DEFAULTS
  }
}

async function isFlagEnabledOrDefault(flagName: string, defaultValue = true): Promise<boolean> {
  try {
    const flag = await FeatureFlagService.getByName(flagName)
    if (!flag) return defaultValue
    return flag.enabled
  } catch {
    return defaultValue
  }
}

export default async function RootPage() {
  const locale = await getRequestLocale()
  let featured: Awaited<ReturnType<typeof getFeaturedEquipment>> = []
  let newArrivals: Awaited<ReturnType<typeof getNewArrivals>> = []
  let categories: Awaited<ReturnType<typeof getCategoriesForHome>> = []
  let stats: Awaited<ReturnType<typeof getHomeStats>> = {
    equipmentCount: 0,
    rentalsCount: 0,
    yearFounded: 2020,
  }
  let heroBanner: Awaited<ReturnType<typeof getHeroBanner>> = null
  let heroImageUrl: string | null = null
  let sectionControls = HOME_SECTION_DEFAULTS

  let showKitTeaserFlag = false
  let showStudios = false
  let showCategoriesFlag = true
  let showNewArrivalsFlag = true
  let showTopBrandsFlag = true
  let showHowItWorksFlag = true
  let flags = {
    enableBuildKit: true,
    enableEquipmentCatalog: true,
    enableStudios: true,
    enablePackages: true,
    enableHowItWorks: true,
    enableSupport: true,
    enableWhatsAppCta: true,
  }

  const tracking = await getPublicMarketingTrackingConfig()

  try {
    flags = await getPublicFeatureFlags()
  } catch (err) {
    logger.warn('Homepage feature flags load failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  try {
    sectionControls = await getHomeSectionControls()
    ;[
      featured,
      newArrivals,
      categories,
      stats,
      heroBanner,
      heroImageUrl,
      showKitTeaserFlag,
      showStudios,
      showCategoriesFlag,
      showNewArrivalsFlag,
      showTopBrandsFlag,
      showHowItWorksFlag,
    ] = await Promise.all([
      getFeaturedEquipment(),
      getNewArrivals(),
      getCategoriesForHome(sectionControls.categories.settings.maxItems ?? 10),
      getHomeStats(),
      getHeroBanner(),
      getHeroImageUrl(),
      isFlagEnabledOrDefault('enable_home_kit_teaser', false),
      FeatureFlagService.isEnabled('enable_studios'),
      isFlagEnabledOrDefault('enable_home_categories_section'),
      isFlagEnabledOrDefault('enable_home_new_arrivals_section'),
      isFlagEnabledOrDefault('enable_home_top_brands_section'),
      isFlagEnabledOrDefault('enable_home_how_it_works_block'),
    ])
  } catch (err) {
    logger.warn('Homepage section data load failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const showKitTeaser = sectionControls.kit_teaser.isVisible && showKitTeaserFlag
  const showCategories = sectionControls.categories.isVisible && showCategoriesFlag
  const showNewArrivals = sectionControls.new_arrivals.isVisible && showNewArrivalsFlag
  const showTopBrands = sectionControls.top_brands.isVisible && showTopBrandsFlag
  const showHowItWorks = sectionControls.how_it_works.isVisible && showHowItWorksFlag
  const showTrustSignals = sectionControls.trust_signals.isVisible
  const showFeatured = sectionControls.featured.isVisible
  const showStudiosSection = sectionControls.studios.isVisible && showStudios
  const showTestimonials = sectionControls.testimonials.isVisible
  const showFaq = sectionControls.faq.isVisible
  const showCta = sectionControls.cta.isVisible

  const sectionCandidates: Array<{ key: HomeSectionKey; order: number; node: ReactNode | null }> = [
    {
      key: 'categories',
      order: sectionControls.categories.order,
      node: showCategories ? (
        <HomeCategoryCards
          categories={categories}
          showProductCount={Boolean(sectionControls.categories.settings.showProductCount)}
          compactMode={sectionControls.categories.settings.compactMode ?? 'compact'}
        />
      ) : null,
    },
    {
      key: 'featured',
      order: sectionControls.featured.order,
      node: showFeatured ? <HomeFeaturedEquipment items={featured} /> : null,
    },
    {
      key: 'studios',
      order: sectionControls.studios.order,
      node: showStudiosSection ? <HomeStudios /> : null,
    },
    {
      key: 'new_arrivals',
      order: sectionControls.new_arrivals.order,
      node: showNewArrivals ? (
        <HomeNewArrivals
          items={newArrivals}
          maxItems={sectionControls.new_arrivals.settings.maxItems ?? 8}
        />
      ) : null,
    },
    {
      key: 'kit_teaser',
      order: sectionControls.kit_teaser.order,
      node: showKitTeaser ? <HomeKitTeaser /> : null,
    },
    {
      key: 'trust_signals',
      order: sectionControls.trust_signals.order,
      node: showTrustSignals ? (
        <HomeTrustSignals
          equipmentCount={stats.equipmentCount}
          rentalsCount={stats.rentalsCount}
          yearFounded={stats.yearFounded}
          showHowItWorks={showHowItWorks}
        />
      ) : null,
    },
    {
      key: 'top_brands',
      order: sectionControls.top_brands.order,
      node: showTopBrands ? (
        <HomeTopBrands
          maxItems={sectionControls.top_brands.settings.maxItems ?? 12}
          showProductCount={Boolean(sectionControls.top_brands.settings.showProductCount)}
          hideWithoutLogo={Boolean(sectionControls.top_brands.settings.hideWithoutLogo)}
          compactMode={sectionControls.top_brands.settings.compactMode ?? 'compact'}
        />
      ) : null,
    },
    {
      key: 'testimonials',
      order: sectionControls.testimonials.order,
      node: showTestimonials ? <HomeTestimonials /> : null,
    },
    { key: 'faq', order: sectionControls.faq.order, node: showFaq ? <HomeFaq /> : null },
    { key: 'cta', order: sectionControls.cta.order, node: showCta ? <HomeCta /> : null },
  ]
  const sectionNodes = sectionCandidates
    .filter(
      (item): item is { key: HomeSectionKey; order: number; node: ReactNode } => item.node !== null
    )
    .sort((a, b) => a.order - b.order)

  const sameAs = [
    process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_FACEBOOK_URL,
    process.env.NEXT_PUBLIC_TWITTER_URL,
    process.env.NEXT_PUBLIC_TIKTOK_URL,
    process.env.NEXT_PUBLIC_YOUTUBE_URL,
    process.env.NEXT_PUBLIC_LINKEDIN_URL,
  ].filter((u): u is string => Boolean(u))

  return (
    <>
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-public-button focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        {t(locale, 'blog.skipToContent')}
      </Link>
      <PublicLayoutClient flags={flags} tracking={tracking}>
        <div className="flex flex-col">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema(sameAs)) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteSchema()) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLocalBusinessSchema()) }}
          />
          <HomeHero banner={heroBanner ?? undefined} heroImageUrl={heroImageUrl} />
          {sectionNodes.map((entry) => (
            <SectionErrorBoundary key={entry.key} section={entry.key}>
              {entry.node}
            </SectionErrorBoundary>
          ))}
        </div>
      </PublicLayoutClient>
    </>
  )
}
