/**
 * Package detail page (Phase 2.5).
 * Guarded by enable_packages feature flag.
 */

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db/prisma'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { PackageDetail } from '@/components/features/packages/package-detail'
import { buildPublicMetadata } from '@/lib/seo/build-metadata'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://flixcam.rent'
).replace(/\/$/, '')

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const kit = await prisma.kit.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    select: { name: true, description: true, cmsData: true },
  })
  if (!kit) return {}

  const cms = (kit.cmsData as any) || {}
  const title = cms.seoTitle || kit.name
  const description = cms.seoDescription || kit.description || `${title} — FlixCam.rent`
  const image = cms.ogImageUrl || cms.cardImageUrl || '/og-image.png'

  return buildPublicMetadata({
    title,
    description,
    path: `/packages/${slug}`,
    image,
    alternates: generateAlternatesMetadata(`/packages/${slug}`),
  })
}

async function getPackage(slug: string) {
  const kit = await prisma.kit.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    include: {
      items: {
        include: {
          equipment: {
            select: {
              id: true,
              sku: true,
              model: true,
              dailyPrice: true,
              media: { take: 1, select: { id: true, url: true, type: true } },
            },
          },
        },
      },
    },
  })
  if (!kit) return null

  const items = kit.items.map((i: any) => ({
    equipmentId: i.equipmentId,
    quantity: i.quantity,
    equipment: {
      ...i.equipment,
      dailyPrice: i.equipment.dailyPrice ? Number(i.equipment.dailyPrice) : 0,
    },
  }))

  const subtotal = items.reduce((sum: number, i: any) => sum + i.equipment.dailyPrice * i.quantity, 0)
  const discountPercent = kit.discountPercent ? Number(kit.discountPercent) : 0
  const total = discountPercent > 0 ? subtotal * (1 - discountPercent / 100) : subtotal

  const relatedKits = await prisma.kit.findMany({
    where: { deletedAt: null, isActive: true, id: { not: kit.id } },
    take: 3,
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      description: true,
      descriptionEn: true,
      cmsData: true,
      discountPercent: true,
      items: {
        select: { equipment: { select: { dailyPrice: true } }, quantity: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const related = relatedKits.map((rk: any) => {
    let sDaily = 0
    rk.items.forEach((i: any) => {
      sDaily += Number(i.equipment.dailyPrice ?? 0) * i.quantity
    })
    const d = Number(rk.discountPercent ?? 0) / 100
    return {
      id: rk.id,
      name: rk.name,
      nameEn: rk.nameEn,
      slug: rk.slug,
      description: rk.description,
      descriptionEn: rk.descriptionEn,
      originalPrice: sDaily,
      finalPrice: sDaily * (1 - d),
      cmsData: rk.cmsData || {},
      discountPercent: rk.discountPercent ? Number(rk.discountPercent) : null,
      type: 'kit' as const,
    }
  })

  return {
    id: kit.id,
    name: kit.name,
    nameEn: kit.nameEn,
    slug: kit.slug,
    description: kit.description ?? null,
    descriptionEn: kit.descriptionEn ?? null,
    discountPercent,
    subtotal,
    total,
    items,
    cmsData: kit.cmsData || {},
    related,
  }
}

export default async function PackageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const enabled = await FeatureFlagService.isEnabled('enable_packages')
  if (!enabled) redirect('/')
  const { slug } = await params
  const pkg = await getPackage(slug)
  if (!pkg) notFound()

  return (
    <main className="container px-4 py-8">
      <PackageDetail pkg={pkg} />
    </main>
  )
}
