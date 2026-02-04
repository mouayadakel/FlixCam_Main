/**
 * @file warehouse.validator.ts
 * @description Validation schemas for warehouse operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'
import { EquipmentCondition } from '@prisma/client'

export const inspectionChecklistItemSchema = z.object({
  item: z.string().min(1, 'اسم العنصر مطلوب'),
  status: z.enum(['ok', 'damaged', 'missing', 'needs_repair'], {
    errorMap: () => ({ message: 'حالة غير صالحة' }),
  }),
  notes: z.string().optional(),
})

export const checkOutSchema = z.object({
  bookingId: z.string().min(1, 'معرف الحجز مطلوب'),
  equipmentIds: z
    .array(z.string().min(1))
    .min(1, 'يجب تحديد معدات واحدة على الأقل'),
  checklist: z
    .array(inspectionChecklistItemSchema)
    .min(1, 'يجب ملء قائمة التحقق'),
  notes: z.string().optional(),
  warehouseLocation: z.string().optional(),
})

export const checkInSchema = z.object({
  bookingId: z.string().min(1, 'معرف الحجز مطلوب'),
  equipmentIds: z
    .array(z.string().min(1))
    .min(1, 'يجب تحديد معدات واحدة على الأقل'),
  checklist: z
    .array(inspectionChecklistItemSchema)
    .min(1, 'يجب ملء قائمة التحقق'),
  notes: z.string().optional(),
  condition: z.nativeEnum(EquipmentCondition).optional(),
  damageReport: z.string().optional(),
})

export const inventoryFilterSchema = z.object({
  warehouseLocation: z.string().optional(),
  condition: z.nativeEnum(EquipmentCondition).optional(),
  available: z.boolean().optional(),
})

export type CheckOutInput = z.infer<typeof checkOutSchema>
export type CheckInInput = z.infer<typeof checkInSchema>
export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>
