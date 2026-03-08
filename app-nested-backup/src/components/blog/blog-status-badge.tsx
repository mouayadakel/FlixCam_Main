/**
 * Status badge for blog posts (Draft, Review, Published, Scheduled, Archived).
 * Used in admin list and preview banner.
 */

import { cn } from '@/lib/utils'
import type { BlogPostStatus } from '@prisma/client'

const STATUS_CONFIG: Record<
  BlogPostStatus,
  { labelAr: string; labelEn: string; className: string }
> = {
  DRAFT: {
    labelAr: 'مسودة',
    labelEn: 'Draft',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  REVIEW: {
    labelAr: 'قيد المراجعة',
    labelEn: 'In Review',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  PUBLISHED: {
    labelAr: 'منشور',
    labelEn: 'Published',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  SCHEDULED: {
    labelAr: 'مجدول',
    labelEn: 'Scheduled',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  ARCHIVED: {
    labelAr: 'مؤرشف',
    labelEn: 'Archived',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

interface BlogStatusBadgeProps {
  status: BlogPostStatus
  locale?: 'ar' | 'en'
  className?: string
}

export function BlogStatusBadge({ status, locale = 'ar', className }: BlogStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT
  const label = locale === 'ar' ? config.labelAr : config.labelEn

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {label}
    </span>
  )
}
