'use client'

import { Badge } from '@/components/ui/badge'
import {
  BOOKING_STATUS_ADMIN_STYLES,
  BOOKING_STATUS_LABELS,
  getStatusLabel,
} from '@/lib/constants/status-labels'

export function AdminBookingStatusChip({
  status,
  locale = 'ar',
  className,
}: {
  status: string
  locale?: 'ar' | 'en'
  className?: string
}) {
  const style = BOOKING_STATUS_ADMIN_STYLES[status] ?? BOOKING_STATUS_ADMIN_STYLES.ACTIVE
  const label = getStatusLabel(BOOKING_STATUS_LABELS, status, locale)

  return (
    <Badge
      variant="outline"
      className={`${style.bgColor} ${style.color} border-transparent font-semibold ${className ?? ''}`}
    >
      {label}
    </Badge>
  )
}
