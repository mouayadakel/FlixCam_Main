/**
 * Unit tests for delivery.validator
 */
import {
  deliveryTypeSchema,
  deliveryStatusSchema,
  scheduleDeliverySchema,
  updateDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryFilterSchema,
} from '../delivery.validator'

describe('delivery.validator', () => {
  const validSchedule = {
    bookingId: 'book-1',
    type: 'pickup' as const,
    scheduledDate: new Date('2026-03-01'),
    address: '123 Street',
    city: 'Riyadh',
    contactName: 'John',
    contactPhone: '+966501234567',
  }

  describe('deliveryTypeSchema', () => {
    it('accepts pickup and return', () => {
      expect(deliveryTypeSchema.safeParse('pickup').success).toBe(true)
      expect(deliveryTypeSchema.safeParse('return').success).toBe(true)
    })
    it('rejects invalid type', () => {
      expect(deliveryTypeSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('deliveryStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(deliveryStatusSchema.safeParse('pending').success).toBe(true)
      expect(deliveryStatusSchema.safeParse('delivered').success).toBe(true)
    })
    it('rejects invalid status', () => {
      expect(deliveryStatusSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('scheduleDeliverySchema', () => {
    it('accepts valid input', () => {
      expect(scheduleDeliverySchema.safeParse(validSchedule).success).toBe(true)
    })
    it('rejects when bookingId missing', () => {
      const result = scheduleDeliverySchema.safeParse({ ...validSchedule, bookingId: '' })
      expect(result.success).toBe(false)
    })
    it('rejects when address missing', () => {
      const result = scheduleDeliverySchema.safeParse({ ...validSchedule, address: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('updateDeliverySchema', () => {
    it('accepts partial with status', () => {
      expect(updateDeliverySchema.safeParse({ status: 'delivered' }).success).toBe(true)
    })
  })

  describe('updateDeliveryStatusSchema', () => {
    it('accepts status with optional deliveryId', () => {
      expect(updateDeliveryStatusSchema.safeParse({ status: 'in_transit' }).success).toBe(true)
      expect(updateDeliveryStatusSchema.safeParse({ deliveryId: 'd1', status: 'delivered' }).success).toBe(true)
    })
  })

  describe('deliveryFilterSchema', () => {
    it('accepts valid filter', () => {
      expect(deliveryFilterSchema.safeParse({ type: 'pickup', status: 'pending' }).success).toBe(true)
      expect(deliveryFilterSchema.safeParse({ dateFrom: '2026-01-01', dateTo: '2026-12-31' }).success).toBe(true)
    })
  })
})
