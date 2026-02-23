/**
 * @file booking-timeline.tsx
 * @description Visual timeline showing booking lifecycle events
 * @module components/features/portal
 */

import { BookingStatus } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  FileEdit,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Play,
  RotateCcw,
  Lock,
  XCircle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format.utils'

interface BookingTimelineProps {
  status: BookingStatus
  createdAt: string | Date
  startDate: string | Date
  endDate: string | Date
  actualReturnDate?: string | Date | null
}

const STEPS: {
  status: BookingStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { status: 'DRAFT', label: 'مسودة', icon: FileEdit },
  { status: 'RISK_CHECK', label: 'فحص المخاطر', icon: ShieldCheck },
  { status: 'PAYMENT_PENDING', label: 'انتظار الدفع', icon: CreditCard },
  { status: 'CONFIRMED', label: 'مؤكد', icon: CheckCircle2 },
  { status: 'ACTIVE', label: 'نشط', icon: Play },
  { status: 'RETURNED', label: 'مرتجع', icon: RotateCcw },
  { status: 'CLOSED', label: 'مغلق', icon: Lock },
]

const STATUS_ORDER: Record<BookingStatus, number> = {
  DRAFT: 0,
  RISK_CHECK: 1,
  PAYMENT_PENDING: 2,
  CONFIRMED: 3,
  ACTIVE: 4,
  RETURNED: 5,
  CLOSED: 6,
  CANCELLED: -1,
}

export function BookingTimeline({
  status,
  createdAt,
  startDate,
  endDate,
  actualReturnDate,
}: BookingTimelineProps) {
  const currentOrder = STATUS_ORDER[status]
  const isCancelled = status === 'CANCELLED'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <XCircle className="h-6 w-6 shrink-0 text-red-500" />
        <div>
          <p className="font-medium text-red-800">تم إلغاء الحجز</p>
          <p className="text-sm text-red-600">تم الإنشاء في {formatDate(createdAt)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-between">
        {/* Progress bar background */}
        <div className="absolute inset-x-0 top-5 h-0.5 bg-muted" />
        {/* Progress bar filled */}
        <div
          className="absolute top-5 h-0.5 bg-primary transition-all"
          style={{
            right: 0,
            width: `${Math.min(100, (currentOrder / (STEPS.length - 1)) * 100)}%`,
          }}
        />

        {STEPS.map((step, i) => {
          const order = STATUS_ORDER[step.status]
          const isCompleted = order < currentOrder
          const isCurrent = order === currentOrder
          const Icon = step.icon

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                  isCompleted
                    ? 'border-primary bg-primary text-white'
                    : isCurrent
                      ? 'border-primary bg-white text-primary shadow-md'
                      : 'border-muted bg-white text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  'mt-2 text-center text-[11px] font-medium leading-tight',
                  isCurrent
                    ? 'text-primary'
                    : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Date details */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>تاريخ الإنشاء: {formatDate(createdAt)}</span>
        <span>بداية الحجز: {formatDate(startDate)}</span>
        <span>نهاية الحجز: {formatDate(endDate)}</span>
        {actualReturnDate && <span>تاريخ الإرجاع: {formatDate(actualReturnDate)}</span>}
      </div>
    </div>
  )
}
