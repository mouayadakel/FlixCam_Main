/**
 * Unit tests for invoice.validator
 */

import {
  invoiceStatusSchema,
  invoiceTypeSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceItemSchema,
  invoicePaymentSchema,
  invoiceFilterSchema,
} from '../invoice.validator'

describe('invoice.validator', () => {
  describe('invoiceStatusSchema', () => {
    it('accepts valid status', () => {
      expect(invoiceStatusSchema.safeParse('draft').success).toBe(true)
      expect(invoiceStatusSchema.safeParse('paid').success).toBe(true)
    })
  })

  describe('invoiceTypeSchema', () => {
    it('accepts valid type', () => {
      expect(invoiceTypeSchema.safeParse('booking').success).toBe(true)
    })
  })

  describe('invoiceItemSchema', () => {
    it('accepts valid item', () => {
      const result = invoiceItemSchema.safeParse({
        description: 'Rental',
        quantity: 1,
        unitPrice: 100,
      })
      expect(result.success).toBe(true)
    })
    it('accepts item with days, total, vatRate, vatAmount', () => {
      const result = invoiceItemSchema.safeParse({
        description: 'Rental',
        quantity: 2,
        unitPrice: 100,
        days: 5,
        total: 1000,
        vatRate: 15,
        vatAmount: 150,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createInvoiceSchema', () => {
    it('accepts valid invoice', () => {
      const result = createInvoiceSchema.safeParse({
        customerId: 'cust_1',
        type: 'booking',
        issueDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-15'),
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      })
      expect(result.success).toBe(true)
    })
    it('rejects when dueDate before issueDate', () => {
      const result = createInvoiceSchema.safeParse({
        customerId: 'cust_1',
        type: 'booking',
        issueDate: new Date('2026-01-15'),
        dueDate: new Date('2026-01-01'),
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      })
      expect(result.success).toBe(false)
    })
    it('accepts when dueDate equals issueDate', () => {
      const d = new Date('2026-01-15')
      const result = createInvoiceSchema.safeParse({
        customerId: 'cust_1',
        type: 'booking',
        issueDate: d,
        dueDate: d,
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateInvoiceSchema', () => {
    it('accepts partial update', () => {
      expect(updateInvoiceSchema.safeParse({ status: 'paid' }).success).toBe(true)
      expect(updateInvoiceSchema.safeParse({ notes: 'Updated' }).success).toBe(true)
    })
  })

  describe('invoiceFilterSchema', () => {
    it('accepts valid filter', () => {
      expect(invoiceFilterSchema.safeParse({ status: 'draft', type: 'booking' }).success).toBe(true)
      expect(invoiceFilterSchema.safeParse({ overdue: true }).success).toBe(true)
    })
  })

  describe('invoicePaymentSchema', () => {
    it('accepts valid payment', () => {
      const result = invoicePaymentSchema.safeParse({
        amount: 100,
        paymentMethod: 'card',
      })
      expect(result.success).toBe(true)
    })
    it('rejects zero amount', () => {
      const result = invoicePaymentSchema.safeParse({
        amount: 0,
        paymentMethod: 'card',
      })
      expect(result.success).toBe(false)
    })
  })
})
