/**
 * Unit tests for ai.validator
 */

import {
  riskAssessmentInputSchema,
  kitBuilderInputSchema,
  pricingSuggestionInputSchema,
  demandForecastInputSchema,
  chatbotMessageSchema,
  equipmentRecommendationInputSchema,
  aiConfigSchema,
} from '../ai.validator'

describe('ai.validator', () => {
  describe('riskAssessmentInputSchema', () => {
    it('accepts valid input with required fields', () => {
      const result = riskAssessmentInputSchema.safeParse({
        equipmentIds: ['550e8400-e29b-41d4-a716-446655440000'],
        rentalDuration: 7,
        totalValue: 1000,
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid input with optional fields', () => {
      const result = riskAssessmentInputSchema.safeParse({
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        equipmentIds: ['550e8400-e29b-41d4-a716-446655440000'],
        rentalDuration: 7,
        totalValue: 1000,
        customerHistory: 'good',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when equipmentIds empty', () => {
      const result = riskAssessmentInputSchema.safeParse({
        equipmentIds: [],
        rentalDuration: 7,
        totalValue: 1000,
      })
      expect(result.success).toBe(false)
    })
    it('rejects when rentalDuration not positive', () => {
      const result = riskAssessmentInputSchema.safeParse({
        equipmentIds: ['550e8400-e29b-41d4-a716-446655440000'],
        rentalDuration: 0,
        totalValue: 1000,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('kitBuilderInputSchema', () => {
    it('accepts valid input', () => {
      const result = kitBuilderInputSchema.safeParse({
        projectType: 'commercial',
        duration: 5,
      })
      expect(result.success).toBe(true)
    })
    it('accepts full input', () => {
      const result = kitBuilderInputSchema.safeParse({
        projectType: 'commercial',
        useCase: 'interview',
        budget: 5000,
        duration: 5,
        requirements: ['camera', 'light'],
        excludeEquipmentIds: ['550e8400-e29b-41d4-a716-446655440000'],
      })
      expect(result.success).toBe(true)
    })
    it('rejects when projectType empty', () => {
      const result = kitBuilderInputSchema.safeParse({
        projectType: '',
        duration: 5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('pricingSuggestionInputSchema', () => {
    it('accepts valid input', () => {
      const result = pricingSuggestionInputSchema.safeParse({
        equipmentId: '550e8400-e29b-41d4-a716-446655440000',
        currentPrice: 100,
      })
      expect(result.success).toBe(true)
    })
    it('rejects when equipmentId invalid uuid', () => {
      const result = pricingSuggestionInputSchema.safeParse({
        equipmentId: 'invalid',
        currentPrice: 100,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('demandForecastInputSchema', () => {
    it('accepts valid input with period', () => {
      const result = demandForecastInputSchema.safeParse({
        period: 'month',
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid input with equipmentId', () => {
      const result = demandForecastInputSchema.safeParse({
        equipmentId: '550e8400-e29b-41d4-a716-446655440000',
        period: 'week',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid period', () => {
      const result = demandForecastInputSchema.safeParse({
        period: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('chatbotMessageSchema', () => {
    it('accepts valid message', () => {
      const result = chatbotMessageSchema.safeParse({
        message: 'Hello',
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty message', () => {
      const result = chatbotMessageSchema.safeParse({
        message: '',
      })
      expect(result.success).toBe(false)
    })
    it('rejects message over 2000 chars', () => {
      const result = chatbotMessageSchema.safeParse({
        message: 'a'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('equipmentRecommendationInputSchema', () => {
    it('accepts valid input', () => {
      const result = equipmentRecommendationInputSchema.safeParse({
        unavailableEquipmentId: 'eq_123',
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty unavailableEquipmentId', () => {
      const result = equipmentRecommendationInputSchema.safeParse({
        unavailableEquipmentId: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('aiConfigSchema', () => {
    it('accepts valid config', () => {
      const result = aiConfigSchema.safeParse({
        provider: 'openai',
        model: 'gpt-4',
        enabled: true,
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid config with optional fields', () => {
      const result = aiConfigSchema.safeParse({
        provider: 'gemini',
        model: 'gemini-pro',
        temperature: 0.7,
        maxTokens: 1000,
        enabled: true,
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid provider', () => {
      const result = aiConfigSchema.safeParse({
        provider: 'invalid',
        model: 'gpt-4',
        enabled: true,
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty model', () => {
      const result = aiConfigSchema.safeParse({
        provider: 'openai',
        model: '',
        enabled: true,
      })
      expect(result.success).toBe(false)
    })
  })
})
