/**
 * @file damage-claim.validator.ts
 * @description Zod schemas for damage claim API payloads
 * @module lib/validators/damage-claim.validator
 */

import { z } from 'zod'

const damageTypeEnum = z.enum([
  'PHYSICAL_DAMAGE',
  'MALFUNCTION',
  'MISSING_PARTS',
  'EXCESSIVE_WEAR',
  'LOSS',
  'OTHER',
])
const severityEnum = z.enum(['MINOR', 'MODERATE', 'SEVERE', 'TOTAL_LOSS'])
const claimStatusEnum = z.enum([
  'PENDING',
  'INVESTIGATING',
  'APPROVED',
  'REJECTED',
  'RESOLVED',
  'DISPUTED',
])

export const createDamageClaimSchema = z.object({
  bookingId: z.string().cuid(),
  equipmentId: z.string().cuid().optional().nullable(),
  studioId: z.string().cuid().optional().nullable(),
  damageType: damageTypeEnum,
  severity: severityEnum,
  description: z.string().min(1, 'Description is required').max(5000),
  photos: z.array(z.string().url()).optional().nullable(),
  estimatedCost: z.number().min(0),
  insuranceClaim: z.boolean().optional().default(false),
})

export const updateDamageClaimSchema = z.object({
  damageType: damageTypeEnum.optional(),
  severity: severityEnum.optional(),
  description: z.string().min(1).max(5000).optional(),
  photos: z.array(z.string().url()).optional().nullable(),
  estimatedCost: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional().nullable(),
  status: claimStatusEnum.optional(),
  resolution: z.string().max(2000).optional().nullable(),
  customerNotified: z.boolean().optional(),
  insuranceClaim: z.boolean().optional(),
})

export const resolveDamageClaimSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'RESOLVED']),
  resolution: z.string().min(1, 'Resolution notes required').max(2000),
  actualCost: z.number().min(0).optional().nullable(),
  customerNotified: z.boolean().optional().default(false),
})

export type CreateDamageClaimInput = z.infer<typeof createDamageClaimSchema>
export type UpdateDamageClaimInput = z.infer<typeof updateDamageClaimSchema>
export type ResolveDamageClaimInput = z.infer<typeof resolveDamageClaimSchema>
