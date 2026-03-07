/**
 * @file faq.validator.ts
 * @description Zod validation schemas for FAQ items (homepage FAQ section)
 * @module validators/faq
 */

import { z } from 'zod'

const textOptional = z.string().max(2000).optional().nullable().or(z.literal(''))

export const createFaqSchema = z.object({
  questionAr: z.string().min(1, 'Arabic question is required').max(500),
  questionEn: z.string().min(1, 'English question is required').max(500),
  questionZh: textOptional,
  answerAr: z.string().min(1, 'Arabic answer is required').max(2000),
  answerEn: z.string().min(1, 'English answer is required').max(2000),
  answerZh: textOptional,
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updateFaqSchema = createFaqSchema.partial()

export const reorderFaqSchema = z.object({
  faqIds: z.array(z.string().cuid()).min(0),
})

export type CreateFaqInput = z.infer<typeof createFaqSchema>
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>
export type ReorderFaqInput = z.infer<typeof reorderFaqSchema>
