/**
 * @file studio.service.ts
 * @description Studio service with flexible booking, buffer calculation, and blackout dates
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import { Decimal } from '@prisma/client/runtime/library'

export interface StudioInput {
  name: string
  slug: string
  description?: string
  capacity?: number
  hourlyRate: number
  setupBuffer?: number // minutes
  cleaningBuffer?: number // minutes
  resetTime?: number // minutes
  isActive?: boolean
}

export interface StudioCreateInput extends StudioInput {
  mediaIds?: string[]
  addOns?: StudioAddOnInput[]
}

export interface StudioUpdateInput extends Partial<StudioInput> {
  mediaIds?: string[]
  addOns?: StudioAddOnInput[]
}

export interface StudioAddOnInput {
  name: string
  description?: string
  price: number
  isActive?: boolean
}

export interface StudioBlackoutDateInput {
  startDate: Date
  endDate: Date
  reason?: string
}

export interface StudioAvailabilityCheck {
  studioId: string
  startTime: Date
  endTime: Date
}

export class StudioService {
  /**
   * Create new studio
   */
  static async create(
    input: StudioCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission (using equipment permission for now, can add studio-specific later)
    const canCreate = await hasPermission(userId, 'equipment.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create studios')
    }

    // Validate slug uniqueness
    const existing = await prisma.studio.findFirst({
      where: {
        slug: input.slug,
        deletedAt: null,
      },
    })

    if (existing) {
      throw new ValidationError('Slug already exists', {
        slug: ['Slug must be unique'],
      })
    }

    // Validate buffers
    if (input.setupBuffer && input.setupBuffer < 0) {
      throw new ValidationError('Setup buffer cannot be negative')
    }

    if (input.cleaningBuffer && input.cleaningBuffer < 0) {
      throw new ValidationError('Cleaning buffer cannot be negative')
    }

    if (input.resetTime && input.resetTime < 0) {
      throw new ValidationError('Reset time cannot be negative')
    }

    // Create studio
    const studio = await prisma.studio.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        capacity: input.capacity,
        hourlyRate: new Decimal(input.hourlyRate),
        setupBuffer: input.setupBuffer ?? 30,
        cleaningBuffer: input.cleaningBuffer ?? 30,
        resetTime: input.resetTime ?? 15,
        isActive: input.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        media: true,
        addOns: {
          where: {
            deletedAt: null,
          },
        },
        blackoutDates: {
          where: {
            deletedAt: null,
          },
        },
      },
    })

    // Link media if provided
    if (input.mediaIds && input.mediaIds.length > 0) {
      await prisma.media.updateMany({
        where: {
          id: { in: input.mediaIds },
        },
        data: {
          studioId: studio.id,
        },
      })
    }

    // Create add-ons if provided
    if (input.addOns && input.addOns.length > 0) {
      await Promise.all(
        input.addOns.map((addOn) =>
          prisma.studioAddOn.create({
            data: {
              studioId: studio.id,
              name: addOn.name,
              description: addOn.description,
              price: new Decimal(addOn.price),
              isActive: addOn.isActive ?? true,
              createdBy: userId,
              updatedBy: userId,
            },
          })
        )
      )
    }

    // Audit log
    await AuditService.log({
      action: 'studio.created',
      userId,
      resourceType: 'studio',
      resourceId: studio.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { slug: studio.slug, name: studio.name },
    })

    return this.getById(studio.id, userId)
  }

  /**
   * Update studio
   */
  static async update(
    id: string,
    input: StudioUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canEdit = await hasPermission(userId, 'equipment.update' as any)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to edit studios')
    }

    // Find studio
    const studio = await prisma.studio.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!studio) {
      throw new NotFoundError('Studio', id)
    }

    // Validate slug uniqueness if changing
    if (input.slug && input.slug !== studio.slug) {
      const existing = await prisma.studio.findFirst({
        where: {
          slug: input.slug,
          deletedAt: null,
          id: { not: id },
        },
      })

      if (existing) {
        throw new ValidationError('Slug already exists', {
          slug: ['Slug must be unique'],
        })
      }
    }

    // Validate buffers
    if (input.setupBuffer !== undefined && input.setupBuffer < 0) {
      throw new ValidationError('Setup buffer cannot be negative')
    }

    if (input.cleaningBuffer !== undefined && input.cleaningBuffer < 0) {
      throw new ValidationError('Cleaning buffer cannot be negative')
    }

    if (input.resetTime !== undefined && input.resetTime < 0) {
      throw new ValidationError('Reset time cannot be negative')
    }

    // Update studio
    const updated = await prisma.studio.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        capacity: input.capacity,
        hourlyRate: input.hourlyRate ? new Decimal(input.hourlyRate) : undefined,
        setupBuffer: input.setupBuffer,
        cleaningBuffer: input.cleaningBuffer,
        resetTime: input.resetTime,
        isActive: input.isActive,
        updatedBy: userId,
      },
      include: {
        media: {
          where: {
            deletedAt: null,
          },
        },
        addOns: {
          where: {
            deletedAt: null,
          },
        },
        blackoutDates: {
          where: {
            deletedAt: null,
          },
        },
      },
    })

    // Update media if provided
    if (input.mediaIds) {
      // Unlink all current media
      await prisma.media.updateMany({
        where: {
          studioId: id,
        },
        data: {
          studioId: null,
        },
      })

      // Link new media
      if (input.mediaIds.length > 0) {
        await prisma.media.updateMany({
          where: {
            id: { in: input.mediaIds },
          },
          data: {
            studioId: id,
          },
        })
      }
    }

    // Update add-ons if provided
    if (input.addOns) {
      // Soft delete all existing add-ons
      await prisma.studioAddOn.updateMany({
        where: {
          studioId: id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      })

      // Create new add-ons
      if (input.addOns.length > 0) {
        await Promise.all(
          input.addOns.map((addOn) =>
            prisma.studioAddOn.create({
              data: {
                studioId: id,
                name: addOn.name,
                description: addOn.description,
                price: new Decimal(addOn.price),
                isActive: addOn.isActive ?? true,
                createdBy: userId,
                updatedBy: userId,
              },
            })
          )
        )
      }
    }

    // Audit log
    await AuditService.log({
      action: 'studio.updated',
      userId,
      resourceType: 'studio',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { slug: updated.slug },
    })

    return this.getById(id, userId)
  }

  /**
   * Get studio by ID
   */
  static async getById(id: string, userId: string) {
    // Check permission
    const canView = await hasPermission(userId, 'equipment.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view studios')
    }

    const studio = await prisma.studio.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        media: {
          where: {
            deletedAt: null,
          },
        },
        addOns: {
          where: {
            deletedAt: null,
            isActive: true,
          },
        },
        blackoutDates: {
          where: {
            deletedAt: null,
          },
        },
      },
    })

    if (!studio) {
      throw new NotFoundError('Studio', id)
    }

    return studio
  }

  /**
   * List studios with filters
   */
  static async list(
    userId: string,
    filters: {
      isActive?: boolean
      search?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    // Check permission
    const canView = await hasPermission(userId, 'equipment.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view studios')
    }

    const where: any = {
      deletedAt: null,
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [studios, total] = await Promise.all([
      prisma.studio.findMany({
        where,
        include: {
          media: {
            where: {
              deletedAt: null,
            },
            take: 1, // Just get first image for list
          },
          addOns: {
            where: {
              deletedAt: null,
              isActive: true,
            },
            take: 5,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      prisma.studio.count({ where }),
    ])

    return {
      data: studios,
      total,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    }
  }

  /**
   * Delete studio (soft delete)
   */
  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canDelete = await hasPermission(userId, 'equipment.delete' as any)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete studios')
    }

    const studio = await prisma.studio.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!studio) {
      throw new NotFoundError('Studio', id)
    }

    // Check if studio has active bookings
    const activeBookings = await prisma.booking.findFirst({
      where: {
        studioId: id,
        status: {
          in: ['DRAFT', 'RISK_CHECK', 'PAYMENT_PENDING', 'CONFIRMED', 'ACTIVE'],
        },
        deletedAt: null,
      },
    })

    if (activeBookings) {
      throw new ValidationError(
        'Cannot delete studio that has active bookings'
      )
    }

    // Soft delete
    await prisma.studio.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        isActive: false, // Also deactivate
      },
    })

    // Audit log
    await AuditService.log({
      action: 'studio.deleted',
      userId,
      resourceType: 'studio',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { slug: studio.slug },
    })
  }

  /**
   * Check studio availability with buffer calculation
   */
  static async checkAvailability(
    check: StudioAvailabilityCheck
  ): Promise<{
    available: boolean
    conflicts: any[]
    effectiveStartTime: Date
    effectiveEndTime: Date
  }> {
    const studio = await prisma.studio.findFirst({
      where: {
        id: check.studioId,
        deletedAt: null,
        isActive: true,
      },
    })

    if (!studio) {
      return {
        available: false,
        conflicts: [],
        effectiveStartTime: check.startTime,
        effectiveEndTime: check.endTime,
      }
    }

    // Calculate effective times with buffers
    // Setup buffer before start, cleaning buffer after end, reset time between bookings
    const effectiveStartTime = new Date(check.startTime)
    effectiveStartTime.setMinutes(
      effectiveStartTime.getMinutes() - studio.setupBuffer
    )

    const effectiveEndTime = new Date(check.endTime)
    effectiveEndTime.setMinutes(
      effectiveEndTime.getMinutes() + studio.cleaningBuffer + studio.resetTime
    )

    // Check blackout dates
    const blackoutConflict = await prisma.studioBlackoutDate.findFirst({
      where: {
        studioId: check.studioId,
        deletedAt: null,
        OR: [
          {
            AND: [
              { startDate: { lte: effectiveEndTime } },
              { endDate: { gte: effectiveStartTime } },
            ],
          },
        ],
      },
    })

    if (blackoutConflict) {
      return {
        available: false,
        conflicts: [
          {
            type: 'blackout',
            startDate: blackoutConflict.startDate,
            endDate: blackoutConflict.endDate,
            reason: blackoutConflict.reason,
          },
        ],
        effectiveStartTime,
        effectiveEndTime,
      }
    }

    // Check overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        studioId: check.studioId,
        status: {
          in: ['CONFIRMED', 'ACTIVE'],
        },
        deletedAt: null,
        OR: [
          {
            AND: [
              { studioStartTime: { lte: effectiveEndTime } },
              { studioEndTime: { gte: effectiveStartTime } },
            ],
          },
        ],
      },
      select: {
        id: true,
        bookingNumber: true,
        studioStartTime: true,
        studioEndTime: true,
        status: true,
      },
    })

    if (overlappingBookings.length > 0) {
      return {
        available: false,
        conflicts: overlappingBookings.map((booking) => ({
          type: 'booking',
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          startTime: booking.studioStartTime,
          endTime: booking.studioEndTime,
          status: booking.status,
        })),
        effectiveStartTime,
        effectiveEndTime,
      }
    }

    return {
      available: true,
      conflicts: [],
      effectiveStartTime,
      effectiveEndTime,
    }
  }

  /**
   * Add blackout date
   */
  static async addBlackoutDate(
    studioId: string,
    input: StudioBlackoutDateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canEdit = await hasPermission(userId, 'equipment.update' as any)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to edit studios')
    }

    const studio = await prisma.studio.findFirst({
      where: {
        id: studioId,
        deletedAt: null,
      },
    })

    if (!studio) {
      throw new NotFoundError('Studio', studioId)
    }

    if (input.endDate <= input.startDate) {
      throw new ValidationError('End date must be after start date')
    }

    // Check for conflicts with existing bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        studioId,
        status: {
          in: ['CONFIRMED', 'ACTIVE'],
        },
        deletedAt: null,
        OR: [
          {
            AND: [
              { studioStartTime: { lte: input.endDate } },
              { studioEndTime: { gte: input.startDate } },
            ],
          },
        ],
      },
    })

    if (conflictingBooking) {
      throw new ValidationError(
        'Blackout date conflicts with an existing booking'
      )
    }

    const blackoutDate = await prisma.studioBlackoutDate.create({
      data: {
        studioId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'studio.blackout_added',
      userId,
      resourceType: 'studio',
      resourceId: studioId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        blackoutId: blackoutDate.id,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    })

    return blackoutDate
  }

  /**
   * Remove blackout date
   */
  static async removeBlackoutDate(
    blackoutDateId: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canEdit = await hasPermission(userId, 'equipment.update' as any)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to edit studios')
    }

    const blackoutDate = await prisma.studioBlackoutDate.findFirst({
      where: {
        id: blackoutDateId,
        deletedAt: null,
      },
    })

    if (!blackoutDate) {
      throw new NotFoundError('Blackout date', blackoutDateId)
    }

    // Soft delete
    await prisma.studioBlackoutDate.update({
      where: { id: blackoutDateId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'studio.blackout_removed',
      userId,
      resourceType: 'studio',
      resourceId: blackoutDate.studioId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        blackoutId: blackoutDateId,
      },
    })
  }

  /**
   * Calculate booking duration in hours (including buffers)
   */
  static async calculateBookingDuration(
    studioId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    const studio = await prisma.studio.findFirst({
      where: {
        id: studioId,
        deletedAt: null,
      },
    })

    if (!studio) {
      throw new NotFoundError('Studio', studioId)
    }

    // Calculate total duration including buffers
    const totalMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60) +
      studio.setupBuffer +
      studio.cleaningBuffer +
      studio.resetTime

    return totalMinutes / 60 // Convert to hours
  }
}
