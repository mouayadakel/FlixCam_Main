/**
 * @file customer-segment.validator.ts
 * @description Zod schemas for customer segment API payloads
 * @module lib/validators/customer-segment.validator
 */

import { z } from 'zod'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const createCustomerSegmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z.string().max(120).optional().refine((v) => !v || slugRegex.test(v), 'Slug must be lowercase letters, numbers, hyphens'),
  description: z.string().max(500).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  priorityBooking: z.boolean().optional().default(false),
  extendedTerms: z.boolean().optional().default(false),
  autoAssignRules: z.record(z.unknown()).optional().nullable(),
})

export const updateCustomerSegmentSchema = createCustomerSegmentSchema.partial()

export type CreateCustomerSegmentInput = z.infer<typeof createCustomerSegmentSchema>
export type UpdateCustomerSegmentInput = z.infer<typeof updateCustomerSegmentSchema>
