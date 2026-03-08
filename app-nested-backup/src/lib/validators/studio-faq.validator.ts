/**
 * @file studio-faq.validator.ts
 * @description Zod schemas for studio FAQ API payloads
 * @module lib/validators/studio-faq.validator
 */

import { z } from 'zod'

const textOptional = z.string().max(2000).optional().nullable().or(z.literal(''))

export const createStudioFaqSchema = z.object({
  questionAr: z.string().min(1, 'Arabic question is required').max(500),
  questionEn: textOptional,
  questionZh: textOptional,
  answerAr: z.string().min(1, 'Arabic answer is required').max(2000),
  answerEn: textOptional,
  answerZh: textOptional,
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updateStudioFaqSchema = createStudioFaqSchema.partial()

export const reorderStudioFaqSchema = z.object({
  faqIds: z.array(z.string().cuid()).min(0),
})

export type CreateStudioFaqInput = z.infer<typeof createStudioFaqSchema>
export type UpdateStudioFaqInput = z.infer<typeof updateStudioFaqSchema>
export type ReorderStudioFaqInput = z.infer<typeof reorderStudioFaqSchema>
