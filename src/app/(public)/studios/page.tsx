/**
 * Studios list page (Phase 2.4).
 * Guarded by enable_studios feature flag.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export const metadata: Metadata = {
  title: t('ar', 'seo.studiosTitle'),
  description: t('ar', 'seo.studiosDescription'),
  alternates: generateAlternatesMetadata('/studios'),
  keywords: ['استوديو تصوير', 'studio rental', 'استوديو الرياض', 'تصوير سينمائي'],
  openGraph: {
    title: t('ar', 'seo.studiosTitle'),
    description: t('ar', 'seo.studiosDescription'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'استوديوهات التصوير | FlixCam.rent',
    description: 'استأجر استوديوهات تصوير احترافية في الرياض.',
  },
}

import { prisma } from '@/lib/db/prisma'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { StudiosListClient } from './studios-list-client'

const getStudios = unstable_cache(
  async () => {
    const list = await prisma.studio.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        capacity: true,
        hourlyRate: true,
        areaSqm: true,
        studioType: true,
        bestUse: true,
        availabilityConfidence: true,
        hasElectricity: true,
        hasAC: true,
        hasChangingRooms: true,
        address: true,
        media: { take: 1, select: { id: true, url: true, type: true } },
      },
      orderBy: { name: 'asc' },
    })
    return list.map((s) => ({
      ...s,
      hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : 0,
    }))
  },
  ['public-studios-list'],
  { revalidate: 300 }
)

export default async function StudiosListPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_studios')
  if (!enabled) redirect('/')
  const studios = await getStudios()
  return (
    <main className="mx-auto w-full max-w-public-container px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <Suspense fallback={<StudiosListFallback />}>
        <StudiosListClient studios={studios} />
      </Suspense>
    </main>
  )
}

function StudiosListFallback() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-5 w-96 animate-pulse rounded-lg bg-muted/60" />
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-10 w-32 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-10 w-32 animate-pulse rounded-xl bg-muted/60" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border-light/40 bg-white shadow-card"
          >
            <div className="aspect-[16/10] animate-pulse bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
              <div className="flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted/60" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted/60" />
              </div>
              <div className="h-4 w-full animate-pulse rounded-lg bg-muted/40" />
              <div className="h-4 w-2/3 animate-pulse rounded-lg bg-muted/40" />
              <div className="flex items-center justify-between pt-2">
                <div className="h-6 w-24 animate-pulse rounded-lg bg-muted" />
                <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
