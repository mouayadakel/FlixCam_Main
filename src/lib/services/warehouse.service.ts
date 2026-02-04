/**
 * @file warehouse.service.ts
 * @description Warehouse service for check-in/check-out operations and inventory management
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { InspectionService, InspectionInput } from './inspection.service'
import { BookingService } from './booking.service'
import { EventBus } from '@/lib/events/event-bus'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import { BookingStatus, EquipmentCondition } from '@prisma/client'

export interface CheckOutInput {
  bookingId: string
  equipmentIds: string[]
  checklist: InspectionInput['checklist']
  notes?: string
  warehouseLocation?: string
}

export interface CheckInInput {
  bookingId: string
  equipmentIds: string[]
  checklist: InspectionInput['checklist']
  notes?: string
  condition?: EquipmentCondition
  damageReport?: string
}

export interface WarehouseInventoryItem {
  equipmentId: string
  sku: string
  model: string | null
  condition: EquipmentCondition
  warehouseLocation: string | null
  isAvailable: boolean
  isCheckedOut: boolean
  currentBookingId: string | null
}

export class WarehouseService {
  /**
   * Check out equipment for a booking
   * Creates inspection records and updates booking status
   */
  static async checkOut(
    input: CheckOutInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canCheckOut = await hasPermission(userId, 'warehouse.check_out' as any)
    if (!canCheckOut) {
      throw new ForbiddenError('You do not have permission to check out equipment')
    }

    // Validate booking exists and is in correct status
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        deletedAt: null,
      },
      include: {
        equipment: {
          where: {
            deletedAt: null,
          },
          include: {
            equipment: true,
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', input.bookingId)
    }

    // Booking must be CONFIRMED or ACTIVE to check out
    if (booking.status !== 'CONFIRMED' && booking.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot check out equipment for booking in ${booking.status} status. Booking must be CONFIRMED or ACTIVE.`
      )
    }

    // Validate all equipment IDs belong to this booking
    const bookingEquipmentIds = booking.equipment.map((be) => be.equipmentId)
    const invalidEquipment = input.equipmentIds.filter(
      (id) => !bookingEquipmentIds.includes(id)
    )

    if (invalidEquipment.length > 0) {
      throw new ValidationError(
        `Equipment ${invalidEquipment.join(', ')} is not part of this booking`
      )
    }

    // Check if equipment is already checked out
    const existingCheckOuts = await prisma.inspection.findMany({
      where: {
        bookingId: input.bookingId,
        type: 'check_out',
        equipmentId: { in: input.equipmentIds },
        deletedAt: null,
      },
    })

    if (existingCheckOuts.length > 0) {
      throw new ValidationError('Some equipment has already been checked out')
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create inspection records for each equipment
      const inspections = await Promise.all(
        input.equipmentIds.map((equipmentId) =>
          InspectionService.create(
            {
              bookingId: input.bookingId,
              equipmentId,
              type: 'check_out',
              checklist: input.checklist,
              notes: input.notes,
            },
            userId,
            auditContext
          )
        )
      )

      // Update equipment warehouse location if provided
      if (input.warehouseLocation) {
        await tx.equipment.updateMany({
          where: {
            id: { in: input.equipmentIds },
            deletedAt: null,
          },
          data: {
            warehouseLocation: input.warehouseLocation,
          },
        })
      }

      // Transition booking to ACTIVE if it's CONFIRMED
      if (booking.status === 'CONFIRMED') {
        await BookingService.transitionState(
          input.bookingId,
          'ACTIVE',
          userId
        )
      }

      return inspections
    })

    // Emit event
    await EventBus.emit('warehouse.equipment.checked_out', {
      bookingId: input.bookingId,
      equipmentIds: input.equipmentIds,
      checkedOutBy: userId,
      timestamp: new Date(),
    })

    return result
  }

  /**
   * Check in equipment from a booking
   * Creates inspection records, updates equipment condition, and transitions booking
   */
  static async checkIn(
    input: CheckInInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canCheckIn = await hasPermission(userId, 'warehouse.check_in' as any)
    if (!canCheckIn) {
      throw new ForbiddenError('You do not have permission to check in equipment')
    }

    // Validate booking exists
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        deletedAt: null,
      },
      include: {
        equipment: {
          where: {
            deletedAt: null,
          },
          include: {
            equipment: true,
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', input.bookingId)
    }

    // Booking must be ACTIVE to check in
    if (booking.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot check in equipment for booking in ${booking.status} status. Booking must be ACTIVE.`
      )
    }

    // Validate all equipment IDs belong to this booking
    const bookingEquipmentIds = booking.equipment.map((be) => be.equipmentId)
    const invalidEquipment = input.equipmentIds.filter(
      (id) => !bookingEquipmentIds.includes(id)
    )

    if (invalidEquipment.length > 0) {
      throw new ValidationError(
        `Equipment ${invalidEquipment.join(', ')} is not part of this booking`
      )
    }

    // Verify equipment was checked out
    const checkOuts = await prisma.inspection.findMany({
      where: {
        bookingId: input.bookingId,
        type: 'check_out',
        equipmentId: { in: input.equipmentIds },
        deletedAt: null,
      },
    })

    if (checkOuts.length !== input.equipmentIds.length) {
      throw new ValidationError(
        'Some equipment has not been checked out yet'
      )
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create inspection records for each equipment
      const inspections = await Promise.all(
        input.equipmentIds.map((equipmentId) =>
          InspectionService.create(
            {
              bookingId: input.bookingId,
              equipmentId,
              type: 'check_in',
              checklist: input.checklist,
              notes: input.notes,
            },
            userId,
            auditContext
          )
        )
      )

      // Update equipment condition if provided
      if (input.condition) {
        await tx.equipment.updateMany({
          where: {
            id: { in: input.equipmentIds },
            deletedAt: null,
          },
          data: {
            condition: input.condition,
          },
        })
      }

      // Check if all equipment for this booking has been checked in
      const allBookingEquipment = await tx.bookingEquipment.findMany({
        where: {
          bookingId: input.bookingId,
          deletedAt: null,
        },
      })

      const allCheckIns = await tx.inspection.findMany({
        where: {
          bookingId: input.bookingId,
          type: 'check_in',
          deletedAt: null,
        },
        distinct: ['equipmentId'],
      })

      // If all equipment is checked in, transition booking to RETURNED
      if (allCheckIns.length >= allBookingEquipment.length) {
        await BookingService.transitionState(
          input.bookingId,
          'RETURNED',
          userId
        )
      }

      return inspections
    })

    // Emit event
    await EventBus.emit('warehouse.equipment.checked_in', {
      bookingId: input.bookingId,
      equipmentIds: input.equipmentIds,
      checkedInBy: userId,
      condition: input.condition,
      timestamp: new Date(),
    })

    return result
  }

  /**
   * Get warehouse inventory
   * Returns all equipment with their current status
   */
  static async getInventory(
    userId: string,
    filters: {
      warehouseLocation?: string
      condition?: EquipmentCondition
      available?: boolean
    } = {}
  ): Promise<WarehouseInventoryItem[]> {
    // Check permission
    const canView = await hasPermission(userId, 'warehouse.view' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view warehouse inventory')
    }

    const where: any = {
      deletedAt: null,
    }

    if (filters.warehouseLocation) {
      where.warehouseLocation = filters.warehouseLocation
    }

    if (filters.condition) {
      where.condition = filters.condition
    }

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        bookings: {
          where: {
            deletedAt: null,
            booking: {
              status: { in: ['CONFIRMED', 'ACTIVE'] },
              deletedAt: null,
            },
          },
          include: {
            booking: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    })

    // Transform to inventory items
    const inventory: WarehouseInventoryItem[] = equipment.map((eq) => {
      const activeBooking = eq.bookings.find(
        (be) => be.booking && (be.booking.status === 'CONFIRMED' || be.booking.status === 'ACTIVE')
      )

      return {
        equipmentId: eq.id,
        sku: eq.sku,
        model: eq.model,
        condition: eq.condition,
        warehouseLocation: eq.warehouseLocation,
        isAvailable: !activeBooking && eq.condition !== 'MAINTENANCE',
        isCheckedOut: !!activeBooking,
        currentBookingId: activeBooking?.bookingId || null,
      }
    })

    // Apply available filter
    if (filters.available !== undefined) {
      return inventory.filter((item) => item.isAvailable === filters.available)
    }

    return inventory
  }

  /**
   * Get bookings ready for check-out
   * Returns bookings in CONFIRMED status with equipment
   */
  static async getReadyForCheckOut(userId: string) {
    // Check permission
    const canView = await hasPermission(userId, 'warehouse.view' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view check-out queue')
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        equipment: {
          where: {
            deletedAt: null,
          },
          include: {
            equipment: {
              select: {
                id: true,
                sku: true,
                model: true,
                condition: true,
                warehouseLocation: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    return bookings
  }

  /**
   * Get bookings ready for check-in
   * Returns bookings in ACTIVE status with equipment
   */
  static async getReadyForCheckIn(userId: string) {
    // Check permission
    const canView = await hasPermission(userId, 'warehouse.view' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view check-in queue')
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        equipment: {
          where: {
            deletedAt: null,
          },
          include: {
            equipment: {
              select: {
                id: true,
                sku: true,
                model: true,
                condition: true,
                warehouseLocation: true,
              },
            },
          },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    })

    return bookings
  }
}
