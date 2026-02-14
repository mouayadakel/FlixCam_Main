/**
 * Equipment detail page: Gallery, Price Block, Availability, Recommendations.
 * Uses PublicContainer for consistent max-width and padding.
 */

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { EquipmentDetail } from '@/components/features/equipment/equipment-detail'

async function getEquipment(id: string) {
  const e = await prisma.equipment.findFirst({
    where: { id, deletedAt: null, isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      media: { select: { id: true, url: true, type: true } },
      vendor: {
        select: { companyName: true, logo: true, isNameVisible: true },
      },
    },
  })
  if (!e) return null
  const v = e.vendor as { companyName: string; logo: string | null; isNameVisible: boolean } | null
  const vendor = v?.isNameVisible ? { companyName: v.companyName, logo: v.logo } : null
  return {
    ...e,
    vendor,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
    monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
    specifications: e.specifications as Record<string, unknown> | null,
    customFields: e.customFields as Record<string, unknown> | null,
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
    ...e,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    quantityAvailable: e.quantityAvailable,
    media: e.media,
  }))
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: id } = await params
  const equipment = await getEquipment(id)
  if (!equipment) notFound()

  const recommendations = equipment.categoryId
    ? await getRecommendations(equipment.id, equipment.categoryId)
    : []

  return (
    <main className="mx-auto w-full max-w-public-container px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <EquipmentDetail equipment={equipment} recommendations={recommendations} />
    </main>
  )
}
