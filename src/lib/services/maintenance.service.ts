/**
 * @file maintenance.service.ts
 * @description Service for managing equipment maintenance, health scoring, and service logs.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { EquipmentCondition, MaintenanceStatus, MaintenanceType } from '@prisma/client'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { AuditService } from '@/lib/services/audit.service'

export class MaintenanceService {
  /**
   * Get equipment health score (0-100)
   */
  static async getHealthScore(equipmentId: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { rentalCycles: true, maxCyclesBeforeService: true } as any
    })

    if (!equipment) throw new NotFoundError('Equipment', equipmentId)

    const score = Math.max(0, 100 - ((equipment as any).rentalCycles / (equipment as any).maxCyclesBeforeService) * 100)
    return Math.round(score)
  }

  /**
   * Record a completed maintenance session
   */
  static async recordService(
    equipmentId: string,
    technicianId: string,
    data: {
      description: string
      notes?: string
      cost?: number
      conditionAfter: EquipmentCondition
    }
  ) {
    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } })
    if (!equipment) throw new NotFoundError('Equipment', equipmentId)

    return prisma.$transaction(async (tx) => {
      // 1. Create maintenance record
      const maintenance = await tx.maintenance.create({
        data: {
          maintenanceNumber: `MNT-${Date.now().toString(36).toUpperCase()}`,
          equipmentId,
          type: 'REPAIR', // or SERVICE
          status: 'COMPLETED',
          scheduledDate: new Date(),
          completedDate: new Date(),
          technicianId,
          description: data.description,
          notes: data.notes,
          cost: data.cost,
          equipmentConditionBefore: equipment.condition,
          equipmentConditionAfter: data.conditionAfter,
          createdBy: technicianId
        }
      })

      // 2. Reset equipment health
      await tx.equipment.update({
        where: { id: equipmentId },
        data: {
          rentalCycles: 0,
          needsService: false,
          lastServiceDate: new Date(),
          condition: data.conditionAfter
        } as any
      })

      return maintenance
    })
  }

  /**
   * Get equipment maintenance history
   */
  static async getMaintenanceHistory(equipmentId: string) {
    return prisma.maintenance.findMany({
      where: { equipmentId, deletedAt: null },
      include: { technician: { select: { id: true, name: true } } },
      orderBy: { completedDate: 'desc' }
    })
  }

  /**
   * List maintenance records with filtering and pagination
   */
  static async list(userId: string, params: any = {}) {
    if (!(await hasPermission(userId, PERMISSIONS.MAINTENANCE_READ))) {
      throw new ForbiddenError('You do not have permission to view maintenance')
    }

    const { status, type, equipmentId, technicianId, dateFrom, dateTo, page = 1, limit = 10 } = params
    const skip = (page - 1) * limit

    const where: any = { deletedAt: null }
    if (status) where.status = status.toUpperCase()
    if (type) where.type = type.toUpperCase()
    if (equipmentId) where.equipmentId = equipmentId
    if (technicianId) where.technicianId = technicianId
    if (dateFrom || dateTo) {
      where.scheduledDate = {}
      if (dateFrom) where.scheduledDate.gte = new Date(dateFrom)
      if (dateTo) where.scheduledDate.lte = new Date(dateTo)
    }

    const [maintenance, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
        include: {
          equipment: { select: { id: true, sku: true, model: true } },
          technician: { select: { id: true, name: true } }
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.maintenance.count({ where })
    ])

    return { maintenance, total }
  }

  /**
   * Create a new maintenance record
   */
  static async create(data: any, userId: string) {
    if (!(await hasPermission(userId, PERMISSIONS.MAINTENANCE_CREATE))) {
      throw new ForbiddenError('You do not have permission to create maintenance')
    }

    const equipment = await prisma.equipment.findFirst({
      where: { id: data.equipmentId, deletedAt: null }
    })
    if (!equipment) throw new NotFoundError('Equipment', data.equipmentId)

    if (data.technicianId) {
      const tech = await prisma.user.findFirst({
        where: { id: data.technicianId, role: 'TECHNICIAN', deletedAt: null }
      })
      if (!tech) throw new NotFoundError('Technician', data.technicianId)
    }

    const maintenanceNumber = await this.generateMaintenanceNumber()

    const maintenance = await prisma.maintenance.create({
      data: {
        maintenanceNumber,
        equipmentId: data.equipmentId,
        technicianId: data.technicianId,
        type: data.type.toUpperCase(),
        status: 'SCHEDULED',
        priority: data.priority || 'MEDIUM',
        scheduledDate: new Date(data.scheduledDate),
        description: data.description,
        notes: data.notes,
        equipmentConditionBefore: equipment.condition,
        createdBy: userId
      },
      include: {
        equipment: { select: { id: true, sku: true, model: true } },
        technician: { select: { id: true, name: true } }
      }
    })

    // If equipment not already in maintenance, update it
    if (equipment.condition !== 'MAINTENANCE') {
      await prisma.equipment.update({
        where: { id: data.equipmentId },
        data: { condition: 'MAINTENANCE', updatedBy: userId }
      })
    }

    return maintenance
  }

  /**
   * Generate a unique maintenance number
   */
  private static async generateMaintenanceNumber() {
    const prefix = 'MT'
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    let num = 1
    let maintenanceNumber = `${prefix}-${date}-${num}`

    while (await prisma.maintenance.findFirst({ where: { maintenanceNumber } })) {
      num++
      maintenanceNumber = `${prefix}-${date}-${num}`
    }

    return maintenanceNumber
  }

  /**
   * Get maintenance by ID
   */
  static async getById(id: string, userId: string) {
    if (!(await hasPermission(userId, PERMISSIONS.MAINTENANCE_READ))) {
      throw new ForbiddenError('You do not have permission to view maintenance')
    }

    const maintenance = await prisma.maintenance.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipment: { select: { id: true, sku: true, model: true } },
        technician: { select: { id: true, name: true } }
      }
    })

    if (!maintenance) throw new NotFoundError('Maintenance', id)

    // Match test expectation by stripping nulls or transforming
    return {
      ...maintenance,
      equipment: maintenance.equipment || undefined
    }
  }

  /**
   * Update maintenance record
   */
  static async update(id: string, data: any, userId: string) {
    if (!(await hasPermission(userId, PERMISSIONS.MAINTENANCE_UPDATE))) {
      throw new ForbiddenError('You do not have permission to update maintenance')
    }

    const existing = await prisma.maintenance.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Maintenance', id)

    if (data.technicianId) {
      const tech = await prisma.user.findFirst({
        where: { id: data.technicianId, role: 'TECHNICIAN', deletedAt: null }
      })
      if (!tech) throw new NotFoundError('Technician', data.technicianId)
    }

    const updateData: any = {}
    if (data.type) updateData.type = data.type.toUpperCase()
    if (data.status) updateData.status = data.status.toUpperCase()
    if (data.priority) updateData.priority = data.priority
    if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate)
    if (data.completedDate) updateData.completedDate = new Date(data.completedDate)
    if (data.technicianId) updateData.technicianId = data.technicianId
    if (data.description !== undefined) updateData.description = data.description
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.cost !== undefined) updateData.cost = data.cost
    if (data.partsUsed !== undefined) updateData.partsUsed = data.partsUsed
    if (data.equipmentConditionAfter) updateData.equipmentConditionAfter = data.equipmentConditionAfter

    const maintenance = await prisma.maintenance.update({
      where: { id },
      data: { ...updateData, updatedBy: userId },
      include: {
        equipment: { select: { id: true, sku: true, model: true } },
        technician: { select: { id: true, name: true } }
      }
    })

    return maintenance
  }

  /**
   * Complete a maintenance session
   */
  static async complete(id: string, data: any, userId: string) {
    if (!(await hasPermission(userId, PERMISSIONS.MAINTENANCE_UPDATE))) {
      throw new ForbiddenError('You do not have permission to complete maintenance')
    }

    const existing = await prisma.maintenance.findFirst({
      where: { id, deletedAt: null },
      include: { equipment: true }
    })
    if (!existing) throw new NotFoundError('Maintenance', id)

    const maintenance = await prisma.maintenance.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        equipmentConditionAfter: data.equipmentConditionAfter || 'GOOD',
        notes: data.notes || existing.notes,
        cost: data.cost || existing.cost,
        updatedBy: userId
      },
      include: {
        equipment: { select: { id: true, sku: true, model: true } },
        technician: { select: { id: true, name: true } }
      }
    })

    // Update equipment health
    const newCondition = data.equipmentConditionAfter || 'GOOD'
    await prisma.equipment.update({
      where: { id: existing.equipmentId },
      data: {
        condition: newCondition,
        rentalCycles: 0,
        needsService: false,
        lastServiceDate: new Date(),
        updatedBy: userId
      }
    })

    return maintenance
  }

  /**
   * Soft-delete maintenance record
   */
  static async delete(id: string, userId: string) {
    if (!(await hasPermission(userId, PERMISSIONS.MAINTENANCE_DELETE))) {
      throw new ForbiddenError('You do not have permission to delete maintenance')
    }

    const existing = await prisma.maintenance.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Maintenance', id)

    await prisma.maintenance.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId }
    })
  }
}
