/**
 * @file policy.validator.ts
 * @description Zod validation schemas for policy items (rental policies page)
 * @module validators/policy
 */

import { z } from 'zod'

const textOptional = z.string().max(500).optional().nullable().or(z.literal(''))
const bodyOptional = z.string().max(100000).optional().nullable().or(z.literal(''))
const BODY_MAX = 100000

export const createPolicySchema = z.object({
  titleAr: z.string().min(1, 'Arabic title is required').max(200),
  titleEn: z.string().min(1, 'English title is required').max(200),
  titleZh: textOptional,
  bodyAr: z.string().min(1, 'Arabic body is required').max(BODY_MAX),
  bodyEn: z.string().min(1, 'English body is required').max(BODY_MAX),
  bodyZh: bodyOptional,
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updatePolicySchema = createPolicySchema.partial()

export const reorderPolicySchema = z.object({
  policyIds: z.array(z.string().cuid()).min(0),
})

export type CreatePolicyInput = z.infer<typeof createPolicySchema>
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>
export type ReorderPolicyInput = z.infer<typeof reorderPolicySchema>
