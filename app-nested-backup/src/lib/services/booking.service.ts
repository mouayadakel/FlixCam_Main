/**
 * @file booking.service.ts
 * @description Booking service with state machine, risk checks, availability engine, and soft locks
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { EquipmentService } from './equipment.service'
import { StudioService } from './studio.service'
import { InvoiceService } from './invoice.service'
import { EventBus } from '@/lib/events/event-bus'
import { PayoutService } from './payout.service'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import { type Prisma, BookingStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface BookingEquipmentInput {
  equipmentId: string
  quantity: number
}

export interface BookingCreateInput {
  customerId: string
  cartId?: string
  startDate: Date
  endDate: Date
  equipment: BookingEquipmentInput[]
  studioId?: string
  studioStartTime?: Date
  studioEndTime?: Date
  notes?: string
  totalAmount?: number
  depositAmount?: number
  vatAmount?: number
  // Receiver & fulfillment (checkout flow)
  receiverId?: string
  receiverName?: string
  receiverPhone?: string
  receiverIdNumber?: string
  receiverIdPhotoUrl?: string
  fulfillmentMethod?: string
  deliveryAddress?: string
  deliveryLat?: number
  deliveryLng?: number
  preferredTimeSlot?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  checkoutFormData?: Record<string, unknown>
}

export interface BookingUpdateInput {
  startDate?: Date
  endDate?: Date
  equipment?: BookingEquipmentInput[]
  studioId?: string
  studioStartTime?: Date
  studioEndTime?: Date
  notes?: string
}

export interface RiskCheckResult {
  riskLevel: 'low' | 'medium' | 'high'
  requiresManualReview: boolean
  factors: {
    bookingAmount: number
    customerHistory: {
      totalBookings: number
      completedBookings: number
      cancelledBookings: number
      totalSpent: number
    }
    equipmentValue: number
  }
}

export class BookingService {
  // State machine transitions (DRAFT→PAYMENT_PENDING for low-risk auto-approve)
  private static readonly VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    DRAFT: ['RISK_CHECK', 'PAYMENT_PENDING', 'CANCELLED'],
    RISK_CHECK: ['PAYMENT_PENDING', 'CANCELLED'],
    PAYMENT_PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['RETURNED', 'CANCELLED'],
    RETURNED: ['CLOSED'],
    CLOSED: [],
    CANCELLED: [],
  }

  /**
   * Generate unique booking number
   */
  private static async generateBookingNumber(): Promise<string> {
    const prefix = 'BK'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const bookingNumber = `${prefix}-${timestamp}-${random}`

    // Check uniqueness
    const existing = await prisma.booking.findFirst({
      where: { bookingNumber },
    })

    if (existing) {
      // Retry with different random
      return this.generateBookingNumber()
    }

    return bookingNumber
  }

  /**
   * Create new booking (registration required)
   */
  static async create(
    input: BookingCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canCreate = await hasPermission(userId, PERMISSIONS.BOOKING_CREATE)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create bookings')
    }

    // Validate customer exists and is active
    const customer = await prisma.user.findFirst({
      where: {
        id: input.customerId,
        deletedAt: null,
        status: 'active',
      },
    })

    if (!customer) {
      throw new NotFoundError('Customer', input.customerId)
    }

    // Validate dates
    if (input.endDate <= input.startDate) {
      throw new ValidationError('End date must be after start date')
    }

    if (input.startDate < new Date()) {
      throw new ValidationError('Start date cannot be in the past')
    }

    // Validate: need at least equipment or studio
    const hasEquipment = input.equipment && input.equipment.length > 0
    const hasStudio = !!(input.studioId && input.studioStartTime && input.studioEndTime)
    if (!hasEquipment && !hasStudio) {
      throw new ValidationError('At least one equipment item or studio booking is required')
    }

    // Check equipment availability (skip when studio-only)
    if (hasEquipment) {
      for (const eq of input.equipment!) {
        const availability = await EquipmentService.checkAvailability(
          eq.equipmentId,
          input.startDate,
          input.endDate
        )
        const freeInPeriod =
          (availability.availableQuantity ?? 0) - (availability.rentedQuantity ?? 0)
        if (!availability.available || freeInPeriod < eq.quantity) {
          throw new ValidationError(
            `Equipment ${eq.equipmentId} is not available. Available quantity: ${freeInPeriod}`
          )
        }
      }
    }

    // Check studio availability if provided
    if (input.studioId && input.studioStartTime && input.studioEndTime) {
      if (input.studioEndTime <= input.studioStartTime) {
        throw new ValidationError('Studio end time must be after start time')
      }

      const studioAvailability = await StudioService.checkAvailability({
        studioId: input.studioId,
        startTime: input.studioStartTime,
        endTime: input.studioEndTime,
      })

      if (!studioAvailability.available) {
        throw new ValidationError(
          `Studio is not available: ${studioAvailability.conflicts.map((c) => c.type).join(', ')}`
        )
      }
    }

    // Generate booking number
    const bookingNumber = await this.generateBookingNumber()

    // Set soft lock (10-15 minutes)
    const softLockExpiresAt = new Date()
    softLockExpiresAt.setMinutes(softLockExpiresAt.getMinutes() + 15)

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: input.customerId,
        cartId: input.cartId ?? undefined,
        status: BookingStatus.DRAFT,
        startDate: input.startDate,
        endDate: input.endDate,
        studioId: input.studioId,
        studioStartTime: input.studioStartTime,
        studioEndTime: input.studioEndTime,
        totalAmount: input.totalAmount ? new Decimal(input.totalAmount) : new Decimal(0),
        depositAmount: input.depositAmount ? new Decimal(input.depositAmount) : null,
        vatAmount: input.vatAmount ? new Decimal(input.vatAmount) : new Decimal(0),
        notes: input.notes,
        softLockExpiresAt,
        createdBy: userId,
        updatedBy: userId,
        receiverId: input.receiverId ?? null,
        receiverName: input.receiverName ?? null,
        receiverPhone: input.receiverPhone ?? null,
        receiverIdNumber: input.receiverIdNumber ?? null,
        receiverIdPhotoUrl: input.receiverIdPhotoUrl ?? null,
        fulfillmentMethod: input.fulfillmentMethod ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        deliveryLat: input.deliveryLat ?? null,
        deliveryLng: input.deliveryLng ?? null,
        preferredTimeSlot: input.preferredTimeSlot ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
        emergencyContactRelation: input.emergencyContactRelation ?? null,
        checkoutFormData: input.checkoutFormData == null ? undefined : (input.checkoutFormData as Prisma.InputJsonValue),
      },
    })

    // Create booking equipment (skip when studio-only)
    if (input.equipment && input.equipment.length > 0) {
      await Promise.all(
        input.equipment.map((eq) =>
          prisma.bookingEquipment.create({
            data: {
              bookingId: booking.id,
              equipmentId: eq.equipmentId,
              quantity: eq.quantity,
              createdBy: userId,
              updatedBy: userId,
            },
          })
        )
      )
    }

    // Audit log
    await AuditService.log({
      action: 'booking.created',
      userId,
      resourceType: 'booking',
      resourceId: booking.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { bookingNumber: booking.bookingNumber },
    })

    // Emit event
    await EventBus.emit('booking.created', {
      booking: await this.getById(booking.id, userId),
      userId,
    })

    return this.getById(booking.id, userId)
  }

  /**
   * Perform risk check (conditional - auto for low-risk, manual for high-risk)
   */
  static async performRiskCheck(
    bookingId: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<RiskCheckResult> {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        deletedAt: null,
      },
      include: {
        equipment: {
          include: {
            equipment: true,
          },
        },
        customer: true,
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', bookingId)
    }

    if (booking.status !== BookingStatus.DRAFT) {
      throw new ValidationError('Risk check can only be performed on DRAFT bookings')
    }

    // Calculate booking amount
    const bookingAmount = Number(booking.totalAmount)

    // Get customer history
    const customerBookings = await prisma.booking.findMany({
      where: {
        customerId: booking.customerId,
        deletedAt: null,
      },
    })

    const completedBookings = customerBookings.filter(
      (b) => b.status === BookingStatus.CLOSED
    ).length
    const cancelledBookings = customerBookings.filter(
      (b) => b.status === BookingStatus.CANCELLED
    ).length
    const totalSpent = customerBookings
      .filter((b) => b.status === BookingStatus.CLOSED)
      .reduce((sum, b) => sum + Number(b.totalAmount), 0)

    // Calculate equipment value
    const equipmentValue = booking.equipment.reduce(
      (sum, be) => sum + Number(be.equipment.dailyPrice) * be.quantity,
      0
    )

    // Risk assessment logic
    let riskScore = 0

    // Booking amount factor (higher = more risk)
    if (bookingAmount > 50000) riskScore += 3
    else if (bookingAmount > 20000) riskScore += 2
    else if (bookingAmount > 10000) riskScore += 1

    // Customer history factor
    if (customerBookings.length === 0) riskScore += 2 // New customer
    if (cancelledBookings > completedBookings) riskScore += 2 // More cancellations
    if (totalSpent === 0 && customerBookings.length > 0) riskScore += 1 // Never completed

    // Equipment value factor
    if (equipmentValue > 100000) riskScore += 2
    else if (equipmentValue > 50000) riskScore += 1

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high'
    let requiresManualReview: boolean

    if (riskScore <= 2) {
      riskLevel = 'low'
      requiresManualReview = false
    } else if (riskScore <= 4) {
      riskLevel = 'medium'
      requiresManualReview = false // Auto-approve medium risk for now
    } else {
      riskLevel = 'high'
      requiresManualReview = true
    }

    const riskResult: RiskCheckResult = {
      riskLevel,
      requiresManualReview,
      factors: {
        bookingAmount,
        customerHistory: {
          totalBookings: customerBookings.length,
          completedBookings,
          cancelledBookings,
          totalSpent,
        },
        equipmentValue,
      },
    }

    // Update booking status
    if (!requiresManualReview) {
      // Auto-approve: move to PAYMENT_PENDING
      await this.transitionState(bookingId, BookingStatus.PAYMENT_PENDING, userId, auditContext)
    } else {
      // Manual review: move to RISK_CHECK
      await this.transitionState(bookingId, BookingStatus.RISK_CHECK, userId, auditContext)
    }

    // Audit log
    await AuditService.log({
      action: 'booking.risk_check',
      userId,
      resourceType: 'booking',
      resourceId: bookingId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { riskLevel, requiresManualReview, riskScore },
    })

    // Emit event
    await EventBus.emit('booking.risk_check', {
      booking: await this.getById(bookingId, userId),
      userId,
    })

    return riskResult
  }

  /**
   * When a booking is confirmed, increment appliedCount (and totalImpact) for pricing rules
   * that apply to this booking. Uses rule conditions (date range, min/max duration) to match.
   */
  private static async recordPricingRuleApplication(booking: {
    id: string
    startDate: Date
    endDate: Date
    totalAmount: unknown
  }) {
    const rules = await prisma.pricingRule.findMany({
      where: { isActive: true },
      select: { id: true, conditions: true, adjustmentType: true, adjustmentValue: true },
    })
    const start = new Date(booking.startDate)
    const end = new Date(booking.endDate)
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const matchingIds: string[] = []
    for (const rule of rules) {
      const cond = (rule.conditions ?? {}) as Record<string, unknown>
      const dateRange = cond.dateRange as { start?: string; end?: string } | undefined
      if (dateRange?.start && dateRange?.end) {
        const ruleStart = new Date(dateRange.start)
        const ruleEnd = new Date(dateRange.end)
        if (end < ruleStart || start > ruleEnd) continue
      }
      const minDuration = cond.minDuration as number | undefined
      const maxDuration = cond.maxDuration as number | undefined
      if (minDuration != null && durationDays < minDuration) continue
      if (maxDuration != null && durationDays > maxDuration) continue
      matchingIds.push(rule.id)
    }

    for (const ruleId of matchingIds) {
      await prisma.pricingRule.update({
        where: { id: ruleId },
        data: { appliedCount: { increment: 1 } },
      })
    }
  }

  /**
   * Transition booking state
   */
  static async transitionState(
    bookingId: string,
    newStatus: BookingStatus,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string },
    reason?: string
  ) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        deletedAt: null,
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', bookingId)
    }

    // Validate transition
    const validTransitions = this.VALID_TRANSITIONS[booking.status]
    if (!validTransitions.includes(newStatus)) {
      throw new ValidationError(`Invalid state transition from ${booking.status} to ${newStatus}`)
    }

    // Special validations
    if (newStatus === BookingStatus.CONFIRMED) {
      // Must have successful payment
      const payment = await prisma.payment.findFirst({
        where: {
          bookingId,
          status: 'SUCCESS',
          deletedAt: null,
        },
      })

      if (!payment) {
        throw new ValidationError('Cannot confirm booking without successful payment')
      }
    }

    // ACTIVE only reachable from CONFIRMED (enforced by VALID_TRANSITIONS)

    // Update status
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        updatedBy: userId,
        softLockExpiresAt: null, // Clear soft lock on state change
      },
    })

    // Update equipment availability if booking is confirmed/active
    if (newStatus === BookingStatus.CONFIRMED || newStatus === BookingStatus.ACTIVE) {
      const bookingEquipment = await prisma.bookingEquipment.findMany({
        where: {
          bookingId,
          deletedAt: null,
        },
      })

      for (const be of bookingEquipment) {
        const equipment = await prisma.equipment.findFirst({
          where: { id: be.equipmentId },
        })

        if (equipment) {
          const newAvailable = Math.max(0, equipment.quantityAvailable - be.quantity)
          await prisma.equipment.update({
            where: { id: be.equipmentId },
            data: {
              quantityAvailable: newAvailable,
              updatedBy: userId,
            },
          })
        }
      }
    }

    // Restore equipment availability if booking is cancelled/closed
    if (newStatus === BookingStatus.CANCELLED || newStatus === BookingStatus.CLOSED) {
      const bookingEquipment = await prisma.bookingEquipment.findMany({
        where: {
          bookingId,
          deletedAt: null,
        },
      })

      for (const be of bookingEquipment) {
        const equipment = await prisma.equipment.findFirst({
          where: { id: be.equipmentId },
        })

        if (equipment) {
          const newAvailable = Math.min(
            equipment.quantityTotal,
            equipment.quantityAvailable + be.quantity
          )
          await prisma.equipment.update({
            where: { id: be.equipmentId },
            data: {
              quantityAvailable: newAvailable,
              updatedBy: userId,
            },
          })
        }
      }
    }

    // Audit log
    await AuditService.log({
      action: `booking.status_changed`,
      userId,
      resourceType: 'booking',
      resourceId: bookingId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        oldStatus: booking.status,
        newStatus,
        reason,
      },
    })

    // Emit events based on status
    if (newStatus === BookingStatus.CONFIRMED) {
      await this.recordPricingRuleApplication(updated).catch((err) => {
        logger.error('Failed to record pricing rule application', { error: err instanceof Error ? err.message : String(err) })
      })
      await EventBus.emit('booking.confirmed', {
        booking: updated,
        userId,
      })
      // Create vendor payouts for equipment with vendors
      await PayoutService.createVendorPayoutsForBooking(bookingId, userId).catch((err) => {
        logger.error('Failed to create vendor payouts', { error: err instanceof Error ? err.message : String(err) })
      })
      // Auto-generate invoice on confirmation (FIX-015)
      await InvoiceService.autoGenerateForBooking(bookingId).catch((err) => {
        logger.error('Failed to auto-generate invoice for confirmed booking', {
          error: err instanceof Error ? err.message : String(err),
          bookingId,
        })
      })
    } else if (newStatus === BookingStatus.CANCELLED) {
      await EventBus.emit('booking.cancelled', {
        booking: updated,
        userId,
      })
    }

    return updated
  }

  /**
   * Get booking by ID
   */
  static async getById(id: string, userId: string) {
    // Check permission
    const canView = await hasPermission(userId, PERMISSIONS.BOOKING_READ)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view bookings')
    }

    // Determine if user is a client (non-staff) to scope access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    const clientRoles = ['DATA_ENTRY'] as const
    const isClientRole =
      !user ||
      ![
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
      ].includes(user.role)

    const whereClause: Record<string, unknown> = {
      id,
      deletedAt: null,
    }

    // Clients can only view their own bookings (IDOR protection)
    if (isClientRole) {
      whereClause.customerId = userId
    }

    const booking = await prisma.booking.findFirst({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        studio: true,
        equipment: {
          include: {
            equipment: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
        payments: {
          where: {
            deletedAt: null,
          },
        },
        contracts: {
          where: {
            deletedAt: null,
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', id)
    }

    return booking
  }

  /**
   * Update a draft booking's details (dates, notes, equipment, studio)
   */
  static async update(
    id: string,
    userId: string,
    data: {
      startDate?: Date
      endDate?: Date
      notes?: string
      studioId?: string
      studioStartTime?: Date
      studioEndTime?: Date
    }
  ) {
    const canUpdate = await hasPermission(userId, PERMISSIONS.BOOKING_UPDATE)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update bookings')
    }

    const existing = await prisma.booking.findFirst({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      throw new NotFoundError('Booking', id)
    }

    if (existing.status !== 'DRAFT') {
      throw new ValidationError('Only draft bookings can be updated')
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        customer: { select: { id: true, email: true, name: true, phone: true } },
        studio: true,
        equipment: { include: { equipment: true } },
      },
    })

    await AuditService.log({
      action: 'booking.updated',
      userId,
      resourceType: 'Booking',
      resourceId: id,
    })

    await EventBus.emit('booking.updated', {
      booking: updated,
      userId,
      timestamp: new Date(),
    })

    return updated
  }

  /**
   * List bookings with filters
   */
  static async list(
    userId: string,
    filters: {
      customerId?: string
      status?: BookingStatus
      startDate?: Date
      endDate?: Date
      search?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    // Check permission
    const canView = await hasPermission(userId, PERMISSIONS.BOOKING_READ)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view bookings')
    }

    // Scope client users to their own bookings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    const isStaff =
      user &&
      [
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
      ].includes(user.role)

    const where: any = {
      deletedAt: null,
    }

    // IDOR protection: clients can only list their own bookings
    if (!isStaff) {
      where.customerId = userId
    } else if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.startDate || filters.endDate) {
      where.OR = [
        {
          AND: [{ startDate: { lte: filters.endDate } }, { endDate: { gte: filters.startDate } }],
        },
      ]
    }

    if (filters.search) {
      where.OR = [
        { bookingNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: {
            email: { contains: filters.search, mode: 'insensitive' },
          },
        },
        {
          customer: {
            name: { contains: filters.search, mode: 'insensitive' },
          },
        },
      ]
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          studio: true,
          equipment: {
            include: {
              equipment: {
                select: {
                  id: true,
                  sku: true,
                  model: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      prisma.booking.count({ where }),
    ])

    return {
      data: bookings,
      total,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    }
  }

  /**
   * Cancel booking
   */
  static async cancel(
    bookingId: string,
    userId: string,
    reason?: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canCancel = await hasPermission(userId, PERMISSIONS.BOOKING_CANCEL)
    if (!canCancel) {
      throw new ForbiddenError('You do not have permission to cancel bookings')
    }

    // Scope by role for IDOR protection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    const isStaff =
      user &&
      [
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
      ].includes(user.role)

    const whereClause: Record<string, unknown> = {
      id: bookingId,
      deletedAt: null,
    }
    if (!isStaff) {
      whereClause.customerId = userId
    }

    const booking = await prisma.booking.findFirst({
      where: whereClause,
    })

    if (!booking) {
      throw new NotFoundError('Booking', bookingId)
    }

    // Cannot cancel closed bookings
    if (booking.status === BookingStatus.CLOSED) {
      throw new ValidationError('Cannot cancel a closed booking')
    }

    // Transition to cancelled
    await this.transitionState(bookingId, BookingStatus.CANCELLED, userId, auditContext, reason)

    return this.getById(bookingId, userId)
  }

  /**
   * Mark booking as returned (ACTIVE → RETURNED). Phase 4.5.
   * If actualReturnDate > endDate, computes late fee at 150% of daily rate per late day.
   */
  static async markReturned(
    bookingId: string,
    userId: string,
    actualReturnDate?: Date,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    const canUpdate = await hasPermission(userId, PERMISSIONS.BOOKING_UPDATE)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to mark bookings as returned')
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        equipment: {
          where: { deletedAt: null },
          include: { equipment: true },
        },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', bookingId)
    }

    if (booking.status !== BookingStatus.ACTIVE) {
      throw new ValidationError(
        `Booking must be ACTIVE to mark as returned (current: ${booking.status})`
      )
    }

    const returnDate = actualReturnDate ? new Date(actualReturnDate) : new Date()
    const endDate = new Date(booking.endDate)
    let lateFeeAmount = 0

    if (returnDate > endDate) {
      const lateMs = returnDate.getTime() - endDate.getTime()
      const lateDays = Math.ceil(lateMs / (24 * 60 * 60 * 1000))
      for (const be of booking.equipment) {
        const dailyRate = Number(be.equipment.dailyPrice ?? 0)
        lateFeeAmount += be.quantity * dailyRate * lateDays * 1.5 // 150%
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.RETURNED,
          actualReturnDate: returnDate,
          lateFeeAmount: lateFeeAmount > 0 ? new Decimal(lateFeeAmount) : null,
          updatedBy: userId,
        },
      })

      for (const be of booking.equipment) {
        const equipment = await tx.equipment.findFirst({
          where: { id: be.equipmentId },
        })
        if (equipment) {
          const newAvailable = Math.min(
            equipment.quantityTotal,
            equipment.quantityAvailable + be.quantity
          )
          await tx.equipment.update({
            where: { id: be.equipmentId },
            data: {
              quantityAvailable: newAvailable,
              updatedBy: userId,
            },
          })
        }
      }

      return b
    })

    await AuditService.log({
      action: 'booking.mark_returned',
      userId,
      resourceType: 'booking',
      resourceId: bookingId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        actualReturnDate: returnDate.toISOString(),
        lateFeeAmount: lateFeeAmount > 0 ? lateFeeAmount : undefined,
      },
    })

    return updated
  }

  /**
   * Check and release expired soft locks
   */
  static async releaseExpiredSoftLocks() {
    const expiredLocks = await prisma.booking.findMany({
      where: {
        softLockExpiresAt: {
          lte: new Date(),
        },
        status: BookingStatus.DRAFT,
        deletedAt: null,
      },
    })

    for (const booking of expiredLocks) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          softLockExpiresAt: null,
        },
      })
    }

    return expiredLocks.length
  }
}
