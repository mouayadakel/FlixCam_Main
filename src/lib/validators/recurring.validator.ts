/**
 * @file recurring.validator.ts
 * @description Zod schemas for recurring booking series
 * @module lib/validators/recurring.validator
 */

import { z } from 'zod'

const frequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY'])
const templateItem = z.object({
  equipmentId: z.string().cuid(),
  quantity: z.number().int().min(1).default(1),
})

export const createRecurringSeriesSchema = z
  .object({
    name: z.string().min(1).max(120),
    customerId: z.string().cuid(),
    frequency: frequencyEnum,
    interval: z.number().int().min(1).max(365).default(1),
    endDate: z.string().datetime().optional().nullable(),
    occurrenceCount: z.number().int().min(1).max(365).optional().nullable(),
    template: z.object({
      equipmentIds: z.array(templateItem).min(1),
      studioId: z.string().cuid().optional().nullable(),
      notes: z.string().max(500).optional().nullable(),
    }),
  })
  .refine(
    (data) => data.endDate != null || data.occurrenceCount != null,
    { message: 'Either endDate or occurrenceCount is required', path: ['endDate'] }
  )

export const updateRecurringSeriesSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
})

export type CreateRecurringSeriesInput = z.infer<typeof createRecurringSeriesSchema>
export type UpdateRecurringSeriesInput = z.infer<typeof updateRecurringSeriesSchema>
