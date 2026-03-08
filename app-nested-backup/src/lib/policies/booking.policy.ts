/**
 * @file booking.policy.ts
 * @description Authorization policies for booking operations
 * @module lib/policies
 */

import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import type { BookingState } from '@/lib/types/booking.types'

const STAFF_ROLES = [
  'ADMIN',
  'WAREHOUSE_MANAGER',
  'TECHNICIAN',
  'SALES_MANAGER',
  'ACCOUNTANT',
  'CUSTOMER_SERVICE',
  'MARKETING_MANAGER',
  'RISK_MANAGER',
  'APPROVAL_AGENT',
  'AUDITOR',
  'AI_OPERATOR',
]

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class BookingPolicy {
  /**
   * Check if user can create a booking
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return { allowed: false, reason: 'المستخدم غير موجود' }
    }

    const hasPerm = await hasPermission(userId, PERMISSIONS.BOOKING_CREATE)
    if (!hasPerm) {
      return { allowed: false, reason: 'ليس لديك صلاحية إنشاء حجز' }
    }

    return { allowed: true }
  }

  /**
   * Check if user can view a booking
   */
  static async canView(userId: string, bookingId: string): Promise<PolicyResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return { allowed: false, reason: 'المستخدم غير موجود' }
    }

    // Customer can view their own bookings
    if (booking.customerId === userId) {
      return { allowed: true }
    }

    // Staff roles with booking.read can view any booking
    if (STAFF_ROLES.includes(user.role)) {
      const hasPerm = await hasPermission(userId, PERMISSIONS.BOOKING_READ)
      if (hasPerm) return { allowed: true }
    }

    return { allowed: false, reason: 'ليس لديك صلاحية عرض هذا الحجز' }
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
      select: { id: true, status: true, customerId: true },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    if (booking.status === 'CLOSED' || booking.status === 'CANCELLED') {
      return { allowed: false, reason: 'لا يمكن تعديل حجز مغلق أو ملغي' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) {
      return { allowed: false, reason: 'المستخدم غير موجود' }
    }

    // Staff with booking.update permission
    if (STAFF_ROLES.includes(user.role)) {
      const hasPerm = await hasPermission(userId, PERMISSIONS.BOOKING_UPDATE)
      if (hasPerm) return { allowed: true }
    }

    // Customer can only update their own draft bookings
    if (booking.customerId === userId && booking.status === 'DRAFT') {
      return { allowed: true }
    }

    return { allowed: false, reason: 'ليس لديك صلاحية تعديل هذا الحجز' }
  }

  /**
   * Check if user can delete a booking
   */
  static async canDelete(userId: string, bookingId: string): Promise<PolicyResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, customerId: true },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    if (booking.status !== 'DRAFT') {
      return {
        allowed: false,
        reason: 'يمكن حذف الحجوزات في حالة المسودة فقط',
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) {
      return { allowed: false, reason: 'المستخدم غير موجود' }
    }

    // Staff with booking.delete permission
    if (STAFF_ROLES.includes(user.role)) {
      const hasPerm = await hasPermission(userId, PERMISSIONS.BOOKING_DELETE)
      if (hasPerm) return { allowed: true }
    }

    // Customer can delete their own draft bookings
    if (booking.customerId === userId) {
      return { allowed: true }
    }

    return { allowed: false, reason: 'ليس لديك صلاحية حذف هذا الحجز' }
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
      select: { id: true, status: true },
    })

    if (!booking) {
      return { allowed: false, reason: 'الحجز غير موجود' }
    }

    if (booking.status === 'CLOSED' || booking.status === 'CANCELLED') {
      return { allowed: false, reason: 'لا يمكن تغيير حالة حجز مغلق أو ملغي' }
    }

    const hasPerm = await hasPermission(userId, PERMISSIONS.BOOKING_TRANSITION)
    if (!hasPerm) {
      return { allowed: false, reason: 'ليس لديك صلاحية تغيير حالة الحجز' }
    }

    return { allowed: true }
  }
}
