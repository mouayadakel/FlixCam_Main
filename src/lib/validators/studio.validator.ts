/**
 * @file studio.validator.ts
 * @description Zod schemas for studio API payloads
 * @module lib/validators/studio.validator
 */

import { z } from 'zod'

export const createStudioSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative'),
  setupBuffer: z.number().int().min(0).max(480).optional(),
  cleaningBuffer: z.number().int().min(0).max(480).optional(),
  resetTime: z.number().int().min(0).max(120).optional(),
  isActive: z.boolean().optional(),
})

export const updateStudioSchema = createStudioSchema.partial()

export type CreateStudioInput = z.infer<typeof createStudioSchema>
export type UpdateStudioInput = z.infer<typeof updateStudioSchema>
