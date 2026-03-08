/**
 * @file reports.validator.ts
 * @description Validation schemas for reports operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'

export const reportTypeSchema = z.enum(
  ['revenue', 'bookings', 'equipment', 'customers', 'financial', 'inventory'],
  {
    errorMap: () => ({ message: 'نوع التقرير غير صالح' }),
  }
)

export const reportPeriodSchema = z.enum(
  ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
  {
    errorMap: () => ({ message: 'الفترة غير صالحة' }),
  }
)

export const reportFilterSchema = z
  .object({
    dateFrom: z.coerce.date({
      errorMap: () => ({ message: 'تاريخ البداية مطلوب' }),
    }),
    dateTo: z.coerce.date({
      errorMap: () => ({ message: 'تاريخ النهاية مطلوب' }),
    }),
    period: reportPeriodSchema.optional(),
    equipmentIds: z.array(z.string()).optional(),
    customerIds: z.array(z.string()).optional(),
    bookingStatuses: z.array(z.string()).optional(),
    includeCancelled: z.boolean().optional(),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['dateTo'],
  })

export type ReportFilterInput = z.infer<typeof reportFilterSchema>
