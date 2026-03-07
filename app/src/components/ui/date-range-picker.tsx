/**
 * Date range picker for rental start/end (pickup -> return).
 * Modern styling with calendar icons and consistent rounded-xl inputs.
 */

'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  startLabel?: string
  endLabel?: string
  minStart?: string
  minEnd?: string
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = 'Start date',
  endLabel = 'End date',
  minStart,
  minEnd,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
        <Calendar className="h-3.5 w-3.5" />
        Rental dates
      </Label>
      <div className="space-y-2">
        <div className="space-y-1.5">
          <Label htmlFor="filter-start-date" className="text-xs text-text-muted">
            {startLabel}
          </Label>
          <Input
            id="filter-start-date"
            type="date"
            value={startDate}
            min={minStart}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full rounded-xl border-border-light bg-surface-light text-sm focus-visible:ring-brand-primary/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-end-date" className="text-xs text-text-muted">
            {endLabel}
          </Label>
          <Input
            id="filter-end-date"
            type="date"
            value={endDate}
            min={minEnd ?? startDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full rounded-xl border-border-light bg-surface-light text-sm focus-visible:ring-brand-primary/20"
          />
        </div>
      </div>
    </div>
  )
}
