/**
 * @file inspection.service.ts
 * @description Inspection service with basic checklist for check-in/check-out
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'

export type InspectionType = 'check_in' | 'check_out'

export interface InspectionChecklistItem {
  item: string
  status: 'ok' | 'damaged' | 'missing' | 'needs_repair'
  notes?: string
}

export interface InspectionInput {
  bookingId: string
  equipmentId?: string
  type: InspectionType
  checklist: InspectionChecklistItem[]
  notes?: string
}

export class InspectionService {
  /**
   * Create inspection record
   */
  static async create(
    input: InspectionInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission (using equipment permission for now)
    const canEdit = await hasPermission(userId, 'equipment.update' as any)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to create inspections')
    }

    // Validate booking exists
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        deletedAt: null,
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', input.bookingId)
    }

    // Validate equipment if provided
    if (input.equipmentId) {
      const equipment = await prisma.equipment.findFirst({
        where: {
          id: input.equipmentId,
          deletedAt: null,
        },
      })

      if (!equipment) {
        throw new NotFoundError('Equipment', input.equipmentId)
      }

      // Verify equipment is part of booking
      const bookingEquipment = await prisma.bookingEquipment.findFirst({
        where: {
          bookingId: input.bookingId,
          equipmentId: input.equipmentId,
          deletedAt: null,
        },
      })

      if (!bookingEquipment) {
        throw new ValidationError('Equipment is not part of this booking')
      }
    }

    // Validate checklist
    if (!input.checklist || input.checklist.length === 0) {
      throw new ValidationError('Checklist cannot be empty')
    }

    // Create inspection
    const inspection = await prisma.inspection.create({
      data: {
        bookingId: input.bookingId,
        equipmentId: input.equipmentId,
        type: input.type,
        checklist: input.checklist as any,
        notes: input.notes,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
        equipment: {
          select: {
            id: true,
            sku: true,
            model: true,
          },
        },
      },
    })

    // Audit log
    await AuditService.log({
      action: `inspection.${input.type}.created`,
      userId,
      resourceType: 'inspection',
      resourceId: inspection.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        bookingId: input.bookingId,
        equipmentId: input.equipmentId,
        type: input.type,
      },
    })

    return inspection
  }

  /**
   * Get inspection by ID
   */
  static async getById(id: string, userId: string) {
    // Check permission
    const canView = await hasPermission(userId, 'equipment.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view inspections')
    }

    const inspection = await prisma.inspection.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
          },
        },
        equipment: {
          select: {
            id: true,
            sku: true,
            model: true,
          },
        },
      },
    })

    if (!inspection) {
      throw new NotFoundError('Inspection', id)
    }

    return inspection
  }

  /**
   * List inspections for a booking
   */
  static async listByBooking(
    bookingId: string,
    userId: string,
    filters: {
      type?: InspectionType
      equipmentId?: string
    } = {}
  ) {
    // Check permission
    const canView = await hasPermission(userId, 'equipment.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view inspections')
    }

    const where: any = {
      bookingId,
      deletedAt: null,
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.equipmentId) {
      where.equipmentId = filters.equipmentId
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            sku: true,
            model: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return inspections
  }

  /**
   * Update inspection
   */
  static async update(
    id: string,
    input: Partial<Pick<InspectionInput, 'checklist' | 'notes'>>,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canEdit = await hasPermission(userId, 'equipment.update' as any)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to edit inspections')
    }

    const inspection = await prisma.inspection.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!inspection) {
      throw new NotFoundError('Inspection', id)
    }

    // Update inspection
    const updated = await prisma.inspection.update({
      where: { id },
      data: {
        checklist: input.checklist as any,
        notes: input.notes,
        updatedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'inspection.updated',
      userId,
      resourceType: 'inspection',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    return updated
  }

  /**
   * Delete inspection (soft delete)
   */
  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canEdit = await hasPermission(userId, 'equipment.update' as any)
    if (!canEdit) {
      throw new ForbiddenError('You do not have permission to delete inspections')
    }

    const inspection = await prisma.inspection.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!inspection) {
      throw new NotFoundError('Inspection', id)
    }

    // Soft delete
    await prisma.inspection.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'inspection.deleted',
      userId,
      resourceType: 'inspection',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })
  }
}
