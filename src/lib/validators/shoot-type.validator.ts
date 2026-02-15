/**
 * @file shoot-type.validator.ts
 * @description Zod validation schemas for shoot types (Smart Kit Builder)
 * @module validators/shoot-type
 */

import { z } from 'zod'

export const budgetTierSchema = z.enum(['ESSENTIAL', 'PROFESSIONAL', 'PREMIUM'])

export const questionnaireOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  labelAr: z.string().optional(),
  labelZh: z.string().optional(),
  icon: z.string().optional(),
})

export const questionnaireQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  questionAr: z.string().optional(),
  questionZh: z.string().optional(),
  type: z.enum(['single_choice', 'multi_choice']),
  options: z.array(questionnaireOptionSchema).min(1),
  affectsCategories: z.record(z.record(z.unknown())).optional(),
})

export const questionnaireSchema = z.array(questionnaireQuestionSchema).optional()

export const createShootTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).optional().nullable(),
  nameAr: z.string().max(200).optional().nullable(),
  nameZh: z.string().max(200).optional().nullable(),
  descriptionAr: z.string().max(2000).optional().nullable(),
  descriptionZh: z.string().max(2000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  questionnaire: questionnaireSchema,
})

export const updateShootTypeSchema = createShootTypeSchema.partial().extend({
  id: z.string().min(1, 'Shoot type ID is required'),
})

export const categoryFlowItemSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  sortOrder: z.number().int().min(0),
  isRequired: z.boolean(),
  minRecommended: z.number().int().min(0).optional().nullable(),
  maxRecommended: z.number().int().min(0).optional().nullable(),
  stepTitle: z.string().max(200).optional().nullable(),
  stepTitleAr: z.string().max(200).optional().nullable(),
  stepDescription: z.string().max(500).optional().nullable(),
  stepDescriptionAr: z.string().max(500).optional().nullable(),
})

export const updateCategoryFlowsSchema = z.object({
  flows: z.array(categoryFlowItemSchema).min(0),
})

export const recommendationItemSchema = z.object({
  id: z.string().optional(),
  equipmentId: z.string().min(1),
  budgetTier: budgetTierSchema,
  reason: z.string().max(500).optional().nullable(),
  reasonAr: z.string().max(500).optional().nullable(),
  defaultQuantity: z.number().int().min(1).max(99).optional(),
  isAutoSelect: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const updateRecommendationsSchema = z.object({
  categoryId: z.string().min(1).optional(),
  recommendations: z.array(recommendationItemSchema),
})

export const setBudgetTierSchema = z.object({
  budgetTier: budgetTierSchema.nullable(),
})

export type CreateShootTypeInput = z.infer<typeof createShootTypeSchema>
export type UpdateShootTypeInput = z.infer<typeof updateShootTypeSchema>
export type CategoryFlowItemInput = z.infer<typeof categoryFlowItemSchema>
export type RecommendationItemInput = z.infer<typeof recommendationItemSchema>
export type BudgetTierType = z.infer<typeof budgetTierSchema>
