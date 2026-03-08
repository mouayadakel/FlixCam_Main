/**
 * @file review.validator.ts
 * @description Zod schemas for review API payloads
 * @module lib/validators/review.validator
 */

import { z } from 'zod'

const reviewStatusEnum = z.enum(['PENDING_MODERATION', 'APPROVED', 'REJECTED'])

export const createReviewSchema = z.object({
  bookingId: z.string().cuid(),
  userId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
})

export const updateReviewSchema = z.object({
  status: reviewStatusEnum.optional(),
  adminResponse: z.string().max(1000).optional().nullable(),
})

export const respondToReviewSchema = z.object({
  adminResponse: z.string().min(1).max(1000),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type RespondToReviewInput = z.infer<typeof respondToReviewSchema>
