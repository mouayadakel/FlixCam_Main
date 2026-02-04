/**
 * @file booking.policy.ts
 * @description Authorization policies for booking operations
 * @module lib/policies
 */

import { prisma } from '@/lib/db/prisma'
import type { BookingState } from '@/lib/types/booking.types'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class BookingPolicy {
  /**
   * Check if user can create a booking
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    // TODO: Add permission check
    // For now, allow if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { allowed: false, reason: 'المستخدم غير موجود' }
    }

    return { allowed: true }
  }

  /**
   * Check if user can view a booking
   */
  static async canView(userId: string, bookingId: string): Promise<PolicyResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { allowed: false, reason: 'المستخدم غير موجود' }
    }

    // Customer can view their own bookings
    if (booking.customerId === userId) {
      return { allowed: true }
    }

    // Staff/admin can view all bookings
    // TODO: Add role-based permission check
    return { allowed: true }
  }

  /**
   * Check if user can update a booking
   */
  static async canUpdate(
    userId: string,
    bookingId: string,
    newState?: BookingState
  ): Promise<PolicyResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    // Cannot update closed or cancelled bookings
    if (booking.status === 'CLOSED' || booking.status === 'CANCELLED') {
      return { allowed: false, reason: 'لا يمكن تعديل حجز مغلق أو ملغي' }
    }

    // TODO: Add role-based permission check
    return { allowed: true }
  }

  /**
   * Check if user can delete a booking
   */
  static async canDelete(userId: string, bookingId: string): Promise<PolicyResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    // Only allow delete for draft bookings
    if (booking.status !== 'DRAFT') {
      return {
        allowed: false,
        reason: 'يمكن حذف الحجوزات في حالة المسودة فقط',
      }
    }

    // TODO: Add role-based permission check (admin only)
    return { allowed: true }
  }

  /**
   * Check if user can transition booking state
   */
  static async canTransitionState(
    userId: string,
    bookingId: string,
    toState: BookingState
  ): Promise<PolicyResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    // Cannot transition from final states
    if (booking.status === 'CLOSED' || booking.status === 'CANCELLED') {
      return { allowed: false, reason: 'لا يمكن تغيير حالة حجز مغلق أو ملغي' }
    }

    // TODO: Add role-based permission check based on transition
    return { allowed: true }
  }
}
