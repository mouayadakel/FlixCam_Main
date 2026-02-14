/**
 * Min/max price range inputs with SAR labels, visual range bar, and rounded styling.
 */

'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

interface PriceRangeSliderProps {
  min: number
  max: number
  onMinChange: (value: number) => void
  onMaxChange: (value: number) => void
  absoluteMin?: number
  absoluteMax?: number
  label?: string
  className?: string
}

export function PriceRangeSlider({
  min,
  max,
  onMinChange,
  onMaxChange,
  absoluteMin = 0,
  absoluteMax = 100000,
  label = 'Price per day (SAR)',
  className,
}: PriceRangeSliderProps) {
  // Calculate visual range bar position
  const range = absoluteMax - absoluteMin
  const leftPercent = range > 0 ? ((min - absoluteMin) / range) * 100 : 0
  const rightPercent = range > 0 ? ((max - absoluteMin) / range) * 100 : 100

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-xs font-medium uppercase tracking-wider text-text-muted flex items-center gap-1.5">
        <DollarSign className="h-3.5 w-3.5" />
        {label}
      </Label>

      {/* Visual range bar */}
      <div className="relative h-1.5 w-full rounded-full bg-border-light/80">
        <div
          className="absolute h-full rounded-full bg-brand-primary/40 transition-all duration-200"
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(0, rightPercent - leftPercent)}%`,
          }}
        />
      </div>

      {/* Inputs */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted pointer-events-none">
            SAR
          </span>
          <Input
            type="number"
            min={absoluteMin}
            max={absoluteMax}
            value={min === absoluteMin ? '' : min}
            placeholder={String(absoluteMin)}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value, 10) : absoluteMin
              if (!Number.isNaN(v)) onMinChange(Math.max(absoluteMin, Math.min(v, absoluteMax)))
            }}
            className="w-full ps-11 rounded-xl border-border-light bg-surface-light text-sm focus-visible:ring-brand-primary/20"
          />
        </div>
        <span className="text-text-muted shrink-0 text-sm font-medium">&ndash;</span>
        <div className="relative flex-1">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted pointer-events-none">
            SAR
          </span>
          <Input
            type="number"
            min={absoluteMin}
            max={absoluteMax}
            value={max === absoluteMax ? '' : max}
            placeholder={String(absoluteMax)}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value, 10) : absoluteMax
              if (!Number.isNaN(v)) onMaxChange(Math.max(absoluteMin, Math.min(v, absoluteMax)))
            }}
            className="w-full ps-11 rounded-xl border-border-light bg-surface-light text-sm focus-visible:ring-brand-primary/20"
          />
        </div>
      </div>
    </div>
  )
}
