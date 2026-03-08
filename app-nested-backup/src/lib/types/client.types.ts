/**
 * @file client.types.ts
 * @description TypeScript types for client management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

import { UserRole } from '@prisma/client'

export type ClientStatus = 'active' | 'suspended' | 'inactive'

export interface Client {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: UserRole
  status: ClientStatus
  twoFactorEnabled: boolean
  verificationStatus?: string
  segmentId?: string | null
  segmentName?: string | null
  createdAt: Date
  updatedAt: Date
  // Statistics
  totalBookings?: number
  totalSpent?: number
  lastBookingDate?: Date | null
}

export interface ClientCreateInput {
  email: string
  name?: string
  phone?: string
  password: string
  role?: UserRole
  status?: ClientStatus
}

export interface ClientUpdateInput {
  name?: string
  phone?: string
  status?: ClientStatus
  role?: UserRole
}

export interface ClientFilterInput {
  status?: ClientStatus
  role?: UserRole
  search?: string
  dateFrom?: Date
  dateTo?: Date
  hasBookings?: boolean
  page?: number
  pageSize?: number
}
