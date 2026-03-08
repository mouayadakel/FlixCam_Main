/**
 * @file marketing.validator.ts
 * @description Validation schemas for marketing campaign operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'

export const campaignTypeSchema = z.enum(['email', 'sms', 'push', 'whatsapp'], {
  errorMap: () => ({ message: 'نوع الحملة غير صالح' }),
})

export const campaignStatusSchema = z.enum(
  ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
  {
    errorMap: () => ({ message: 'حالة الحملة غير صالحة' }),
  }
)

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'اسم الحملة مطلوب'),
  type: campaignTypeSchema,
  subject: z.string().optional(),
  content: z.string().min(1, 'محتوى الحملة مطلوب'),
  targetAudience: z.array(z.string()).optional(),
  scheduledAt: z.coerce.date().optional(),
})

export const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  type: campaignTypeSchema.optional(),
  subject: z.string().optional(),
  content: z.string().min(1).optional(),
  targetAudience: z.array(z.string()).optional(),
  scheduledAt: z.coerce.date().optional(),
  status: campaignStatusSchema.optional(),
})

export const campaignSendSchema = z.object({
  campaignId: z.string().min(1, 'معرف الحملة مطلوب'),
  sendNow: z.boolean().optional().default(false),
})

export const campaignFilterSchema = z.object({
  status: campaignStatusSchema.optional(),
  type: campaignTypeSchema.optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CampaignSendInput = z.infer<typeof campaignSendSchema>
export type CampaignFilterInput = z.infer<typeof campaignFilterSchema>
