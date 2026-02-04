/**
 * Package detail page (Phase 2.5).
 */

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { PackageDetail } from '@/components/features/packages/package-detail'

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

  const items = kit.items.map((i) => ({
    equipmentId: i.equipmentId,
    quantity: i.quantity,
    equipment: {
      ...i.equipment,
      dailyPrice: i.equipment.dailyPrice ? Number(i.equipment.dailyPrice) : 0,
    },
  }))

  const subtotal = items.reduce(
    (sum, i) => sum + i.equipment.dailyPrice * i.quantity,
    0
  )
  const discountPercent = kit.discountPercent ? Number(kit.discountPercent) : 0
  const total = discountPercent > 0 ? subtotal * (1 - discountPercent / 100) : subtotal

  return {
    id: kit.id,
    name: kit.name,
    slug: kit.slug,
    description: kit.description ?? null,
    discountPercent,
    subtotal,
    total,
    items,
  }
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const pkg = await getPackage(slug)
  if (!pkg) notFound()

  return (
    <main className="container py-8 px-4">
      <PackageDetail pkg={pkg} />
    </main>
  )
}
