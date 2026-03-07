/**
 * @file payment.validator.ts
 * @description Validation schemas for payment operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'
import { PaymentStatus } from '@prisma/client'

export const paymentStatusSchema = z.nativeEnum(PaymentStatus, {
  errorMap: () => ({ message: 'حالة الدفع غير صالحة' }),
})

export const createPaymentSchema = z.object({
  bookingId: z.string().min(1, 'معرف الحجز مطلوب'),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من 0'),
  tapTransactionId: z.string().optional(),
  tapChargeId: z.string().optional(),
})

export const updatePaymentSchema = z.object({
  status: paymentStatusSchema.optional(),
  tapTransactionId: z.string().optional(),
  tapChargeId: z.string().optional(),
})

export const paymentRefundSchema = z.object({
  refundAmount: z.number().min(0.01, 'مبلغ الاسترداد يجب أن يكون أكبر من 0'),
  refundReason: z.string().min(1, 'سبب الاسترداد مطلوب'),
  requiresApproval: z.boolean().optional().default(true),
})

export const paymentFilterSchema = z.object({
  status: paymentStatusSchema.optional(),
  bookingId: z.string().optional(),
  customerId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  hasRefund: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type PaymentRefundInput = z.infer<typeof paymentRefundSchema>
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>
