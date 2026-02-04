/**
 * @file quote.validator.ts
 * @description Validation schemas for quote operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'

export const quoteStatusSchema = z.enum(
  ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
  {
    errorMap: () => ({ message: 'حالة العرض غير صالحة' }),
  }
)

export const quoteEquipmentItemSchema = z.object({
  equipmentId: z.string().min(1, 'معرف المعدات مطلوب'),
  quantity: z.number().int().min(1, 'الكمية يجب أن تكون على الأقل 1'),
})

export const createQuoteSchema = z.object({
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  startDate: z.coerce.date({
    errorMap: () => ({ message: 'تاريخ البداية مطلوب' }),
  }),
  endDate: z.coerce.date({
    errorMap: () => ({ message: 'تاريخ النهاية مطلوب' }),
  }),
  equipment: z
    .array(quoteEquipmentItemSchema)
    .min(1, 'يجب تحديد معدات واحدة على الأقل'),
  studioId: z.string().optional(),
  studioStartTime: z.coerce.date().optional(),
  studioEndTime: z.coerce.date().optional(),
  notes: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  discount: z.number().min(0).max(100).optional(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['endDate'],
  }
)

export const updateQuoteSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  equipment: z.array(quoteEquipmentItemSchema).optional(),
  studioId: z.string().optional(),
  studioStartTime: z.coerce.date().optional(),
  studioEndTime: z.coerce.date().optional(),
  notes: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  discount: z.number().min(0).max(100).optional(),
})

export const convertQuoteSchema = z.object({
  quoteId: z.string().min(1, 'معرف العرض مطلوب'),
})

export const quoteFilterSchema = z.object({
  status: quoteStatusSchema.optional(),
  customerId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type ConvertQuoteInput = z.infer<typeof convertQuoteSchema>
export type QuoteFilterInput = z.infer<typeof quoteFilterSchema>
