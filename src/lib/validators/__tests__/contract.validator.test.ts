/**
 * Unit tests for contract.validator
 */

import {
  contractStatusSchema,
  createContractSchema,
  signContractSchema,
  signatureDataSchema,
} from '../contract.validator'

describe('contract.validator', () => {
  describe('contractStatusSchema', () => {
    it('accepts valid status', () => {
      expect(contractStatusSchema.safeParse('draft').success).toBe(true)
    })
    it('rejects invalid status', () => {
      expect(contractStatusSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('signatureDataSchema', () => {
    it('accepts valid signature data', () => {
      const result = signatureDataSchema.safeParse({
        signature: 'base64',
        signedBy: 'user_1',
        signedAt: new Date(),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createContractSchema', () => {
    it('accepts bookingId', () => {
      const result = createContractSchema.safeParse({ bookingId: 'bk_1' })
      expect(result.success).toBe(true)
    })
  })

  describe('signContractSchema', () => {
    it('accepts signature', () => {
      const result = signContractSchema.safeParse({ signature: 'data' })
      expect(result.success).toBe(true)
    })
  })
})
