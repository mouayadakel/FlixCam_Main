'use client'

import { cn } from '@/lib/utils'

type ProductStatusType = 'DRAFT' | 'NEEDS_REVIEW' | 'READY' | 'PUBLISHED' | 'ACTIVE'

interface StatusBadgeProps {
  status: ProductStatusType | string
  size?: 'sm' | 'md'
  className?: string
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  DRAFT: { label: 'مسودة', dot: 'bg-gray-400', bg: 'bg-gray-100 text-gray-700 border-gray-200' },
  NEEDS_REVIEW: {
    label: 'يحتاج مراجعة',
    dot: 'bg-yellow-400',
    bg: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  READY: { label: 'جاهز', dot: 'bg-green-400', bg: 'bg-green-100 text-green-700 border-green-200' },
  PUBLISHED: {
    label: 'منشور',
    dot: 'bg-blue-400',
    bg: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  ACTIVE: { label: 'نشط', dot: 'bg-green-400', bg: 'bg-green-100 text-green-700 border-green-200' },
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.bg,
        sizeClasses,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
