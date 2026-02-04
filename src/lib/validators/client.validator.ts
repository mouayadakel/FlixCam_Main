/**
 * @file client.validator.ts
 * @description Validation schemas for client operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const clientStatusSchema = z.enum(
  ['active', 'suspended', 'inactive'],
  {
    errorMap: () => ({ message: 'حالة العميل غير صالحة' }),
  }
)

export const createClientSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  name: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  role: z.nativeEnum(UserRole).optional(),
  status: clientStatusSchema.optional().default('active'),
})

export const updateClientSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  status: clientStatusSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
})

export const clientFilterSchema = z.object({
  status: clientStatusSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  hasBookings: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ClientFilterInput = z.infer<typeof clientFilterSchema>
