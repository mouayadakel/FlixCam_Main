/**
 * @file invoice.validator.ts
 * @description Validation schemas for invoice operations
 * @module lib/validators
 * @author Engineering Team
 * @created 2026-01-28
 */

import { z } from 'zod'

export const invoiceStatusSchema = z.enum(
  ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid'],
  {
    errorMap: () => ({ message: 'حالة الفاتورة غير صالحة' }),
  }
)

export const invoiceTypeSchema = z.enum(['booking', 'deposit', 'refund', 'adjustment'], {
  errorMap: () => ({ message: 'نوع الفاتورة غير صالح' }),
})

/** Server computes total = quantity × (days ?? 1) × unitPrice. Client may omit total. */
export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'الوصف مطلوب'),
  quantity: z.number().positive('الكمية يجب أن تكون أكبر من 0'),
  unitPrice: z.number().min(0, 'سعر الوحدة يجب أن يكون أكبر من أو يساوي 0'),
  days: z.number().min(1, 'الأيام يجب أن تكون 1 على الأقل').optional().default(1),
  total: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  vatAmount: z.number().min(0).optional(),
})

export const createInvoiceSchema = z
  .object({
    bookingId: z.string().optional(),
    customerId: z.string().min(1, 'معرف العميل مطلوب'),
    type: invoiceTypeSchema,
    issueDate: z.coerce.date({
      errorMap: () => ({ message: 'تاريخ الإصدار مطلوب' }),
    }),
    dueDate: z.coerce.date({
      errorMap: () => ({ message: 'تاريخ الاستحقاق مطلوب' }),
    }),
    items: z.array(invoiceItemSchema).min(1, 'يجب تحديد عنصر واحد على الأقل'),
    notes: z.string().optional(),
    paymentTerms: z.string().optional(),
    discount: z.number().min(0).optional(),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ الإصدار',
    path: ['dueDate'],
  })

export const updateInvoiceSchema = z.object({
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  items: z.array(invoiceItemSchema).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  discount: z.number().min(0).optional(),
  status: invoiceStatusSchema.optional(),
})

export const invoicePaymentSchema = z.object({
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من 0'),
  paymentMethod: z.string().min(1, 'طريقة الدفع مطلوبة'),
  paymentDate: z.coerce.date().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
})

export const invoiceFilterSchema = z.object({
  status: invoiceStatusSchema.optional(),
  type: invoiceTypeSchema.optional(),
  customerId: z.string().optional(),
  bookingId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  overdue: z.boolean().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
export type InvoicePaymentInput = z.infer<typeof invoicePaymentSchema>
export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>
