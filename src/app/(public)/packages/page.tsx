/**
 * Packages list page (Phase 3).
 * Dynamic CMS integration for SEO, Banners, and Featured content.
 */

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db/prisma'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { getMarketingSettingsMap } from '@/lib/services/marketing-settings.service'
import { buildPublicMetadata } from '@/lib/seo/build-metadata'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { PackagesListClient } from './packages-list-client'
import { t } from '@/lib/i18n/translate'
import { getRequestLocale } from '@/lib/i18n/request-locale'

export type UnifiedPackageItem = {
  id: string
  type: 'kit' | 'studio'
  name: string
  nameEn?: string | null
  slug?: string
  studioId?: string
  description: string | null
  descriptionEn?: string | null
  discountPercent: number | null
  originalPrice?: number
  finalPrice?: number
  itemCount?: number
  hours?: number | null
  badgeText?: string | null
  recommended?: boolean
  cmsData?: any
  studioName?: string
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale()
  const db = await getMarketingSettingsMap()
  
  const titleAr = db.get('packages_seo_title_ar') || t(locale, 'seo.packagesTitle')
  const titleEn = db.get('packages_seo_title_en') || t('en', 'seo.packagesTitle')
  const descAr = db.get('packages_seo_description_ar') || t(locale, 'seo.packagesDescription')
  const descEn = db.get('packages_seo_description_en') || t('en', 'seo.packagesDescription')

  // We use Arabic as primary for now as per project standard
  return buildPublicMetadata({
    title: titleAr,
    description: descAr,
    path: '/packages',
    alternates: generateAlternatesMetadata('/packages'),
  })
}

async function getPackagesData() {
  const db = await getMarketingSettingsMap()
  const featuredIds = (db.get('packages_featured_ids') || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)

  const [kits, studioPackages, heroBanner] = await Promise.all([
    prisma.kit.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        description: true,
        descriptionEn: true,
        discountPercent: true,
        cmsData: true,
        items: {
          select: { equipment: { select: { dailyPrice: true } }, quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studioPackage.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        price: true,
        originalPrice: true,
        discountPercent: true,
        hours: true,
        badgeText: true,
        recommended: true,
        studioId: true,
        studio: { select: { slug: true, name: true, nameEn: true } },
      },
      orderBy: { order: 'asc' },
    }),
    prisma.heroBanner.findFirst({
      where: { pageSlug: 'packages', isActive: true },
      include: { slides: { where: { isActive: true }, orderBy: { order: 'asc' } } }
    })
  ])

  const kitItems: UnifiedPackageItem[] = kits.map((k) => {
    let sumDaily = 0
    k.items.forEach((i: any) => {
      sumDaily += Number(i.equipment.dailyPrice ?? 0) * i.quantity
    })
    const discount = Number(k.discountPercent ?? 0) / 100
    const finalPrice = sumDaily * (1 - discount)

    return {
      id: k.id,
      type: 'kit',
      name: k.name,
      nameEn: k.nameEn,
      slug: k.slug,
      description: k.description,
      descriptionEn: k.descriptionEn,
      discountPercent: k.discountPercent ? Number(k.discountPercent) : null,
      originalPrice: sumDaily,
      finalPrice: finalPrice,
      itemCount: k.items.length,
      cmsData: k.cmsData ?? {},
    }
  })

  const studioItems: UnifiedPackageItem[] = studioPackages.map((sp) => ({
    id: sp.id,
    type: 'studio',
    name: sp.nameAr || sp.name,
    nameEn: sp.name,
    studioId: sp.studio.slug,
    description: sp.description,
    discountPercent: sp.discountPercent,
    originalPrice: sp.originalPrice ? Number(sp.originalPrice) : undefined,
    finalPrice: Number(sp.price),
    hours: sp.hours,
    badgeText: sp.badgeText,
    recommended: sp.recommended,
    studioName: sp.studio.nameEn || sp.studio.name,
  }))

  const allPackages = [...kitItems, ...studioItems]
  
  // Extract featured packages
  const featured = allPackages.filter(p => featuredIds.includes(p.id))
  
  return {
    packages: allPackages,
    featured,
    heroBanner
  }
}

export default async function PackagesListPage() {
  const { locale } = await getRequestLocale()
  const enabled = await FeatureFlagService.isEnabled('enable_packages')
  if (!enabled) redirect('/')
  
  const { packages, featured, heroBanner } = await getPackagesData()

  return (
    <main className="container px-4 py-8">
      <PackagesListClient 
        packages={packages} 
        featured={featured}
        heroBanner={heroBanner}
      />
    </main>
  )
}
