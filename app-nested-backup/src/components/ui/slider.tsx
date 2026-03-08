/**
 * @file slider.tsx
 * @description Single-thumb slider compatible with value/onValueChange array API
 * @module components/ui
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  id?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      id,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const current = value ?? internalValue
    const num = current[0] ?? min

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      const next = [v]
      if (value === undefined) setInternalValue(next)
      onValueChange?.(next)
    }

    return (
      <div ref={ref} className={cn('relative flex w-full touch-none items-center', className)}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={handleChange}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:pointer-events-none disabled:opacity-50"
          aria-label="Slider"
        />
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
