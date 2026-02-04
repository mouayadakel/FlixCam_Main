/**
 * @file contract.types.ts
 * @description TypeScript types for contract management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

export type ContractStatus = 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled'

export interface SignatureData {
  signature: string // Base64 encoded signature image
  signedBy: string // User ID
  signedAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface ContractContent {
  terms: string
  equipment: Array<{
    id: string
    name: string
    sku: string
    quantity: number
    dailyPrice: number
  }>
  booking: {
    id: string
    bookingNumber: string
    startDate: Date
    endDate: Date
    totalAmount: number
  }
  customer: {
    id: string
    name: string | null
    email: string
  }
  termsVersion: string
  generatedAt: Date
}

export interface Contract {
  id: string
  bookingId: string
  termsVersion: string
  contractContent: ContractContent
  signedAt?: Date | null
  signedBy?: string | null
  signatureData?: SignatureData | null
  status: ContractStatus
  booking?: {
    id: string
    bookingNumber: string
    customerId: string
    customer?: {
      id: string
      name: string | null
      email: string
    }
  } | null
  createdAt: Date
  updatedAt: Date
  createdBy?: string | null
  updatedBy?: string | null
}

export interface ContractCreateInput {
  bookingId: string
  termsVersion?: string
}

export interface ContractSignInput {
  signature: string // Base64 encoded signature image
  ipAddress?: string
  userAgent?: string
}

export interface ContractUpdateInput {
  termsVersion?: string
  contractContent?: ContractContent
}

export interface ContractFilterInput {
  status?: ContractStatus
  bookingId?: string
  customerId?: string
  signed?: boolean
  dateFrom?: Date
  dateTo?: Date
  termsVersion?: string
  page?: number
  pageSize?: number
}
