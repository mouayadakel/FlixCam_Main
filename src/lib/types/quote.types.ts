/**
 * @file quote.types.ts
 * @description TypeScript types for quote management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

export interface QuoteEquipmentItem {
  equipmentId: string
  quantity: number
  dailyRate: number
  totalDays: number
  subtotal: number
}

export interface Quote {
  id: string
  quoteNumber: string
  customerId: string
  status: QuoteStatus
  startDate: Date
  endDate: Date
  equipment: QuoteEquipmentItem[]
  studioId?: string | null
  studioStartTime?: Date | null
  studioEndTime?: Date | null
  subtotal: number
  discount?: number
  vatAmount: number
  totalAmount: number
  depositAmount?: number
  validUntil: Date
  notes?: string | null
  convertedToBookingId?: string | null
  customer?: {
    id: string
    name: string | null
    email: string
  }
  studio?: {
    id: string
    name: string | null
  } | null
  createdAt: Date
  updatedAt: Date
}

export interface QuoteCreateInput {
  customerId: string
  startDate: Date
  endDate: Date
  equipment: Array<{
    equipmentId: string
    quantity: number
  }>
  studioId?: string
  studioStartTime?: Date
  studioEndTime?: Date
  notes?: string
  validUntil?: Date
  discount?: number
}

export interface QuoteUpdateInput {
  startDate?: Date
  endDate?: Date
  equipment?: Array<{
    equipmentId: string
    quantity: number
  }>
  studioId?: string
  studioStartTime?: Date
  studioEndTime?: Date
  notes?: string
  validUntil?: Date
  discount?: number
}
