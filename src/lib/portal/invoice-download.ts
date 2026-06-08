import type { BookingStatus } from '@prisma/client'

const DOWNLOADABLE_STATUSES = new Set<BookingStatus>([
  'PAYMENT_PENDING',
  'CONFIRMED',
  'ACTIVE',
  'RETURNED',
  'CLOSED',
])

export function canDownloadBookingInvoice(status: BookingStatus): boolean {
  return DOWNLOADABLE_STATUSES.has(status)
}

export function getBookingInvoicePdfUrl(booking: {
  id: string
  invoices?: { id: string }[]
}): string {
  const invoiceId = booking.invoices?.[0]?.id
  return invoiceId
    ? `/api/invoices/${invoiceId}/pdf`
    : `/api/bookings/${booking.id}/invoice-pdf`
}
