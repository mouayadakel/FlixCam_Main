/**
 * @file brand.validator.ts
 * @description Zod schemas for brand API payloads
 * @module lib/validators/brand.validator
 */

import { z } from 'zod'

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  website: z.string().url().optional().nullable().or(z.literal('')),
})

export const updateBrandSchema = createBrandSchema.partial()

export type CreateBrandInput = z.infer<typeof createBrandSchema>
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>
