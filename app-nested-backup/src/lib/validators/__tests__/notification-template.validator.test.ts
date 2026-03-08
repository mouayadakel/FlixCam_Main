/**
 * Unit tests for notification-template.validator
 */

import {
  createNotificationTemplateSchema,
  updateNotificationTemplateSchema,
  previewNotificationTemplateSchema,
} from '../notification-template.validator'

describe('notification-template.validator', () => {
  describe('createNotificationTemplateSchema', () => {
    it('accepts valid input', () => {
      const result = createNotificationTemplateSchema.safeParse({
        name: 'Booking Confirmed',
        slug: 'booking_confirmed',
        trigger: 'BOOKING_CONFIRMED',
        channel: 'EMAIL',
        bodyText: 'Your booking is confirmed.',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with optional fields', () => {
      const result = createNotificationTemplateSchema.safeParse({
        name: 'Template',
        slug: 'template_slug',
        trigger: 'BOOKING_REMINDER',
        channel: 'WHATSAPP',
        bodyText: 'Body',
        description: 'Desc',
        subject: 'Subject',
        bodyHtml: '<p>HTML</p>',
        variables: ['bookingId'],
        isActive: true,
        language: 'en',
        variant: 'v1',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid slug format', () => {
      const result = createNotificationTemplateSchema.safeParse({
        name: 'Test',
        slug: 'Invalid Slug!',
        trigger: 'BOOKING_CONFIRMED',
        channel: 'EMAIL',
        bodyText: 'Body',
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid trigger', () => {
      const result = createNotificationTemplateSchema.safeParse({
        name: 'Test',
        slug: 'test',
        trigger: 'INVALID',
        channel: 'EMAIL',
        bodyText: 'Body',
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid channel', () => {
      const result = createNotificationTemplateSchema.safeParse({
        name: 'Test',
        slug: 'test',
        trigger: 'BOOKING_CONFIRMED',
        channel: 'INVALID',
        bodyText: 'Body',
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty bodyText', () => {
      const result = createNotificationTemplateSchema.safeParse({
        name: 'Test',
        slug: 'test',
        trigger: 'BOOKING_CONFIRMED',
        channel: 'EMAIL',
        bodyText: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateNotificationTemplateSchema', () => {
    it('accepts partial update', () => {
      const result = updateNotificationTemplateSchema.safeParse({
        name: 'Updated',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('previewNotificationTemplateSchema', () => {
    it('accepts with templateId', () => {
      const result = previewNotificationTemplateSchema.safeParse({
        templateId: 'clxxxxxxxxxxxxxxxxxxxxxxxxxx',
        data: { bookingId: 'b1' },
      })
      expect(result.success).toBe(true)
    })
    it('accepts with slug', () => {
      const result = previewNotificationTemplateSchema.safeParse({
        slug: 'booking_confirmed',
        language: 'ar',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object with defaults', () => {
      const result = previewNotificationTemplateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
