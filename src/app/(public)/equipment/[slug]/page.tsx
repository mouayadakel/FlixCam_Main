/**
 * Equipment detail page: Gallery, Price Block, Availability, Recommendations.
 * Uses PublicContainer for consistent max-width and padding.
 * Guarded by enable_equipment_catalog feature flag.
 */

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { EquipmentDetail } from '@/components/features/equipment/equipment-detail'

async function getEquipment(slugOrId: string) {
  const include = {
    category: { select: { id: true, name: true, slug: true } },
    brand: { select: { id: true, name: true, slug: true } },
    media: { select: { id: true, url: true, type: true } },
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
  }

  let e = await prisma.equipment.findFirst({
    where: { slug: slugOrId, deletedAt: null, isActive: true },
    include,
  })
  if (!e) {
    e = await prisma.equipment.findFirst({
      where: { id: slugOrId, deletedAt: null, isActive: true },
      include,
    })
  }

  if (!e) return null
  const v = e.vendor
  const vendor = v?.isNameVisible ? { companyName: v.companyName, logo: v.logo } : null
  const translations = e.product?.translations ?? []
  const enTrans = translations.find((t) => t.locale === 'en')

  return {
    id: e.id,
    sku: e.sku,
    slug: e.slug ?? null,
    model: e.model,
    categoryId: e.categoryId,
    brandId: e.brandId,
    quantityAvailable: e.quantityAvailable,
    category: e.category,
    brand: e.brand,
    media: e.media,
    vendor,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
    monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
    specifications: e.specifications as Record<string, unknown> | null,
    customFields: e.customFields as Record<string, unknown> | null,
    shortDescription: enTrans?.shortDescription ?? null,
    longDescription: enTrans?.longDescription ?? null,
    seoTitle: enTrans?.seoTitle ?? null,
    seoDescription: enTrans?.seoDescription ?? null,
    seoKeywords: enTrans?.seoKeywords ?? null,
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
      media: { take: 1, select: { id: true, url: true, type: true } },
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

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug: id } = await params
  const equipment = await getEquipment(id)
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
  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${BASE_URL}/equipment/${canonicalSlug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/equipment/${canonicalSlug}`,
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, alt: name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
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
    const equipment = await getEquipment(id)
    if (!equipment) notFound()

    const recommendations = equipment.categoryId
      ? await getRecommendations(equipment.id, equipment.categoryId)
      : []

    const equipmentName = equipment.model || equipment.sku || 'Equipment'
    const equipmentSlug = equipment.slug ?? equipment.id
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: equipmentName,
      url: `${BASE_URL}/equipment/${equipmentSlug}`,
      image: equipment.media?.[0]?.url
        ? equipment.media[0].url.startsWith('http')
          ? equipment.media[0].url
          : `${BASE_URL}${equipment.media[0].url}`
        : undefined,
      description:
        equipment.shortDescription || `تأجير ${equipmentName} – معدات تصوير سينمائي في الرياض`,
      brand: equipment.brand ? { '@type': 'Brand', name: equipment.brand.name } : undefined,
      category: equipment.category?.name,
      sku: equipment.sku,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'SAR',
        price: equipment.dailyPrice,
        availability:
          (equipment.quantityAvailable ?? 0) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: `${BASE_URL}/equipment/${equipmentSlug}`,
      },
    }

    return (
      <main className="mx-auto w-full max-w-public-container px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <EquipmentDetail
          equipment={{
            ...equipment,
            category: equipment.category
              ? { name: equipment.category.name, slug: equipment.category.slug ?? '' }
              : null,
            brand: equipment.brand
              ? { name: equipment.brand.name, slug: equipment.brand.slug ?? '' }
              : null,
            shortDescription: equipment.shortDescription ?? null,
            longDescription: equipment.longDescription ?? null,
            boxContents: (equipment as any).boxContents ?? null,
          }}
          recommendations={recommendations}
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
