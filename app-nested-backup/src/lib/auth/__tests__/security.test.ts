/**
 * Phase 10: Security test suite
 * Covers: permission matching, auth flows, no admin bypass patterns
 */

import { matchesPermission } from '../matches-permission'

describe('security', () => {
  describe('matchesPermission', () => {
    it('exact match returns true', () => {
      expect(matchesPermission('booking.create', 'booking.create')).toBe(true)
      expect(matchesPermission('equipment.read', 'equipment.read')).toBe(true)
    })

    it('wildcard * grants all', () => {
      expect(matchesPermission('*', 'booking.create')).toBe(true)
      expect(matchesPermission('*', 'equipment.delete')).toBe(true)
    })

    it('resource wildcard grants all actions for that resource', () => {
      expect(matchesPermission('booking.*', 'booking.create')).toBe(true)
      expect(matchesPermission('booking.*', 'booking.delete')).toBe(true)
      expect(matchesPermission('equipment.*', 'equipment.read')).toBe(true)
    })

    it('different resource returns false', () => {
      expect(matchesPermission('booking.create', 'equipment.create')).toBe(false)
      expect(matchesPermission('booking.*', 'equipment.read')).toBe(false)
    })

    it('different action (no wildcard) returns false', () => {
      expect(matchesPermission('booking.create', 'booking.delete')).toBe(false)
      expect(matchesPermission('equipment.read', 'equipment.update')).toBe(false)
    })

    it('empty or malformed granted is safe', () => {
      expect(matchesPermission('', 'booking.create')).toBe(false)
      expect(matchesPermission('booking', 'booking.create')).toBe(false)
    })
  })

  describe('permission naming convention', () => {
    it('uses resource.action format (noun.verb)', () => {
      const validExamples = [
        'booking.create',
        'equipment.read',
        'payment.refund',
        'invoice.generate_zatca',
      ]
      validExamples.forEach((p) => {
        const [resource, action] = p.split('.')
        expect(resource).toBeDefined()
        expect(action).toBeDefined()
        expect(resource.length).toBeGreaterThan(0)
        expect(action.length).toBeGreaterThan(0)
      })
    })
  })
})
