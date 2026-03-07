/**
 * @file delivery.validator.ts
 * @description Validation schemas for delivery operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'

export const deliveryTypeSchema = z.enum(['pickup', 'return'], {
  errorMap: () => ({ message: 'نوع التوصيل يجب أن يكون pickup أو return' }),
})

export const deliveryStatusSchema = z.enum(
  ['pending', 'scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'],
  {
    errorMap: () => ({ message: 'حالة التوصيل غير صالحة' }),
  }
)

export const scheduleDeliverySchema = z.object({
  bookingId: z.string().min(1, 'معرف الحجز مطلوب'),
  type: deliveryTypeSchema,
  scheduledDate: z.coerce.date({
    errorMap: () => ({ message: 'تاريخ التوصيل المقرر مطلوب' }),
  }),
  address: z.string().min(1, 'العنوان مطلوب'),
  city: z.string().min(1, 'المدينة مطلوبة'),
  contactName: z.string().min(1, 'اسم جهة الاتصال مطلوب'),
  contactPhone: z.string().min(1, 'رقم الهاتف مطلوب'),
  notes: z.string().optional(),
  driverId: z.string().optional(),
})

export const updateDeliverySchema = z.object({
  deliveryId: z.string().optional(),
  scheduledDate: z.coerce.date().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  driverId: z.string().optional(),
  status: deliveryStatusSchema.optional(),
})

export const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string().optional(),
  status: deliveryStatusSchema,
})

export const deliveryFilterSchema = z.object({
  type: deliveryTypeSchema.optional(),
  driverId: z.string().optional(),
  status: deliveryStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export type ScheduleDeliveryInput = z.infer<typeof scheduleDeliverySchema>
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>
export type DeliveryFilterInput = z.infer<typeof deliveryFilterSchema>
