/**
 * @file studio-package.validator.ts
 * @description Zod schemas for studio package API payloads
 * @module lib/validators/studio-package.validator
 */

import { z } from 'zod'

const optionalString = z.string().max(500).optional().nullable().or(z.literal(''))

export const createStudioPackageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  nameAr: optionalString,
  nameZh: optionalString,
  description: optionalString,
  descriptionAr: optionalString,
  includes: z.string().optional().nullable(),
  price: z.number().min(0, 'Price must be non-negative'),
  originalPrice: z.number().min(0).optional().nullable(),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  hours: z.number().int().min(0).optional().nullable(),
  recommended: z.boolean().optional().default(false),
  badgeText: z.string().max(60).optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updateStudioPackageSchema = createStudioPackageSchema.partial()

export const reorderStudioPackageSchema = z.object({
  packageIds: z.array(z.string().cuid()).min(0),
})

export type CreateStudioPackageInput = z.infer<typeof createStudioPackageSchema>
export type UpdateStudioPackageInput = z.infer<typeof updateStudioPackageSchema>
export type ReorderStudioPackageInput = z.infer<typeof reorderStudioPackageSchema>
