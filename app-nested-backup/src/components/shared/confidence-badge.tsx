'use client'

import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  confidence: number
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

function getConfidenceLevel(confidence: number) {
  if (confidence >= 90)
    return {
      label: 'عالية',
      labelEn: 'High',
      color: 'bg-green-100 text-green-800 border-green-200',
    }
  if (confidence >= 70)
    return {
      label: 'متوسطة',
      labelEn: 'Medium',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    }
  return {
    label: 'منخفضة',
    labelEn: 'Low',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  }
}

export function ConfidenceBadge({
  confidence,
  showLabel = true,
  size = 'sm',
  className,
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence)
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        level.color,
        sizeClasses,
        className
      )}
    >
      <span>{Math.round(confidence)}%</span>
      {showLabel && <span>{level.label}</span>}
    </span>
  )
}

export { getConfidenceLevel }
