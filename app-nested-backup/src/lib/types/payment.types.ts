/**
 * @file payment.types.ts
 * @description TypeScript types for payment management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

import { PaymentStatus } from '@prisma/client'

export type PaymentStatusType = PaymentStatus

export interface Payment {
  id: string
  bookingId: string
  amount: number
  status: PaymentStatusType
  tapTransactionId?: string | null
  tapChargeId?: string | null
  refundAmount?: number | null
  refundReason?: string | null
  booking?: {
    id: string
    bookingNumber: string
    customerId: string
    totalPrice: number
    customer?: {
      id: string
      name: string | null
      email: string
    }
  } | null
  createdAt: Date
  updatedAt: Date
  createdBy?: string | null
  updatedBy?: string | null
}

export interface PaymentCreateInput {
  bookingId: string
  amount: number
  tapTransactionId?: string
  tapChargeId?: string
}

export interface PaymentUpdateInput {
  status?: PaymentStatusType
  tapTransactionId?: string
  tapChargeId?: string
}

export interface PaymentRefundInput {
  refundAmount: number
  refundReason: string
  requiresApproval?: boolean
}

export interface PaymentFilterInput {
  status?: PaymentStatusType
  bookingId?: string
  customerId?: string
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
  hasRefund?: boolean
  page?: number
  pageSize?: number
}
