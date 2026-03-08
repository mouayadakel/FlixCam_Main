/**
 * Unit tests for verification.validator
 */

import {
  updateUserVerificationSchema,
  reviewDocumentSchema,
  createVerificationDocumentSchema,
} from '../verification.validator'

const validCuid = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx'

describe('verification.validator', () => {
  describe('updateUserVerificationSchema', () => {
    it('accepts valid input', () => {
      const result = updateUserVerificationSchema.safeParse({
        verificationStatus: 'VERIFIED',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with rejectionReason', () => {
      const result = updateUserVerificationSchema.safeParse({
        verificationStatus: 'REJECTED',
        rejectionReason: 'Document unclear',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid status', () => {
      const result = updateUserVerificationSchema.safeParse({
        verificationStatus: 'INVALID',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('reviewDocumentSchema', () => {
    it('accepts approved', () => {
      const result = reviewDocumentSchema.safeParse({ status: 'approved' })
      expect(result.success).toBe(true)
    })
    it('accepts rejected with reason', () => {
      const result = reviewDocumentSchema.safeParse({
        status: 'rejected',
        rejectionReason: 'Blurry image',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid status', () => {
      const result = reviewDocumentSchema.safeParse({ status: 'pending' })
      expect(result.success).toBe(false)
    })
  })

  describe('createVerificationDocumentSchema', () => {
    it('accepts valid input', () => {
      const result = createVerificationDocumentSchema.safeParse({
        userId: validCuid,
        documentType: 'ID',
        fileUrl: 'https://example.com/doc.pdf',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with optional fields', () => {
      const result = createVerificationDocumentSchema.safeParse({
        userId: validCuid,
        documentType: 'PROOF_OF_ADDRESS',
        fileUrl: 'https://example.com/doc.pdf',
        filename: 'id.pdf',
        mimeType: 'application/pdf',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid documentType', () => {
      const result = createVerificationDocumentSchema.safeParse({
        userId: validCuid,
        documentType: 'INVALID',
        fileUrl: 'https://example.com/doc.pdf',
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid fileUrl', () => {
      const result = createVerificationDocumentSchema.safeParse({
        userId: validCuid,
        documentType: 'ID',
        fileUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })
})
