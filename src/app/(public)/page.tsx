/**
 * Public homepage: Hero (with search), Category cards, Featured Equipment,
 * Trust signals, Top Brands, How It Works (5 steps), Testimonials, FAQ, CTA.
 */

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { HomeHero } from '@/components/features/home/home-hero'
import { HomeCategoryCards } from '@/components/features/home/home-category-cards'
import { HomeFeaturedEquipment } from '@/components/features/home/home-featured-equipment'
import { HomeTrustSignals } from '@/components/features/home/home-trust-signals'
import { HomeHowItWorks } from '@/components/features/home/home-how-it-works'
import { HomeTopBrands } from '@/components/features/home/home-top-brands'
import { HomeTestimonials } from '@/components/features/home/home-testimonials'
import { HomeFaq } from '@/components/features/home/home-faq'
import { HomeCta } from '@/components/features/home/home-cta'

async function getFeaturedEquipment() {
  return unstable_cache(
    async () => {
      const data = await prisma.equipment.findMany({
        where: { deletedAt: null, isActive: true, featured: true },
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
        orderBy: { createdAt: 'desc' },
      })
      return data.map((e) => ({
        ...e,
        dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
        quantityAvailable: e.quantityAvailable ?? 0,
      }))
    },
    ['public-home-featured-equipment'],
    { revalidate: 300 }
  )()
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

export default async function PublicHomePage() {
  const [featured, categories, stats] = await Promise.all([
    getFeaturedEquipment(),
    getCategoriesForHome(),
    getHomeStats(),
  ])

  return (
    <main className="flex flex-col">
      <HomeHero />
      <HomeCategoryCards categories={categories} />
      <HomeFeaturedEquipment items={featured} />
      <HomeTrustSignals
        equipmentCount={stats.equipmentCount}
        rentalsCount={stats.rentalsCount}
        yearFounded={stats.yearFounded}
      />
      <HomeTopBrands />
      <HomeHowItWorks />
      <HomeTestimonials />
      <HomeFaq />
      <HomeCta />
    </main>
  )
}
