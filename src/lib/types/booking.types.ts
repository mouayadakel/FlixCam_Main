/**
 * @file booking.types.ts
 * @description TypeScript types for booking domain
 * @module lib/types
 */

import type { BookingStatus } from '@prisma/client'

/**
 * Booking state type matching Prisma enum
 */
export type BookingState = BookingStatus

/**
 * Booking state labels (Arabic and English)
 */
export interface BookingStateLabel {
  ar: string
  en: string
}

/**
 * State configuration with colors and metadata
 */
export interface BookingStateConfig {
  key: BookingState
  label: BookingStateLabel
  description: string
  color: string
  autoTransition?: boolean
  duration?: string
  final?: boolean
  permissions?: {
    view: string[]
    edit: string[]
    delete: string[]
  }
}

/**
 * State transition definition
 */
export interface StateTransition {
  from: BookingState | BookingState[]
  to: BookingState
  trigger: string
  conditions?: string[]
  actions?: string[]
  permissions?: string[]
}

/**
 * Transition result
 */
export interface TransitionResult {
  success: boolean
  error?: string
  newState?: BookingState
}

/**
 * Create booking input
 */
export interface CreateBookingInput {
  customerId: string
  startDate: Date | string
  endDate: Date | string
  equipmentIds: string[]
  studioId?: string
  studioStartTime?: Date | string
  studioEndTime?: Date | string
  notes?: string
}

/**
 * Update booking input
 */
export interface UpdateBookingInput {
  startDate?: Date | string
  endDate?: Date | string
  equipmentIds?: string[]
  studioId?: string
  studioStartTime?: Date | string
  studioEndTime?: Date | string
  notes?: string
}

/**
 * Booking with relations
 */
export interface BookingWithRelations {
  id: string
  bookingNumber: string
  customerId: string
  status: BookingState
  startDate: Date
  endDate: Date
  totalAmount: number
  depositAmount: number | null
  vatAmount: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
  customer?: {
    id: string
    name: string | null
    email: string
  }
  equipment?: Array<{
    id: string
    equipment: {
      id: string
      serialNumber: string
      itemStatus: string
    }
    quantity: number
  }>
  payments?: Array<{
    id: string
    amount: number
    status: string
  }>
}
