/**
 * Studio detail page (Phase 2.4): Detail, Slot Picker, Booking Form.
 */

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { StudioDetail } from '@/components/features/studio/studio-detail'

async function getStudio(slug: string) {
  const studio = await prisma.studio.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    include: {
      media: { select: { id: true, url: true, type: true } },
      addOns: { where: { isActive: true }, select: { id: true, name: true, price: true } },
    },
  })
  if (!studio) return null
  return {
    ...studio,
    hourlyRate: studio.hourlyRate ? Number(studio.hourlyRate) : 0,
    addOns: (studio.addOns ?? []).map((a) => ({ ...a, price: a.price ? Number(a.price) : 0 })),
  }
}

export default async function StudioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const studio = await getStudio(slug)
  if (!studio) notFound()

  return (
    <main className="container py-8 px-4">
      <StudioDetail studio={studio} />
    </main>
  )
}
