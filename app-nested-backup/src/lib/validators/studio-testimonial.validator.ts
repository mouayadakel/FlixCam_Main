/**
 * @file studio-testimonial.validator.ts
 * @description Zod schemas for studio testimonial API payloads
 * @module lib/validators/studio-testimonial.validator
 */

import { z } from 'zod'

export const createStudioTestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  role: z.string().max(120).optional().nullable(),
  text: z.string().min(1, 'Text is required').max(1000),
  rating: z.number().int().min(1).max(5).optional().default(5),
  avatarUrl: z.string().url().optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updateStudioTestimonialSchema = createStudioTestimonialSchema.partial()

export type CreateStudioTestimonialInput = z.infer<typeof createStudioTestimonialSchema>
export type UpdateStudioTestimonialInput = z.infer<typeof updateStudioTestimonialSchema>
