/**
 * Unit tests for damage-claim.validator
 */

import {
  createDamageClaimSchema,
  updateDamageClaimSchema,
  resolveDamageClaimSchema,
} from '../damage-claim.validator'

const validCuid = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx'

describe('damage-claim.validator', () => {
  describe('createDamageClaimSchema', () => {
    it('accepts valid input', () => {
      const result = createDamageClaimSchema.safeParse({
        bookingId: validCuid,
        damageType: 'PHYSICAL_DAMAGE',
        severity: 'MODERATE',
        description: 'Lens scratch',
        estimatedCost: 500,
      })
      expect(result.success).toBe(true)
    })
    it('accepts with equipmentId and photos', () => {
      const result = createDamageClaimSchema.safeParse({
        bookingId: validCuid,
        equipmentId: validCuid,
        damageType: 'MALFUNCTION',
        severity: 'SEVERE',
        description: 'Camera not powering on',
        photos: ['https://example.com/photo.jpg'],
        estimatedCost: 1000,
        insuranceClaim: true,
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid damageType', () => {
      const result = createDamageClaimSchema.safeParse({
        bookingId: validCuid,
        damageType: 'INVALID',
        severity: 'MINOR',
        description: 'Test',
        estimatedCost: 0,
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty description', () => {
      const result = createDamageClaimSchema.safeParse({
        bookingId: validCuid,
        damageType: 'PHYSICAL_DAMAGE',
        severity: 'MINOR',
        description: '',
        estimatedCost: 0,
      })
      expect(result.success).toBe(false)
    })
    it('rejects negative estimatedCost', () => {
      const result = createDamageClaimSchema.safeParse({
        bookingId: validCuid,
        damageType: 'PHYSICAL_DAMAGE',
        severity: 'MINOR',
        description: 'Test',
        estimatedCost: -1,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateDamageClaimSchema', () => {
    it('accepts partial update', () => {
      const result = updateDamageClaimSchema.safeParse({
        status: 'RESOLVED',
        resolution: 'Replaced part',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updateDamageClaimSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('resolveDamageClaimSchema', () => {
    it('accepts valid resolution', () => {
      const result = resolveDamageClaimSchema.safeParse({
        status: 'APPROVED',
        resolution: 'Claim approved and paid',
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty resolution', () => {
      const result = resolveDamageClaimSchema.safeParse({
        status: 'REJECTED',
        resolution: '',
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid status', () => {
      const result = resolveDamageClaimSchema.safeParse({
        status: 'PENDING',
        resolution: 'Notes',
      })
      expect(result.success).toBe(false)
    })
  })
})
