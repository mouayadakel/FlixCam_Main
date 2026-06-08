/**
 * Shared typed payloads for EventBus events.
 */

import type { BookingStatus, PaymentStatus, Prisma } from '@prisma/client'

export interface EventBookingRef {
  id: string
  bookingNumber?: string
  customerId?: string
  status?: BookingStatus | string
  totalAmount?: number | string | Prisma.Decimal
  [key: string]: unknown
}

export interface EventPaymentRef {
  id: string
  bookingId?: string
  status?: PaymentStatus | string
  amount?: number | string
}

export interface BookingEventPayload {
  booking: EventBookingRef
  userId: string
  timestamp?: Date
}

export interface PaymentEventPayload {
  paymentId?: string
  bookingId?: string
  bookingNumber?: string
  customerId?: string
  amount?: string | number
  userId?: string
  notifyCustomer?: boolean
}

export interface EventEquipmentRef {
  id: string
  sku?: string
  model?: string | null
}

export interface DepositEventPayload {
  bookingId: string
  depositId: string
  userId: string
  reason?: string
  timestamp?: Date
}
