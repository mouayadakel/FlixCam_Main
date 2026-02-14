/**
 * Skeleton loader for equipment card – shimmer effect for better perceived performance.
 */

import { Skeleton } from '@/components/ui/skeleton'

export function EquipmentCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16 rounded-md" />
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <div className="pt-3 border-t border-border-light/60">
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}
