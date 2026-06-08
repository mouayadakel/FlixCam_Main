/**
 * @file daftra.types.ts
 * @description Types for Daftra ERP API v2 integrations
 * @module lib/types/daftra
 */

export interface DaftraClientPayload {
  Client: {
    name: string
    type: 'individual' | 'business'
    email: string
    phone?: string
    address?: string
    tax_number?: string
  }
}

export interface DaftraClientResponse {
  id: number
  name: string
  email: string
  phone1?: string
  tax_number?: string
  // Additional optional fields returned by Daftra
  [key: string]: any
}

export interface DaftraInvoiceItem {
  item: string
  description?: string
  unit_price: number
  quantity: number
  product_id?: number
  tax_id?: number | string // Standard 15% VAT or other tax ID in Daftra
}

export interface DaftraPaymentItem {
  payment_method: string
  amount: number
  date: string
}

export interface DaftraInvoicePayload {
  Invoice: {
    client_id: number | string
    client_name?: string
    date: string
    due_date?: string
    currency_code: string
    notes?: string
    discount?: number
    draft: boolean
    invoice_number?: string
  }
  InvoiceItem: DaftraInvoiceItem[]
  Payment?: DaftraPaymentItem[]
}

export interface DaftraInvoiceResponse {
  id: number
  invoice_number: string
  payment_status: string
  total: number
  client_id: number
  // Under the hood, Daftra responds with QR details or print URL
  url?: string
  print_url?: string
  public_url?: string
  zatca_qr?: string
  [key: string]: any
}
