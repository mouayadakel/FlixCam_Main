/**
 * @file coupon.types.ts
 * @description TypeScript types for coupon management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

export type CouponType = 'percent' | 'fixed'
export type CouponStatus = 'active' | 'inactive' | 'expired' | 'scheduled'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  minPurchaseAmount?: number | null
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  usageCount: number
  status: CouponStatus
  validFrom: Date
  validUntil: Date
  applicableTo?: string[] | null // Equipment IDs or categories
  description?: string | null
  createdAt: Date
  updatedAt: Date
  createdBy?: string | null
  updatedBy?: string | null
}

export interface CouponCreateInput {
  code: string
  type: CouponType
  value: number
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  validFrom: Date
  validUntil: Date
  applicableTo?: string[]
  description?: string
}

export interface CouponUpdateInput {
  code?: string
  type?: CouponType
  value?: number
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  status?: CouponStatus
  validFrom?: Date
  validUntil?: Date
  applicableTo?: string[]
  description?: string
}

export interface CouponValidationResult {
  valid: boolean
  discountAmount: number
  error?: string
}

export interface CouponFilterInput {
  status?: CouponStatus
  type?: CouponType
  search?: string
  dateFrom?: Date
  dateTo?: Date
  active?: boolean
  page?: number
  pageSize?: number
}
