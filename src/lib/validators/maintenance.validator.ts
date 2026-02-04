/**
 * @file maintenance.validator.ts
 * @description Validation schemas for maintenance operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'
import { EquipmentCondition } from '@prisma/client'

export const maintenanceStatusSchema = z.enum(
  ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'],
  {
    errorMap: () => ({ message: 'حالة الصيانة غير صالحة' }),
  }
)

export const maintenanceTypeSchema = z.enum(
  ['preventive', 'corrective', 'inspection', 'repair', 'calibration'],
  {
    errorMap: () => ({ message: 'نوع الصيانة غير صالح' }),
  }
)

export const maintenancePrioritySchema = z.enum(
  ['low', 'medium', 'high', 'urgent'],
  {
    errorMap: () => ({ message: 'أولوية الصيانة غير صالحة' }),
  }
)

export const createMaintenanceSchema = z.object({
  equipmentId: z.string().min(1, 'معرف المعدات مطلوب'),
  type: maintenanceTypeSchema,
  priority: maintenancePrioritySchema,
  scheduledDate: z.coerce.date({
    errorMap: () => ({ message: 'تاريخ الصيانة المقرر مطلوب' }),
  }),
  technicianId: z.string().optional(),
  description: z.string().min(1, 'الوصف مطلوب'),
  notes: z.string().optional(),
})

export const updateMaintenanceSchema = z.object({
  type: maintenanceTypeSchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  scheduledDate: z.coerce.date().optional(),
  technicianId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: maintenanceStatusSchema.optional(),
})

export const completeMaintenanceSchema = z.object({
  completedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  cost: z.number().min(0).optional(),
  partsUsed: z
    .array(
      z.object({
        partName: z.string().min(1),
        quantity: z.number().int().min(1),
        cost: z.number().min(0),
      })
    )
    .optional(),
  equipmentConditionAfter: z.nativeEnum(EquipmentCondition).optional(),
})

export const maintenanceFilterSchema = z.object({
  status: maintenanceStatusSchema.optional(),
  type: maintenanceTypeSchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  equipmentId: z.string().optional(),
  technicianId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>
export type CompleteMaintenanceInput = z.infer<typeof completeMaintenanceSchema>
export type MaintenanceFilterInput = z.infer<typeof maintenanceFilterSchema>
