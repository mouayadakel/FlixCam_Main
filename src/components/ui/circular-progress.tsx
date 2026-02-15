/**
 * SVG-based circular progress indicator. Use for completeness scores, etc.
 * Props: value (0–100), size, strokeWidth, className, children (center content).
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CircularProgressProps {
  /** Progress value 0–100 */
  value: number
  /** Diameter in pixels */
  size?: number
  /** Stroke width in pixels */
  strokeWidth?: number
  /** Tailwind class for the track (background) circle */
  trackClassName?: string
  /** Tailwind class for the indicator (filled) arc */
  indicatorClassName?: string
  /** Root wrapper class */
  className?: string
  /** Content rendered in the center */
  children?: React.ReactNode
}

const DEFAULT_SIZE = 120
const DEFAULT_STROKE = 8

export function CircularProgress({
  value,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
  trackClassName = 'stroke-muted',
  indicatorClassName = 'stroke-brand-primary',
  className,
  children,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('transition-none', trackClassName)}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-[stroke-dashoffset] duration-500 ease-out', indicatorClassName)}
        />
      </svg>
      {children != null && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  )
}
