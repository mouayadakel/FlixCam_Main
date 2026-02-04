/**
 * Skeleton for equipment card (Phase 2.2).
 */

import { Skeleton } from '@/components/ui/skeleton'

export function EquipmentCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
