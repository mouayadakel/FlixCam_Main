/**
 * Public homepage (Phase 2.1): Hero, Featured Equipment, How It Works, FAQ, CTA.
 */

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { HomeHero } from '@/components/features/home/home-hero'
import { HomeFeaturedEquipment } from '@/components/features/home/home-featured-equipment'
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
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          media: { take: 1, select: { id: true, url: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return data.map((e) => ({
        ...e,
        dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
      }))
    },
    ['public-home-featured-equipment'],
    { revalidate: 300 }
  )()
}

export default async function PublicHomePage() {
  const featured = await getFeaturedEquipment()

  return (
    <main className="flex flex-col">
      <HomeHero />
      <HomeFeaturedEquipment items={featured} />
      <HomeTopBrands />
      <HomeHowItWorks />
      <HomeTestimonials />
      <HomeFaq />
      <HomeCta />
    </main>
  )
}
