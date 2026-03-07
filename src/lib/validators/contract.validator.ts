/**
 * @file contract.validator.ts
 * @description Validation schemas for contract operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'

export const contractStatusSchema = z.enum(
  ['draft', 'pending_signature', 'signed', 'expired', 'cancelled'],
  {
    errorMap: () => ({ message: 'حالة العقد غير صالحة' }),
  }
)

export const signatureDataSchema = z.object({
  signature: z.string().min(1, 'التوقيع مطلوب'),
  signedBy: z.string().min(1, 'معرف الموقع مطلوب'),
  signedAt: z.coerce.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export const contractContentSchema = z.object({
  terms: z.string().min(1, 'الشروط مطلوبة'),
  equipment: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string(),
      quantity: z.number().min(1),
      dailyPrice: z.number().min(0),
    })
  ),
  booking: z.object({
    id: z.string(),
    bookingNumber: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    totalAmount: z.number().min(0),
  }),
  customer: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().email(),
  }),
  termsVersion: z.string(),
  generatedAt: z.coerce.date(),
})

export const createContractSchema = z.object({
  bookingId: z.string().min(1, 'معرف الحجز مطلوب'),
  termsVersion: z.string().optional(),
})

export const updateContractSchema = z.object({
  termsVersion: z.string().optional(),
  contractContent: contractContentSchema.optional(),
})

export const signContractSchema = z.object({
  signature: z.string().min(1, 'التوقيع مطلوب'),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export const contractFilterSchema = z.object({
  status: contractStatusSchema.optional(),
  bookingId: z.string().optional(),
  customerId: z.string().optional(),
  signed: z.boolean().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  termsVersion: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>
export type SignContractInput = z.infer<typeof signContractSchema>
export type ContractFilterInput = z.infer<typeof contractFilterSchema>
