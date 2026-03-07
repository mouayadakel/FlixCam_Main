/**
 * @file pricing-rule.validator.ts
 * @description Zod schemas for pricing rule API payloads
 * @module lib/validators/pricing-rule.validator
 */

import { z } from 'zod'

const ruleTypeEnum = z.enum([
  'SEASONAL',
  'DEMAND_BASED',
  'DURATION',
  'CUSTOMER',
  'EARLY_BIRD',
  'BUNDLE',
])
const adjustmentTypeEnum = z.enum(['PERCENTAGE', 'FIXED', 'REPLACE'])

const conditionsSchema = z
  .object({
    dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    minDuration: z.number().int().min(0).optional(),
    maxDuration: z.number().int().min(0).optional(),
    customerSegmentIds: z.array(z.string().cuid()).optional(),
    equipmentCategoryIds: z.array(z.string().cuid()).optional(),
    studioIds: z.array(z.string().cuid()).optional(),
    bookDaysAhead: z.number().int().min(0).optional(),
  })
  .strict()

export const createPricingRuleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  ruleType: ruleTypeEnum,
  priority: z.number().int().min(0).optional().default(0),
  conditions: conditionsSchema,
  adjustmentType: adjustmentTypeEnum,
  adjustmentValue: z.number(),
  isActive: z.boolean().optional().default(true),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
})

export const updatePricingRuleSchema = createPricingRuleSchema.partial()

export const previewPricingSchema = z.object({
  equipmentIds: z.array(z.string().cuid()).optional().default([]),
  studioId: z.string().cuid().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  customerId: z.string().cuid().optional().nullable(),
})

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>
export type PreviewPricingInput = z.infer<typeof previewPricingSchema>
