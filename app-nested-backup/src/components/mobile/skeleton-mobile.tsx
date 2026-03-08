'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Pre-built mobile skeleton: card with image top + 3 text lines.
 */
function EquipmentCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-card',
        className
      )}
    >
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
}

/**
 * Pre-built mobile skeleton: horizontal row with avatar + 2 lines + badge.
 */
function BookingRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-border bg-card p-4',
        className
      )}
    >
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
    </div>
  )
}

/**
 * Pre-built mobile skeleton: full-width row with 4 cells (admin table row as card).
 */
function AdminTableRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4', className)}
    >
      <Skeleton className="h-4 w-full sm:w-1/4" />
      <Skeleton className="h-4 w-full sm:w-1/4" />
      <Skeleton className="h-4 w-full sm:w-1/4" />
      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
    </div>
  )
}

/**
 * Pre-built mobile skeleton: small square card with number + label.
 */
function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-card', className)}>
      <Skeleton className="mb-2 h-8 w-16" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

export { EquipmentCardSkeleton, BookingRowSkeleton, AdminTableRowSkeleton, StatCardSkeleton }
