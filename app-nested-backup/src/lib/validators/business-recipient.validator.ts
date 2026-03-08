/**
 * @file business-recipient.validator.ts
 * @description Zod schemas for business recipient API payloads
 * @module lib/validators/business-recipient.validator
 */

import { z } from 'zod'

const roleEnum = z.enum([
  'OWNER',
  'CO_OWNER',
  'GENERAL_MANAGER',
  'OPERATIONS_MANAGER',
  'WAREHOUSE_MANAGER',
  'INVENTORY_MANAGER',
  'CUSTOMER_SUPPORT',
  'TECHNICAL_SUPPORT',
  'ACCOUNTANT',
  'SALES_MANAGER',
  'MARKETING_MANAGER',
  'LEGAL',
  'IT_ADMIN',
  'CUSTOM',
  'SUPPORT',
])

const channelEnum = z.enum(['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS'])
const digestFrequencyEnum = z.enum(['HOURLY', 'DAILY', 'WEEKLY'])

const baseBusinessRecipientSchema = z.object({
  name: z.string().min(1).max(120),
  arabicName: z.string().max(120).optional().nullable(),
  englishName: z.string().max(120).optional().nullable(),
  role: roleEnum,
  department: z.string().max(100).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  phoneVerified: z.boolean().optional().default(false),
  alternatePhone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  emailVerified: z.boolean().optional().default(false),
  alternateEmail: z.string().email().max(255).optional().nullable(),
  whatsappNumber: z.string().max(20).optional().nullable(),
  whatsappVerified: z.boolean().optional().default(false),
  whatsappBusiness: z.boolean().optional().default(false),
  preferredChannel: channelEnum.optional().nullable(),
  preferredLanguage: z.enum(['ar', 'en']).optional().default('ar'),
  timezone: z.string().optional().default('Asia/Riyadh'),
  receiveTriggers: z.array(z.string()).optional().nullable(),
  excludeTriggers: z.array(z.string()).optional().nullable(),
  dndEnabled: z.boolean().optional().default(false),
  dndStart: z.string().optional().nullable(),
  dndEnd: z.string().optional().nullable(),
  dndDays: z.array(z.string()).optional().nullable(),
  priority: z.number().int().min(1).max(10).optional().default(5),
  receiveUrgent: z.boolean().optional().default(true),
  receiveLate: z.boolean().optional().default(true),
  receiveDamage: z.boolean().optional().default(true),
  digestEnabled: z.boolean().optional().default(false),
  digestFrequency: digestFrequencyEnum.optional().nullable(),
  digestTime: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isPrimary: z.boolean().optional().default(false),
  isBackup: z.boolean().optional().default(false),
  backupFor: z.string().cuid().optional().nullable(),
})

export const createBusinessRecipientSchema = baseBusinessRecipientSchema.refine(
  (data) => data.phone || data.email || data.whatsappNumber,
  { message: 'At least one of phone, email, or whatsappNumber is required', path: ['phone'] }
)

export const updateBusinessRecipientSchema = baseBusinessRecipientSchema.partial()

export type CreateBusinessRecipientInput = z.infer<typeof createBusinessRecipientSchema>
export type UpdateBusinessRecipientInput = z.infer<typeof updateBusinessRecipientSchema>
