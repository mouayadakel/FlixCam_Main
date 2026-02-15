/**
 * Equipment catalog page (Phase 2.2): Grid, filters, cards, skeleton, pagination.
 * Guarded by enable_equipment_catalog feature flag.
 */

import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { EquipmentCatalogClient } from './equipment-catalog-client'

export default async function EquipmentCatalogPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_equipment_catalog')
  if (!enabled) redirect('/')
  return (
    <main className="mx-auto w-full max-w-public-container px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Suspense fallback={<EquipmentCatalogFallback />}>
        <EquipmentCatalogClient />
      </Suspense>
    </main>
  )
}

function EquipmentCatalogFallback() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="h-9 w-56 rounded-xl bg-muted animate-pulse" />
      <div className="h-5 w-40 rounded-lg bg-muted/60 animate-pulse" />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar skeleton */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="rounded-2xl border border-border-light/40 bg-white p-5 space-y-4 shadow-card">
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-muted/60 animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-muted/60 animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-muted/60 animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-muted/60 animate-pulse" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-light/40 bg-white overflow-hidden shadow-card">
              <div className="aspect-[4/3] bg-muted animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded-lg bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded-lg bg-muted/60 animate-pulse" />
                <div className="h-5 w-1/3 rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
