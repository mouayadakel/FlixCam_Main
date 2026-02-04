/**
 * Equipment detail page (Phase 2.3): Gallery, Price Block, Availability, Recommendations.
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
    },
  })
  if (!e) return null
  return {
    ...e,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
    monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
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
    <main className="container py-8 px-4">
      <EquipmentDetail equipment={equipment} recommendations={recommendations} />
    </main>
  )
}
