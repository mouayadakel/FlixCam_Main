/**
 * Equipment detail page: Gallery, Price Block, Availability, Recommendations.
 * Uses PublicContainer for consistent max-width and padding.
 * Guarded by enable_equipment_catalog feature flag.
 */

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { EquipmentDetail } from '@/components/features/equipment/equipment-detail'
import type { EquipmentCardItem } from '@/components/features/equipment/equipment-card'
import { buildPublicMetadata } from '@/lib/seo/build-metadata'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'
import { buildBreadcrumbListSchema, buildProductSchema } from '@/lib/seo/schemas'
import { parseLocale } from '@/lib/i18n/locales'
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/cookie'
import { getCrewRolesForEquipment } from '@/lib/services/crew-recommendations.service'

async function getRequestLocale() {
  const cookieStore = await cookies()
  return parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value)
}

async function getEquipment(slugOrId: string, locale: 'ar' | 'en' | 'zh' | 'fr') {
  let e = await prisma.equipment.findFirst({
    where: { slug: slugOrId, deletedAt: null, isActive: true },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          nameEn: true,
          nameZh: true,
          nameFr: true,
          slug: true,
        },
      },
      brand: { select: { id: true, name: true, slug: true } },
      media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, url: true, type: true },
      },
      vendor: {
        select: { companyName: true, logo: true, isNameVisible: true },
      },
      product: {
        select: {
          translations: {
            where: { deletedAt: null },
            select: {
              locale: true,
              shortDescription: true,
              longDescription: true,
              seoTitle: true,
              seoDescription: true,
              seoKeywords: true,
            },
          },
        },
      },
    },
  })
  if (!e) {
    e = await prisma.equipment.findFirst({
      where: { id: slugOrId, deletedAt: null, isActive: true },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            nameEn: true,
            nameZh: true,
            nameFr: true,
            slug: true,
          },
        },
        brand: { select: { id: true, name: true, slug: true } },
        media: {
          where: { deletedAt: null, type: 'image' },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, url: true, type: true },
        },
        vendor: {
          select: { companyName: true, logo: true, isNameVisible: true },
        },
        product: {
          select: {
            translations: {
              where: { deletedAt: null },
              select: {
                locale: true,
                shortDescription: true,
                longDescription: true,
                seoTitle: true,
                seoDescription: true,
                seoKeywords: true,
              },
            },
          },
        },
      },
    })
  }

  if (!e) return null
  const localizedCategoryName =
    locale === 'ar'
      ? e.category.nameAr ?? e.category.name
      : locale === 'en'
      ? e.category.nameEn ?? e.category.name
      : locale === 'zh'
        ? e.category.nameZh ?? e.category.name
        : locale === 'fr'
          ? e.category.nameFr ?? e.category.name
          : e.category.name
  const v = e.vendor
  const vendor = v?.isNameVisible ? { companyName: v.companyName, logo: v.logo } : null
  const translations = e.product?.translations ?? []
  const preferredLocale = locale === 'ar' ? 'ar' : 'en'
  const localizedTrans =
    translations.find((t) => t.locale === preferredLocale) ??
    translations.find((t) => t.locale === 'en') ??
    translations.find((t) => t.locale === 'ar') ??
    translations[0]

  return {
    id: e.id,
    sku: e.sku,
    slug: e.slug ?? null,
    model: e.model,
    categoryId: e.categoryId,
    brandId: e.brandId,
    quantityAvailable: e.quantityAvailable,
    requiresAssistant: e.requiresAssistant ?? false,
    category: { ...e.category, name: localizedCategoryName },
    brand: e.brand,
    media: e.media,
    vendor,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
    monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
    specifications: e.specifications as Record<string, unknown> | null,
    customFields: e.customFields as Record<string, unknown> | null,
    shortDescription: localizedTrans?.shortDescription ?? null,
    longDescription: localizedTrans?.longDescription ?? null,
    seoTitle: localizedTrans?.seoTitle ?? null,
    seoDescription: localizedTrans?.seoDescription ?? null,
    seoKeywords: localizedTrans?.seoKeywords ?? null,
  }
}

async function getRecommendations(equipmentId: string, categoryId: string) {
  const list = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      categoryId,
      id: { not: equipmentId },
    },
    take: 4,
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
    orderBy: { createdAt: 'desc' },
  })
  return list.map((e) => ({
    id: e.id,
    sku: e.sku,
    model: e.model,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    quantityAvailable: e.quantityAvailable,
    category: e.category,
    brand: e.brand,
    media: e.media,
  }))
}

