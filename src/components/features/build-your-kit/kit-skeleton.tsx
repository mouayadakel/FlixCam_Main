/**
 * Skeleton loaders for kit wizard – category grid and equipment grid.
 */

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card',
            'animate-fade-in'
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EquipmentSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card',
            'animate-fade-in'
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <div className="pt-3 border-t border-border-light/60 flex justify-between items-center">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
