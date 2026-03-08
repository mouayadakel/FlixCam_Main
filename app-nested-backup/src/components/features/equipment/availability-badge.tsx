/**
 * Color-coded availability badge with dot indicator.
 * Green: available; Amber: limited; Red: unavailable; Gray: coming soon.
 * Consistent with the rounded design system.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable' | 'coming_soon'

interface AvailabilityBadgeProps {
  status: AvailabilityStatus
  quantityAvailable?: number
  className?: string
}

const STATUS_STYLES: Record<AvailabilityStatus, { bg: string; dot: string; labelKey: string }> = {
  available: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40',
    dot: 'bg-emerald-500',
    labelKey: 'common.available',
  },
  limited: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40',
    dot: 'bg-amber-500',
    labelKey: 'equipment.limited',
  },
  unavailable: {
    bg: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40',
    dot: 'bg-red-500',
    labelKey: 'common.unavailable',
  },
  coming_soon: {
    bg: 'bg-neutral-100 text-neutral-500 border-neutral-200/60 dark:bg-neutral-800/30 dark:text-neutral-400 dark:border-neutral-700/40',
    dot: 'bg-neutral-400',
    labelKey: 'equipment.comingSoon',
  },
}

/**
 * Derive status from quantity and optional active flag.
 */
export function getAvailabilityStatus(
  quantityAvailable: number | null | undefined,
  isActive: boolean = true
): AvailabilityStatus {
  if (!isActive) return 'coming_soon'
  const q = quantityAvailable ?? 0
  if (q <= 0) return 'unavailable'
  if (q <= 2) return 'limited'
  return 'available'
}

export function AvailabilityBadge({
  status,
  quantityAvailable,
  className,
}: AvailabilityBadgeProps) {
  const { t } = useLocale()
  const { bg, dot, labelKey } = STATUS_STYLES[status]
  const label = t(labelKey)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-label-small font-semibold uppercase tracking-wide',
        bg,
        className
      )}
      aria-label={label}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
      {quantityAvailable != null && status === 'limited' && (
        <span className="opacity-75">({quantityAvailable})</span>
      )}
    </span>
  )
}
