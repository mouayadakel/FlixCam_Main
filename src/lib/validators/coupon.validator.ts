/**
 * @file coupon.validator.ts
 * @description Validation schemas for coupon operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'

export const couponTypeSchema = z.enum(['percent', 'fixed'], {
  errorMap: () => ({ message: 'نوع الكوبون غير صالح' }),
})

export const couponStatusSchema = z.enum(
  ['active', 'inactive', 'expired', 'scheduled'],
  {
    errorMap: () => ({ message: 'حالة الكوبون غير صالحة' }),
  }
)

export const createCouponSchema = z.object({
  code: z.string().min(3, 'رمز الكوبون يجب أن يكون 3 أحرف على الأقل').max(50, 'رمز الكوبون طويل جداً'),
  type: couponTypeSchema,
  value: z.number().min(0, 'القيمة يجب أن تكون أكبر من أو تساوي 0'),
  minPurchaseAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  validFrom: z.coerce.date({
    errorMap: () => ({ message: 'تاريخ البداية مطلوب' }),
  }),
  validUntil: z.coerce.date({
    errorMap: () => ({ message: 'تاريخ الانتهاء مطلوب' }),
  }),
  applicableTo: z.array(z.string()).optional(),
  description: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'percent') {
      return data.value <= 100
    }
    return true
  },
  {
    message: 'نسبة الخصم يجب أن تكون أقل من أو تساوي 100%',
    path: ['value'],
  }
).refine(
  (data) => data.validUntil >= data.validFrom,
  {
    message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية',
    path: ['validUntil'],
  }
)

export const updateCouponSchema = z.object({
  code: z.string().min(3).max(50).optional(),
  type: couponTypeSchema.optional(),
  value: z.number().min(0).optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  status: couponStatusSchema.optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  applicableTo: z.array(z.string()).optional(),
  description: z.string().optional(),
})

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'رمز الكوبون مطلوب'),
  amount: z.number().min(0, 'المبلغ يجب أن يكون أكبر من أو يساوي 0'),
  equipmentIds: z.array(z.string()).optional(),
})

export const couponFilterSchema = z.object({
  status: couponStatusSchema.optional(),
  type: couponTypeSchema.optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  active: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>
export type CouponFilterInput = z.infer<typeof couponFilterSchema>
