/**
 * @file kit.validator.ts
 * @description Zod schemas for equipment kits (bundles)
 * @module lib/validators/kit.validator
 */

import { z } from 'zod'

const kitItemSchema = z.object({
  equipmentId: z.string().cuid(),
  quantity: z.number().int().min(1).default(1),
})

export const createKitSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(1000).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  items: z.array(kitItemSchema).min(1),
})

export const updateKitSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/).optional(),
  description: z.string().max(1000).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(kitItemSchema).optional(),
})

export type CreateKitInput = z.infer<typeof createKitSchema>
export type UpdateKitInput = z.infer<typeof updateKitSchema>
