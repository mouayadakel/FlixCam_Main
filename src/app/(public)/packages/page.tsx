/**
 * Packages list page (Phase 2.5).
 */

import { prisma } from '@/lib/db/prisma'
import { PackagesListClient } from './packages-list-client'

async function getPackages() {
  const kits = await prisma.kit.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      discountPercent: true,
      _count: { select: { items: true } },
    },
    orderBy: { name: 'asc' },
  })
  return kits.map((k) => ({
    id: k.id,
    name: k.name,
    slug: k.slug,
    description: k.description ?? null,
    discountPercent: k.discountPercent ? Number(k.discountPercent) : null,
    itemCount: k._count.items,
  }))
}

export default async function PackagesListPage() {
  const packages = await getPackages()
  return (
    <main className="container py-8 px-4">
      <PackagesListClient packages={packages} />
    </main>
  )
}
