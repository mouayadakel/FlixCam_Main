/**
 * @file invoice.types.ts
 * @description TypeScript types for invoice management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid'
export type InvoiceType = 'booking' | 'deposit' | 'refund' | 'adjustment'

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  vatRate?: number
  vatAmount?: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  bookingId?: string | null
  customerId: string
  type: InvoiceType
  status: InvoiceStatus
  issueDate: Date
  dueDate: Date
  paidDate?: Date | null
  subtotal: number
  discount?: number
  vatAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  items: InvoiceItem[]
  notes?: string | null
  paymentTerms?: string | null
  customer?: {
    id: string
    name: string | null
    email: string
    taxId?: string | null
  }
  booking?: {
    id: string
    bookingNumber: string
  } | null
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceCreateInput {
  bookingId?: string
  customerId: string
  type: InvoiceType
  issueDate: Date
  dueDate: Date
  items: InvoiceItem[]
  notes?: string
  paymentTerms?: string
  discount?: number
}

export interface InvoiceUpdateInput {
  issueDate?: Date
  dueDate?: Date
  items?: InvoiceItem[]
  notes?: string
  paymentTerms?: string
  discount?: number
  status?: InvoiceStatus
}

export interface InvoicePaymentInput {
  amount: number
  paymentMethod: string
  paymentDate?: Date
  transactionId?: string
  notes?: string
}
