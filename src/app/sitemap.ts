/**
 * Sitemap for SEO (Phase 6.2) with multi-language support.
 * Includes locale-specific URLs with alternates for ar, en, zh.
 */

import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db/prisma'
import { LOCALES } from '@/lib/i18n/locales'

const BASE = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

/**
 * Generate locale alternates for a given path
 */
function generateAlternates(path: string) {
  return {
    languages: {
      ar: `${BASE}${path}`,
      en: `${BASE}${path}?locale=en`,
      zh: `${BASE}${path}?locale=zh`,
      'x-default': `${BASE}${path}`,
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
      alternates: generateAlternates('/'),
    },
    {
      url: `${BASE}/equipment`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: generateAlternates('/equipment'),
    },
    {
      url: `${BASE}/studios`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: generateAlternates('/studios'),
    },
    {
      url: `${BASE}/packages`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: generateAlternates('/packages'),
    },
    {
      url: `${BASE}/build-your-kit`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: generateAlternates('/build-your-kit'),
    },
    {
      url: `${BASE}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: generateAlternates('/how-it-works'),
    },
    {
      url: `${BASE}/support`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: generateAlternates('/support'),
    },
    {
      url: `${BASE}/policies`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
      alternates: generateAlternates('/policies'),
    },
    {
      url: `${BASE}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: generateAlternates('/faq'),
    },
    {
      url: `${BASE}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
      alternates: generateAlternates('/terms'),
    },
    {
      url: `${BASE}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
      alternates: generateAlternates('/privacy'),
    },
    {
      url: `${BASE}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: generateAlternates('/about'),
    },
    {
      url: `${BASE}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: generateAlternates('/contact'),
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: generateAlternates('/blog'),
    },
  ]

  let equipmentRoutes: MetadataRoute.Sitemap = []
  try {
    const equipment = await prisma.equipment.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, slug: true, updatedAt: true },
    })
    equipmentRoutes = equipment.map((item) => ({
      url: `${BASE}/equipment/${item.slug ?? item.id}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: generateAlternates(`/equipment/${item.slug ?? item.id}`),
    }))
  } catch {
    // If DB unavailable, skip dynamic routes
  }

  let studioRoutes: MetadataRoute.Sitemap = []
  try {
    const studios = await prisma.studio.findMany({
      where: { deletedAt: null, isActive: true },
      select: { slug: true, updatedAt: true },
    })
    studioRoutes = studios.map((item) => ({
      url: `${BASE}/studios/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: generateAlternates(`/studios/${item.slug}`),
    }))
  } catch {
    // If DB unavailable, skip dynamic routes
  }

  let packageRoutes: MetadataRoute.Sitemap = []
  try {
    const packages = await prisma.kit.findMany({
      where: { deletedAt: null, isActive: true },
      select: { slug: true, updatedAt: true },
    })
    packageRoutes = packages
      .filter((p) => p.slug)
      .map((item) => ({
        url: `${BASE}/packages/${item.slug}`,
        lastModified: item.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
        alternates: generateAlternates(`/packages/${item.slug}`),
      }))
  } catch {
    // If DB unavailable, skip dynamic routes
  }

  return [...staticRoutes, ...equipmentRoutes, ...studioRoutes, ...packageRoutes]
}
