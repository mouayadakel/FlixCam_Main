/**
 * @file ai.validator.ts
 * @description Zod schemas for AI feature validation
 * @module validators/ai
 */

import { z } from 'zod'

export const riskAssessmentInputSchema = z.object({
  bookingId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  equipmentIds: z.array(z.string().uuid()).min(1),
  rentalDuration: z.number().positive(),
  totalValue: z.number().nonnegative(),
  customerHistory: z.enum(['excellent', 'good', 'fair', 'poor', 'new']).optional(),
})

export const kitBuilderInputSchema = z.object({
  projectType: z.string().min(1),
  useCase: z.string().optional(),
  budget: z.number().positive().optional(),
  duration: z.number().positive(),
  requirements: z.array(z.string()).optional(),
  excludeEquipmentIds: z.array(z.string().uuid()).optional(),
})

export const pricingSuggestionInputSchema = z.object({
  equipmentId: z.string().uuid(),
  currentPrice: z.number().nonnegative(),
  marketData: z.record(z.unknown()).optional(),
})

export const demandForecastInputSchema = z.object({
  equipmentId: z.string().uuid().optional(), // If not provided, forecast for all equipment
  period: z.enum(['week', 'month', 'quarter', 'year']),
  startDate: z.date().optional(),
})

export const chatbotMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional(),
})

export const equipmentRecommendationInputSchema = z.object({
  unavailableEquipmentId: z.string().min(1),
  projectType: z.string().optional(),
  budget: z.number().positive().optional(),
  requirements: z.array(z.string()).optional(),
})

export const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'gemini', 'anthropic']),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  enabled: z.boolean(),
})
