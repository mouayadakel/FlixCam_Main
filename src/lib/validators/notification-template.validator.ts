/**
 * @file notification-template.validator.ts
 * @description Zod schemas for notification template API payloads
 * @module lib/validators/notification-template.validator
 */

import { z } from 'zod'

const triggerEnum = z.enum([
  'BOOKING_CONFIRMED',
  'BOOKING_REMINDER',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'EQUIPMENT_READY',
  'DELIVERY_SCHEDULED',
  'RETURN_REMINDER',
  'RETURN_OVERDUE',
  'DAMAGE_CLAIM_FILED',
  'INVOICE_SENT',
  'REVIEW_REQUEST',
])
const channelEnum = z.enum(['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS'])

export const createNotificationTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(500).optional().nullable(),
  trigger: triggerEnum,
  channel: channelEnum,
  subject: z.string().max(200).optional().nullable(),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional().nullable(),
  variables: z.array(z.string()).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  language: z.string().length(2).optional().default('en'),
  variant: z.string().max(40).optional().nullable(),
})

export const updateNotificationTemplateSchema = createNotificationTemplateSchema.partial()

export const previewNotificationTemplateSchema = z.object({
  templateId: z.string().cuid().optional(),
  slug: z.string().optional(),
  language: z.string().optional().default('en'),
  data: z.record(z.unknown()).optional().default({}),
})

export type CreateNotificationTemplateInput = z.infer<typeof createNotificationTemplateSchema>
export type UpdateNotificationTemplateInput = z.infer<typeof updateNotificationTemplateSchema>
export type PreviewNotificationTemplateInput = z.infer<typeof previewNotificationTemplateSchema>
