/**
 * Unit tests for marketing.validator
 */

import {
  campaignTypeSchema,
  campaignStatusSchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignSendSchema,
  campaignFilterSchema,
} from '../marketing.validator'

describe('marketing.validator', () => {
  describe('campaignTypeSchema', () => {
    it('accepts valid types', () => {
      expect(campaignTypeSchema.safeParse('email').success).toBe(true)
      expect(campaignTypeSchema.safeParse('sms').success).toBe(true)
      expect(campaignTypeSchema.safeParse('push').success).toBe(true)
      expect(campaignTypeSchema.safeParse('whatsapp').success).toBe(true)
    })
    it('rejects invalid type', () => {
      expect(campaignTypeSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('campaignStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(campaignStatusSchema.safeParse('draft').success).toBe(true)
      expect(campaignStatusSchema.safeParse('scheduled').success).toBe(true)
      expect(campaignStatusSchema.safeParse('active').success).toBe(true)
      expect(campaignStatusSchema.safeParse('completed').success).toBe(true)
    })
    it('rejects invalid status', () => {
      expect(campaignStatusSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('createCampaignSchema', () => {
    it('accepts valid input', () => {
      const result = createCampaignSchema.safeParse({
        name: 'Summer Sale',
        type: 'email',
        content: 'Get 20% off',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with optional fields', () => {
      const result = createCampaignSchema.safeParse({
        name: 'Campaign',
        type: 'sms',
        content: 'Hello',
        subject: 'Subject',
        targetAudience: ['seg1'],
        scheduledAt: new Date(),
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty name', () => {
      const result = createCampaignSchema.safeParse({
        name: '',
        type: 'email',
        content: 'Body',
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty content', () => {
      const result = createCampaignSchema.safeParse({
        name: 'Campaign',
        type: 'email',
        content: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateCampaignSchema', () => {
    it('accepts partial update', () => {
      const result = updateCampaignSchema.safeParse({ name: 'Updated' })
      expect(result.success).toBe(true)
    })
    it('accepts status update', () => {
      const result = updateCampaignSchema.safeParse({ status: 'active' })
      expect(result.success).toBe(true)
    })
  })

  describe('campaignSendSchema', () => {
    it('accepts valid input', () => {
      const result = campaignSendSchema.safeParse({ campaignId: 'camp_1' })
      expect(result.success).toBe(true)
    })
    it('accepts sendNow', () => {
      const result = campaignSendSchema.safeParse({
        campaignId: 'camp_1',
        sendNow: true,
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty campaignId', () => {
      const result = campaignSendSchema.safeParse({ campaignId: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('campaignFilterSchema', () => {
    it('accepts empty object', () => {
      const result = campaignFilterSchema.safeParse({})
      expect(result.success).toBe(true)
    })
    it('accepts all filter fields', () => {
      const result = campaignFilterSchema.safeParse({
        status: 'active',
        type: 'email',
        search: 'summer',
        dateFrom: new Date(),
        dateTo: new Date(),
        page: 1,
        pageSize: 20,
      })
      expect(result.success).toBe(true)
    })
  })
})