async function getLinkedEquipment(ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean)
  if (uniqueIds.length === 0) return []

  const list = await prisma.equipment.findMany({
    where: {
      id: { in: uniqueIds },
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      sku: true,
      model: true,
      slug: true,
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
  return list.map((e) => ({
    id: e.id,
    sku: e.sku,
    model: e.model,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    quantityAvailable: e.quantityAvailable,
    category: e.category,
    brand: e.brand,
    media: e.media,
  }))
}

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  process.env.APP_URL ||
  'https://flixcam.rent'
).replace(/\/$/, '')

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug: id } = await params
  const locale = await getRequestLocale()
  const equipment = await getEquipment(id, locale)
  if (!equipment) {
    return { title: 'معدة غير موجودة | FlixCam.rent' }
  }
  const name = equipment.model || equipment.sku || 'معدة'
  const title = equipment.seoTitle || `${name} | FlixCam.rent`
  const description =
    equipment.seoDescription ||
    equipment.shortDescription ||
    `تأجير ${name} – معدات تصوير سينمائي في الرياض. احجز أونلاين من FlixCam.rent.` +
      (equipment.brand?.name ? ` ماركة ${equipment.brand.name}.` : '')
  const keywords = equipment.seoKeywords ?? undefined
  const canonicalSlug = equipment.slug ?? id
  const imageUrl =
    equipment.media?.[0]?.url && equipment.media[0].url.startsWith('http')
      ? equipment.media[0].url
      : equipment.media?.[0]?.url
        ? `${BASE_URL}${equipment.media[0].url}`
        : undefined
  const defaultOg = process.env.NEXT_PUBLIC_OG_IMAGE_DEFAULT || `${BASE_URL}/opengraph-image`
  return {
    ...buildPublicMetadata({
      title,
      description,
      path: `/equipment/${canonicalSlug}`,
      image: imageUrl || defaultOg,
      alternates: generateAlternatesMetadata(`/equipment/${canonicalSlug}`),
    }),
    keywords,
  }
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const enabled = await FeatureFlagService.isEnabled('enable_equipment_catalog')
  if (!enabled) redirect('/')
  try {
    const { slug: id } = await params
    const locale = await getRequestLocale()
    const equipment = await getEquipment(id, locale)
    if (!equipment) notFound()

    const relatedIds = Array.isArray(
      (equipment.customFields as Record<string, unknown> | null)?.relatedEquipmentIds
    )
      ? ((equipment.customFields as Record<string, unknown>).relatedEquipmentIds as string[])
      : []
    const linkedEquipment = await getLinkedEquipment(relatedIds)

    const isCrewCategory = equipment.category?.slug === 'crew'
    const recommendedCrew = isCrewCategory
      ? []
      : await getCrewRolesForEquipment(equipment.id)
    const recommendedCrewCards: EquipmentCardItem[] = recommendedCrew.map((item) => ({
      id: item.id,
      sku: item.sku,
      model: item.model,
      slug: item.slug,
      dailyPrice: item.dailyPrice,
      quantityAvailable: item.quantityAvailable,
      category: item.category
        ? { name: item.category.name, slug: item.category.slug ?? '' }
        : null,
      brand: item.brand ? { name: item.brand.name, slug: item.brand.slug ?? '' } : null,
      media: item.media.map(({ url, type }) => ({ url, type })),
    }))

    const recommendations = equipment.categoryId
      ? await getRecommendations(equipment.id, equipment.categoryId)
      : []

    const equipmentName = equipment.model || equipment.sku || 'Equipment'
    const equipmentSlug = equipment.slug ?? equipment.id
    const img = equipment.media?.[0]?.url
      ? equipment.media[0].url.startsWith('http')
        ? equipment.media[0].url
        : `${BASE_URL}${equipment.media[0].url}`
      : undefined
    const desc =
      equipment.shortDescription || `تأجير ${equipmentName} – معدات تصوير سينمائي في الرياض`
    const productLd = buildProductSchema({
      id: equipment.id,
      name: equipmentName,
      description: desc,
      price: equipment.dailyPrice,
      imageUrl: img,
      slug: equipmentSlug,
      available: (equipment.quantityAvailable ?? 0) > 0,
      brand: equipment.brand?.name,
      category: equipment.category?.name,
    })
    const crumbs = buildBreadcrumbListSchema([
      { name: 'FlixCam', url: BASE_URL },
      { name: 'Equipment', url: `${BASE_URL}/equipment` },
      { name: equipmentName, url: `${BASE_URL}/equipment/${equipmentSlug}` },
    ])
    const sharePageUrl = `${BASE_URL}/equipment/${equipmentSlug}`

    return (
      <main className="mx-auto w-full max-w-public-container px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
        />
        <EquipmentDetail
          sharePageUrl={sharePageUrl}
          shareTitle={equipmentName}
          shareImageUrl={img}
          equipmentSlug={equipmentSlug}
          equipment={{
            ...equipment,
            category: equipment.category
              ? {
                  id: equipment.categoryId,
                  name: equipment.category.name,
                  slug: equipment.category.slug ?? '',
                }
              : null,
            brand: equipment.brand
              ? { name: equipment.brand.name, slug: equipment.brand.slug ?? '' }
              : null,
            shortDescription: equipment.shortDescription ?? null,
            longDescription: equipment.longDescription ?? null,
            boxContents: (equipment as any).boxContents ?? null,
          }}
          recommendations={recommendations}
          linkedEquipment={linkedEquipment}
          recommendedCrew={recommendedCrewCards}
        />
      </main>
    )
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[EquipmentDetailPage]', err)
    }
    throw err
  }
}
