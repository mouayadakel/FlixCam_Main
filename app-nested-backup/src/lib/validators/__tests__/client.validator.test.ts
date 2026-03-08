/**
 * Unit tests for client.validator
 */

import {
  createClientSchema,
  updateClientSchema,
  clientFilterSchema,
  clientStatusSchema,
} from '../client.validator'

describe('client.validator', () => {
  describe('clientStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(clientStatusSchema.safeParse('active').success).toBe(true)
      expect(clientStatusSchema.safeParse('suspended').success).toBe(true)
      expect(clientStatusSchema.safeParse('inactive').success).toBe(true)
    })
    it('rejects invalid status', () => {
      expect(clientStatusSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('createClientSchema', () => {
    it('accepts valid input', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })
    it('accepts full input', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        name: 'John Doe',
        phone: '+966501234567',
        password: 'password123',
        role: 'CUSTOMER_SERVICE',
        status: 'active',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when email invalid', () => {
      const result = createClientSchema.safeParse({
        email: 'invalid',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when password too short', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        password: 'short',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateClientSchema', () => {
    it('accepts partial update', () => {
      const result = updateClientSchema.safeParse({
        name: 'Updated Name',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updateClientSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('clientFilterSchema', () => {
    it('accepts valid filter', () => {
      const result = clientFilterSchema.safeParse({
        status: 'active',
        search: 'john',
        page: 1,
        pageSize: 20,
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = clientFilterSchema.safeParse({})
      expect(result.success).toBe(true)
    })
    it('accepts date range', () => {
      const result = clientFilterSchema.safeParse({
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      })
      expect(result.success).toBe(true)
    })
  })
})
