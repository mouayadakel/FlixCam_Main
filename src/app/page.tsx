/**
 * Root page at /. Renders the public homepage.
 * Inline implementation to avoid route-group resolution issues with Turbopack.
 */
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { prisma } from '@/lib/db/prisma'
import { HeroBannerService } from '@/lib/services/hero-banner.service'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { getPublicFeatureFlags } from '@/lib/utils/public-feature-flags'
import { PublicLayoutClient } from '@/components/public/public-layout-client'
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

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function getFeaturedEquipment() {
  let count = FEATURED_DISPLAY_COUNT_DEFAULT
  try {
    const row = await prisma.integrationConfig.findFirst({
      where: { key: FEATURED_DISPLAY_COUNT_KEY, deletedAt: null },
      select: { value: true },
    })
    if (row?.value != null) {
      const n = parseInt(row.value, 10)
      if (!Number.isNaN(n) && [4, 6, 8, 12].includes(n)) count = n
    }
  } catch {
    /* use default */
  }
  const data = await prisma.equipment.findMany({
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
      media: { take: 1, select: { id: true, url: true, type: true } },
    },
  })
  const mapped = data.map((e) => ({
    ...e,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    quantityAvailable: e.quantityAvailable ?? 0,
  }))
  return shuffleArray(mapped).slice(0, count)
}

async function getCategoriesForHome() {
  return unstable_cache(
    async () => {
      const list = await prisma.category.findMany({
        where: { deletedAt: null, parentId: null },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { equipment: true } },
        },
        orderBy: { name: 'asc' },
        take: 10,
      })
      return list.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        equipmentCount: c._count.equipment,
      }))
    },
    ['public-home-categories'],
    { revalidate: 300 }
  )()
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
          media: { take: 1, select: { id: true, url: true, type: true } },
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
      { revalidate: 300 }
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

export default async function RootPage() {
  let featured: Awaited<ReturnType<typeof getFeaturedEquipment>> = []
  let newArrivals: Awaited<ReturnType<typeof getNewArrivals>> = []
  let categories: Awaited<ReturnType<typeof getCategoriesForHome>> = []
  let stats = { equipmentCount: 0, rentalsCount: 0, yearFounded: 2020 }
  let heroBanner: Awaited<ReturnType<typeof getHeroBanner>> = null
  let heroImageUrl: string | null = null
  let showKitTeaser = false
  let showStudios = false
  let flags = {
    enableBuildKit: true,
    enableEquipmentCatalog: true,
    enableStudios: true,
    enablePackages: true,
    enableHowItWorks: true,
    enableSupport: true,
    enableWhatsAppCta: true,
  }

  try {
    flags = await getPublicFeatureFlags()
  } catch {
    /* use defaults */
  }

  try {
    ;[
      featured,
      newArrivals,
      categories,
      stats,
      heroBanner,
      heroImageUrl,
      showKitTeaser,
      showStudios,
    ] = await Promise.all([
      getFeaturedEquipment(),
      getNewArrivals(),
      getCategoriesForHome(),
      getHomeStats(),
      getHeroBanner(),
      getHeroImageUrl(),
      FeatureFlagService.isEnabled('enable_home_kit_teaser'),
      FeatureFlagService.isEnabled('enable_studios'),
    ])
  } catch (e) {
    console.error('[RootPage] data fetch failed:', e)
  }

  return (
    <>
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-public-button focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </Link>
      <PublicLayoutClient flags={flags}>
        <div className="flex flex-col">
          <HomeHero banner={heroBanner ?? undefined} heroImageUrl={heroImageUrl} />
          <HomeCategoryCards categories={categories} />
          <HomeFeaturedEquipment items={featured} />
          {showStudios && <HomeStudios />}
          <HomeNewArrivals items={newArrivals} />
          {showKitTeaser && <HomeKitTeaser />}
          <HomeTrustSignals
            equipmentCount={stats.equipmentCount}
            rentalsCount={stats.rentalsCount}
            yearFounded={stats.yearFounded}
          />
          <HomeTopBrands />
          <HomeTestimonials />
          <HomeFaq />
          <HomeCta />
        </div>
      </PublicLayoutClient>
    </>
  )
}
