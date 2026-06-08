import type { BookingStatus, InvoiceStatus, PaymentStatus } from '@prisma/client'
import { LabeledStatusBadge } from '@/components/shared/labeled-status-badge'
import {
  BOOKING_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/constants/status-labels'

type Locale = 'ar' | 'en'

export function BookingStatusBadge({
  status,
  locale = 'ar',
}: {
  status: BookingStatus | string
  locale?: Locale
}) {
  return <LabeledStatusBadge value={status} labels={BOOKING_STATUS_LABELS} locale={locale} />
}

export function PaymentStatusBadge({
  status,
  locale = 'ar',
}: {
  status: PaymentStatus | string
  locale?: Locale
}) {
  return <LabeledStatusBadge value={status} labels={PAYMENT_STATUS_LABELS} locale={locale} />
}

export function InvoiceStatusBadge({
  status,
  locale = 'ar',
}: {
  status: InvoiceStatus | string
  locale?: Locale
}) {
  return <LabeledStatusBadge value={status} labels={INVOICE_STATUS_LABELS} locale={locale} />
}
