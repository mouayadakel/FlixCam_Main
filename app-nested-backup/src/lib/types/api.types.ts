/**
 * @file api.types.ts
 * @description Shared API response types (list endpoints contract)
 * @module lib/types
 */

/**
 * Standard list API response shape.
 * List endpoints (e.g. GET /api/bookings, GET /api/payments) return this shape.
 */
export interface ListResponse<T> {
  data: T[]
  total?: number
  limit?: number
  offset?: number
}
