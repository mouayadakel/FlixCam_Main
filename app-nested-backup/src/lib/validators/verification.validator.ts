/**
 * @file verification.validator.ts
 * @description Zod schemas for customer verification API payloads
 * @module lib/validators/verification.validator
 */

import { z } from 'zod'

const verificationStatusEnum = z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'])
const documentTypeEnum = z.enum(['ID', 'PROOF_OF_ADDRESS', 'OTHER'])

export const updateUserVerificationSchema = z.object({
  verificationStatus: verificationStatusEnum,
  rejectionReason: z.string().max(500).optional().nullable(),
})

export const reviewDocumentSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional().nullable(),
})

export const createVerificationDocumentSchema = z.object({
  userId: z.string().cuid(),
  documentType: documentTypeEnum,
  fileUrl: z.string().url(),
  filename: z.string().optional().nullable(),
  mimeType: z.string().optional().nullable(),
})

export type UpdateUserVerificationInput = z.infer<typeof updateUserVerificationSchema>
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>
export type CreateVerificationDocumentInput = z.infer<typeof createVerificationDocumentSchema>
