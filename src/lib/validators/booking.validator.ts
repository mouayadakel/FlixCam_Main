/**
 * @file booking.validator.ts
 * @description Zod validation schemas for booking operations
 * @module lib/validators
 */

import { z } from 'zod'
import { BookingStatus } from '@prisma/client'

/**
 * Create booking schema
 */
export const createBookingSchema = z.object({
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  startDate: z.coerce.date({
    required_error: 'تاريخ البداية مطلوب',
    invalid_type_error: 'تاريخ البداية غير صالح',
  }),
  endDate: z.coerce.date({
    required_error: 'تاريخ النهاية مطلوب',
    invalid_type_error: 'تاريخ النهاية غير صالح',
  }),
  equipmentIds: z
    .array(z.string().min(1))
    .min(1, 'يجب اختيار معدة واحدة على الأقل'),
  studioId: z.string().optional(),
  studioStartTime: z.coerce.date().optional(),
  studioEndTime: z.coerce.date().optional(),
  notes: z.string().max(1000, 'الملاحظات يجب أن تكون أقل من 1000 حرف').optional(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['endDate'],
  }
)

/**
 * Update booking schema
 */
export const updateBookingSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  equipmentIds: z.array(z.string().min(1)).optional(),
  studioId: z.string().optional(),
  studioStartTime: z.coerce.date().optional(),
  studioEndTime: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate > data.startDate
    }
    return true
  },
  {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['endDate'],
  }
)

/**
 * State transition schema
 */
export const stateTransitionSchema = z.object({
  toState: z.nativeEnum(BookingStatus, {
    required_error: 'الحالة الجديدة مطلوبة',
    invalid_type_error: 'الحالة غير صالحة',
  }),
  reason: z.string().max(500, 'السبب يجب أن يكون أقل من 500 حرف').optional(),
})

/**
 * Portal: request change (طلب تعديل)
 */
export const requestChangeSchema = z.object({
  reason: z.string().min(1, 'السبب مطلوب').max(500, 'السبب يجب أن يكون أقل من 500 حرف'),
  requestedChanges: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      equipmentIds: z.array(z.string().min(1)).optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),
})

/**
 * Portal: request extension (طلب تمديد)
 */
export const requestExtensionSchema = z.object({
  reason: z.string().min(1, 'السبب مطلوب').max(500, 'السبب يجب أن يكون أقل من 500 حرف'),
  requestedEndDate: z.coerce.date({
    required_error: 'تاريخ النهاية الجديد مطلوب',
    invalid_type_error: 'تاريخ النهاية غير صالح',
  }),
}).refine(
  (data) => data.requestedEndDate > new Date(),
  { message: 'تاريخ النهاية الجديد يجب أن يكون في المستقبل', path: ['requestedEndDate'] }
)

/**
 * Portal: cancel booking (إلغاء)
 */
export const cancelBookingSchema = z.object({
  reason: z.string().max(500, 'السبب يجب أن يكون أقل من 500 حرف').optional(),
})

/**
 * Type exports
 */
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type StateTransitionInput = z.infer<typeof stateTransitionSchema>
export type RequestChangeInput = z.infer<typeof requestChangeSchema>
export type RequestExtensionInput = z.infer<typeof requestExtensionSchema>
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>
