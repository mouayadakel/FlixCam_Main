/**
 * Studios list page (Phase 2.4).
 * Guarded by enable_studios feature flag.
 */

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { StudiosListClient } from './studios-list-client'

async function getStudios() {
  const list = await prisma.studio.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      capacity: true,
      hourlyRate: true,
      media: { take: 1, select: { id: true, url: true, type: true } },
    },
    orderBy: { name: 'asc' },
  })
  return list.map((s) => ({
    ...s,
    hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : 0,
  }))
}

export default async function StudiosListPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_studios')
  if (!enabled) redirect('/')
  const studios = await getStudios()
  return (
    <main className="container py-8 px-4">
      <StudiosListClient studios={studios} />
    </main>
  )
}
