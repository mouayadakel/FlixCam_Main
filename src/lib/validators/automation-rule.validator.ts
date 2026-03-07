/**
 * @file automation-rule.validator.ts
 * @description Zod schemas for automation rule API payloads
 * @module lib/validators/automation-rule.validator
 */

import { z } from 'zod'

const channelEnum = z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP'])
const recipientTypeEnum = z.enum(['CUSTOMER', 'BUSINESS', 'WAREHOUSE', 'ALL'])

const triggerEnum = z.string().min(1) // Accept any NotificationTrigger value from Prisma

const sendWindowSchema = z
  .object({ start: z.string(), end: z.string() })
  .optional()
  .nullable()

const frequencyCapSchema = z
  .object({
    maxPerDay: z.number().int().min(1).optional(),
    maxPerWeek: z.number().int().min(1).optional(),
    cooldownHours: z.number().int().min(0).optional(),
  })
  .optional()
  .nullable()

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().min(0).max(100).optional().default(0),
  trigger: triggerEnum,
  triggerDelay: z.number().int().min(0).optional().default(0),
  delayMinutes: z.number().int().min(0).optional().default(0), // backward compat
  channels: z.array(channelEnum).min(1),
  templateId: z.string().cuid().optional().nullable(),
  conditions: z.record(z.unknown()).optional().nullable(),
  sendWindow: sendWindowSchema,
  timezone: z.string().optional().default('Asia/Riyadh'),
  respectDND: z.boolean().optional().default(true),
  recipientType: recipientTypeEnum.optional().default('CUSTOMER'),
  specificRecipients: z.array(z.string().cuid()).optional().nullable(),
  maxRetries: z.number().int().min(0).max(10).optional().default(3),
  retryDelay: z.number().int().min(1).optional().default(5),
  allowDuplicates: z.boolean().optional().default(false),
  frequencyCap: frequencyCapSchema,
})

export const updateAutomationRuleSchema = createAutomationRuleSchema.partial()

export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>
