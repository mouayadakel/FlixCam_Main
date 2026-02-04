/**
 * Equipment catalog page (Phase 2.2): Grid, filters, cards, skeleton, pagination.
 */

import { Suspense } from 'react'
import { EquipmentCatalogClient } from './equipment-catalog-client'

export default function EquipmentCatalogPage() {
  return (
    <main className="container py-8 px-4">
      <Suspense fallback={<EquipmentCatalogFallback />}>
        <EquipmentCatalogClient />
      </Suspense>
    </main>
  )
}

function EquipmentCatalogFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      <div className="h-10 w-full max-w-md rounded bg-muted animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card overflow-hidden">
            <div className="aspect-[4/3] bg-muted animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
