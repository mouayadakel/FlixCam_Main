/**
 * Checkout step 2 – profile and delivery (Phase 3.3).
 */

import { z } from 'zod'

function normalizePhone(v: string): string {
  const digits = v.replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('5')) return `966${digits}`
  if (digits.length === 10 && digits.startsWith('05')) return `966${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('966')) return digits
  return digits
}

export const checkoutDetailsSchema = z
  .object({
    name: z.string().min(1, { message: 'الاسم مطلوب' }).max(100),
    email: z.string().min(1, { message: 'البريد مطلوب' }).email({ message: 'البريد غير صالح' }),
    phone: z
      .string()
      .min(1, { message: 'رقم الجوال مطلوب' })
      .transform(normalizePhone)
      .refine((v) => /^966[0-9]{9}$/.test(v), { message: 'رقم جوال سعودي غير صالح' }),
    deliveryMethod: z.enum(['PICKUP', 'DELIVERY']),
    deliveryCity: z.string().max(100).optional(),
    deliveryStreet: z.string().max(300).optional(),
    deliveryNotes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.deliveryMethod !== 'DELIVERY') return true
      return Boolean(data.deliveryCity?.trim() && data.deliveryStreet?.trim())
    },
    { message: 'المدينة والعنوان مطلوبان للتوصيل', path: ['deliveryStreet'] }
  )

export type CheckoutDetailsInput = z.infer<typeof checkoutDetailsSchema>
