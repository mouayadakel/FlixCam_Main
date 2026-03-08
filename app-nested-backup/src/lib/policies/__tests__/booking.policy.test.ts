/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/policies/booking.policy.ts
 * FEATURE: Booking authorization
 * UNITS: BookingPolicy.canCreate, canView, canUpdate, canDelete, canTransitionState
 * ═══════════════════════════════════════════════════════
 */

import { BookingPolicy } from '@/lib/policies/booking.policy'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
  PERMISSIONS: {
    BOOKING_CREATE: 'booking.create',
    BOOKING_READ: 'booking.read',
    BOOKING_UPDATE: 'booking.update',
    BOOKING_DELETE: 'booking.delete',
    BOOKING_TRANSITION: 'booking.transition',
  },
}))

const { prisma } = require('@/lib/db/prisma')
const { hasPermission } = require('@/lib/auth/permissions')

describe('BookingPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────────────────
  // UNIT: canCreate
  // REQUIREMENTS:
  //   - Returns { allowed: false } if user not found or deleted.
  //   - Returns { allowed: false } if user lacks BOOKING_CREATE permission.
  //   - Returns { allowed: true } if user exists and has permission.
  // ─────────────────────────────────────

  describe('canCreate', () => {
    it('returns allowed false when user is not found', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null)

      // Act
      const result = await BookingPolicy.canCreate('user_unknown')

      // Assert
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })

    it('returns allowed false when user is deleted', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        role: 'CUSTOMER',
        deletedAt: new Date(),
      })

      // Act
      const result = await BookingPolicy.canCreate('user_1')

      // Assert
      expect(result.allowed).toBe(false)
    })

    it('returns allowed false when user lacks BOOKING_CREATE permission', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        role: 'CUSTOMER',
        deletedAt: null,
      })
      ;(hasPermission as jest.Mock).mockResolvedValue(false)

      // Act
      const result = await BookingPolicy.canCreate('user_1')

      // Assert
      expect(result.allowed).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith('user_1', 'booking.create')
    })

    it('returns allowed true when user exists and has BOOKING_CREATE permission', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        role: 'ADMIN',
        deletedAt: null,
      })
      ;(hasPermission as jest.Mock).mockResolvedValue(true)

      // Act
      const result = await BookingPolicy.canCreate('user_1')

      // Assert
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })
  })

  // ─────────────────────────────────────
  // UNIT: canView
  // REQUIREMENTS:
  //   - Returns { allowed: false } if booking not found or user not found.
  //   - Returns { allowed: true } if booking.customerId === userId (own booking).
  //   - Returns { allowed: true } if user is staff with BOOKING_READ.
  //   - Returns { allowed: false } otherwise.
  // ─────────────────────────────────────

  describe('canView', () => {
    it('returns allowed false when booking is not found', async () => {
      // Arrange
      prisma.booking.findUnique.mockResolvedValue(null)

      // Act
      const result = await BookingPolicy.canView('user_1', 'bk_unknown')

      // Assert
      expect(result.allowed).toBe(false)
    })

    it('returns allowed true when user is the customer of the booking', async () => {
      // Arrange
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        customerId: 'user_1',
      })
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1', role: 'CUSTOMER' })

      // Act
      const result = await BookingPolicy.canView('user_1', 'bk_1')

      // Assert
      expect(result.allowed).toBe(true)
    })

    it('returns allowed true when user is staff with BOOKING_READ', async () => {
      // Arrange
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        customerId: 'other_user',
      })
      prisma.user.findUnique.mockResolvedValue({ id: 'user_staff', role: 'ADMIN' })
      ;(hasPermission as jest.Mock).mockResolvedValue(true)

      // Act
      const result = await BookingPolicy.canView('user_staff', 'bk_1')

      // Assert
      expect(result.allowed).toBe(true)
    })

    it('returns allowed false when user is not found', async () => {
      // Arrange: booking exists, customerId !== userId, user is null
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        customerId: 'other_user',
      })
      prisma.user.findUnique.mockResolvedValue(null)

      // Act
      const result = await BookingPolicy.canView('user_1', 'bk_1')

      // Assert
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('المستخدم غير موجود')
    })

    it('returns allowed false when staff has role but lacks BOOKING_READ permission', async () => {
      // Arrange: booking exists, customerId !== userId, user is staff, hasPermission returns false
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        customerId: 'other_user',
      })
      prisma.user.findUnique.mockResolvedValue({ id: 'user_staff', role: 'ADMIN' })
      ;(hasPermission as jest.Mock).mockResolvedValue(false)

      // Act
      const result = await BookingPolicy.canView('user_staff', 'bk_1')

      // Assert
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('صلاحية عرض')
    })
  })

  // ─────────────────────────────────────
  // UNIT: canDelete
  // REQUIREMENTS:
  //   - Returns { allowed: false } if booking not found or status !== DRAFT.
  //   - Returns { allowed: true } if staff with BOOKING_DELETE or customer owns draft.
  // ─────────────────────────────────────

  describe('canUpdate', () => {
    it('returns allowed false when booking not found', async () => {
      prisma.booking.findUnique.mockResolvedValue(null)
      const result = await BookingPolicy.canUpdate('user_1', 'bk_missing')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('الحجز غير موجود')
    })

    it('returns allowed false when booking is CLOSED', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'CLOSED', customerId: 'u1' })
      const result = await BookingPolicy.canUpdate('user_1', 'bk_1')
      expect(result.allowed).toBe(false)
    })

    it('returns allowed false when user not found', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'DRAFT', customerId: 'u1' })
      prisma.user.findUnique.mockResolvedValue(null)
      const result = await BookingPolicy.canUpdate('user_1', 'bk_1')
      expect(result.allowed).toBe(false)
    })

    it('returns allowed true when staff has BOOKING_UPDATE', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'DRAFT', customerId: 'other' })
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' })
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await BookingPolicy.canUpdate('staff_1', 'bk_1')
      expect(result.allowed).toBe(true)
    })

    it('returns allowed true when customer updates own draft', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'DRAFT', customerId: 'user_1' })
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' })
      const result = await BookingPolicy.canUpdate('user_1', 'bk_1')
      expect(result.allowed).toBe(true)
    })

    it('returns allowed false when customer updates non-own booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'DRAFT', customerId: 'other' })
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' })
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await BookingPolicy.canUpdate('user_1', 'bk_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed false when booking not found', async () => {
      prisma.booking.findUnique.mockResolvedValue(null)
      const result = await BookingPolicy.canDelete('user_1', 'bk_missing')
      expect(result.allowed).toBe(false)
    })

    it('returns allowed false when booking is not in DRAFT status', async () => {
      // Arrange
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        status: 'CONFIRMED',
        customerId: 'user_1',
      })
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' })

      // Act
      const result = await BookingPolicy.canDelete('user_1', 'bk_1')

      // Assert
      expect(result.allowed).toBe(false)
    })

    it('returns allowed false when user not found', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'DRAFT', customerId: 'user_1' })
      prisma.user.findUnique.mockResolvedValue(null)
      const result = await BookingPolicy.canDelete('user_1', 'bk_1')
      expect(result.allowed).toBe(false)
    })

    it('returns allowed true when staff has BOOKING_DELETE', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'DRAFT', customerId: 'other' })
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' })
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await BookingPolicy.canDelete('admin_1', 'bk_1')
      expect(result.allowed).toBe(true)
    })

    it('returns allowed true when customer deletes own draft booking', async () => {
      // Arrange
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        status: 'DRAFT',
        customerId: 'user_1',
      })
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' })

      // Act
      const result = await BookingPolicy.canDelete('user_1', 'bk_1')

      // Assert
      expect(result.allowed).toBe(true)
    })

    it('returns allowed false when customer tries to delete another customer draft', async () => {
      // Arrange: draft belongs to other_user, current user is user_1 (customer)
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        status: 'DRAFT',
        customerId: 'other_user',
      })
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' })
      ;(hasPermission as jest.Mock).mockResolvedValue(false)

      // Act
      const result = await BookingPolicy.canDelete('user_1', 'bk_1')

      // Assert
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('صلاحية حذف')
    })
  })

  // ─────────────────────────────────────
  // UNIT: canTransitionState
  // REQUIREMENTS:
  //   - Returns { allowed: false } if booking not found or CLOSED/CANCELLED.
  //   - Returns { allowed: false } if user lacks BOOKING_TRANSITION.
  //   - Returns { allowed: true } otherwise.
  // ─────────────────────────────────────

  describe('canTransitionState', () => {
    it('returns allowed false when booking not found', async () => {
      prisma.booking.findUnique.mockResolvedValue(null)
      const result = await BookingPolicy.canTransitionState('user_1', 'bk_missing', 'CONFIRMED' as any)
      expect(result.allowed).toBe(false)
    })

    it('returns allowed false when booking is CANCELLED', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'CANCELLED' })
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await BookingPolicy.canTransitionState('user_1', 'bk_1', 'CONFIRMED' as any)
      expect(result.allowed).toBe(false)
    })

    it('returns allowed false when user lacks BOOKING_TRANSITION', async () => {
      prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status: 'DRAFT' })
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await BookingPolicy.canTransitionState('user_1', 'bk_1', 'CONFIRMED' as any)
      expect(result.allowed).toBe(false)
    })

    it('returns allowed false when booking is CLOSED', async () => {
      // Arrange
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        status: 'CLOSED',
      })
      ;(hasPermission as jest.Mock).mockResolvedValue(true)

      // Act
      const result = await BookingPolicy.canTransitionState(
        'user_1',
        'bk_1',
        'CONFIRMED' as Parameters<typeof BookingPolicy.canTransitionState>[2]
      )

      // Assert
      expect(result.allowed).toBe(false)
    })

    it('returns allowed true when booking exists and user has BOOKING_TRANSITION', async () => {
      // Arrange
      prisma.booking.findUnique.mockResolvedValue({
        id: 'bk_1',
        status: 'DRAFT',
      })
      ;(hasPermission as jest.Mock).mockResolvedValue(true)

      // Act
      const result = await BookingPolicy.canTransitionState(
        'user_1',
        'bk_1',
        'CONFIRMED' as Parameters<typeof BookingPolicy.canTransitionState>[2]
      )

      // Assert
      expect(result.allowed).toBe(true)
    })
  })
})
