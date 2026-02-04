/**
 * @file category.validator.ts
 * @description Zod schemas for category API payloads (equipment categories)
 * @module lib/validators/category.validator
 */

import { z } from 'zod'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .max(120)
    .optional()
    .refine((v) => !v || slugRegex.test(v), 'Slug must be lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
