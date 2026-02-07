/**
 * @file maintenance.service.ts
 * @description Maintenance service for equipment maintenance management
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 * @updated 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { EventBus } from '@/lib/events/event-bus'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import type {
  Maintenance,
  MaintenanceStatus,
  MaintenanceType,
  MaintenancePriority,
  MaintenanceCreateInput,
  MaintenanceUpdateInput,
  MaintenanceCompleteInput,
} from '@/lib/types/maintenance.types'
import { Prisma, EquipmentCondition, MaintenanceType as PrismaMaintenanceType, MaintenanceStatus as PrismaMaintenanceStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Maintenance Service
 * 
 * Uses the Maintenance model for proper data storage
 */
export class MaintenanceService {
  /**
   * Generate unique maintenance number
   */
  private static async generateMaintenanceNumber(): Promise<string> {
    const prefix = 'MT'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const maintenanceNumber = `${prefix}-${timestamp}-${random}`

    // Check uniqueness
    const existing = await prisma.maintenance.findFirst({
      where: {
        maintenanceNumber,
        deletedAt: null,
      },
    })

    if (existing) {
      // Retry with different random
      return this.generateMaintenanceNumber()
    }

    return maintenanceNumber
  }

  /**
   * Map TypeScript MaintenanceType to Prisma MaintenanceType
   */
  private static mapMaintenanceType(type: MaintenanceType): PrismaMaintenanceType {
    const typeMap: Record<MaintenanceType, PrismaMaintenanceType> = {
      preventive: 'PREVENTIVE',
      corrective: 'CORRECTIVE',
      inspection: 'INSPECTION',
      repair: 'REPAIR',
      calibration: 'CALIBRATION',
    }
    return typeMap[type] || 'PREVENTIVE'
  }

  /**
   * Map Prisma MaintenanceType to TypeScript MaintenanceType
   */
  private static mapFromPrismaType(type: PrismaMaintenanceType): MaintenanceType {
    return type.toLowerCase() as MaintenanceType
  }

  /**
   * Map TypeScript MaintenanceStatus to Prisma MaintenanceStatus
   */
  private static mapMaintenanceStatus(status: MaintenanceStatus): PrismaMaintenanceStatus {
    const statusMap: Record<MaintenanceStatus, PrismaMaintenanceStatus> = {
      scheduled: 'SCHEDULED',
      in_progress: 'IN_PROGRESS',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
      overdue: 'OVERDUE',
    }
    return statusMap[status] || 'SCHEDULED'
  }

  /**
   * Map Prisma MaintenanceStatus to TypeScript MaintenanceStatus
   */
  private static mapFromPrismaStatus(status: PrismaMaintenanceStatus): MaintenanceStatus {
    return status.toLowerCase().replace('_', '_') as MaintenanceStatus
  }

  /**
   * Create a new maintenance request
   */
  static async create(
    input: MaintenanceCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Maintenance> {
    // Check permission
    const canCreate = await hasPermission(userId, 'maintenance.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create maintenance requests')
    }

    // Validate equipment exists
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: input.equipmentId,
        deletedAt: null,
      },
    })

    if (!equipment) {
      throw new NotFoundError('Equipment', input.equipmentId)
    }

    // Validate technician if provided
    if (input.technicianId) {
      const technician = await prisma.user.findFirst({
        where: {
          id: input.technicianId,
          role: 'TECHNICIAN',
          deletedAt: null,
        },
      })

      if (!technician) {
        throw new NotFoundError('Technician', input.technicianId)
      }
    }

    // Generate maintenance number
    const maintenanceNumber = await this.generateMaintenanceNumber()

    // Get current equipment condition
    const equipmentConditionBefore = equipment.condition

    // Create maintenance record
    const maintenance = await prisma.maintenance.create({
      data: {
        maintenanceNumber,
        equipmentId: input.equipmentId,
        type: this.mapMaintenanceType(input.type),
        status: 'SCHEDULED',
        priority: input.priority || 'medium',
        scheduledDate: input.scheduledDate,
        technicianId: input.technicianId || null,
        description: input.description,
        notes: input.notes || null,
        equipmentConditionBefore,
        createdBy: userId,
      },
      include: {
        equipment: {
          include: {
            category: true,
            brand: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update equipment condition to MAINTENANCE if not already
    if (equipment.condition !== 'MAINTENANCE') {
      await prisma.equipment.update({
        where: { id: input.equipmentId },
        data: {
          condition: 'MAINTENANCE',
          updatedBy: userId,
        },
      })
    }

    // Audit log
    await AuditService.log({
      action: 'maintenance.created',
      userId,
      resourceType: 'maintenance',
      resourceId: maintenance.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        maintenanceNumber,
        equipmentId: input.equipmentId,
      },
    })

    // Emit event
    await EventBus.emit('maintenance.created', {
      maintenanceId: maintenance.id,
      equipmentId: input.equipmentId,
      scheduledDate: input.scheduledDate,
      createdBy: userId,
      timestamp: new Date(),
    } as any)

    // Transform to Maintenance type
    return this.transformToMaintenance(maintenance)
  }

  /**
   * Get maintenance by ID
   */
  static async getById(id: string, userId: string): Promise<Maintenance> {
    // Check permission
    const canView = await hasPermission(userId, 'maintenance.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view maintenance')
    }

    const maintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        equipment: {
          include: {
            category: true,
            brand: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!maintenance) {
      throw new NotFoundError('Maintenance', id)
    }

    return this.transformToMaintenance(maintenance)
  }

  /**
   * List maintenance records with filters
   */
  static async list(
    userId: string,
    filters: {
      status?: MaintenanceStatus
      type?: MaintenanceType
      equipmentId?: string
      technicianId?: string
      dateFrom?: Date
      dateTo?: Date
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ maintenance: Maintenance[]; total: number; page: number; pageSize: number }> {
    // Check permission
    const canView = await hasPermission(userId, 'maintenance.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view maintenance')
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
    }

    if (filters.status) {
      where.status = this.mapMaintenanceStatus(filters.status)
    }

    if (filters.type) {
      where.type = this.mapMaintenanceType(filters.type)
    }

    if (filters.equipmentId) {
      where.equipmentId = filters.equipmentId
    }

    if (filters.technicianId) {
      where.technicianId = filters.technicianId
    }

    if (filters.dateFrom || filters.dateTo) {
      where.scheduledDate = {}
      if (filters.dateFrom) {
        where.scheduledDate.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.scheduledDate.lte = filters.dateTo
      }
    }

    const [maintenanceRecords, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
        include: {
          equipment: {
            include: {
              category: true,
              brand: true,
            },
          },
          technician: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          scheduledDate: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.maintenance.count({ where }),
    ])

    return {
      maintenance: maintenanceRecords.map((m) => this.transformToMaintenance(m)),
      total,
      page,
      pageSize,
    }
  }

  /**
   * Update maintenance
   */
  static async update(
    id: string,
    input: MaintenanceUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Maintenance> {
    // Check permission
    const canUpdate = await hasPermission(userId, 'maintenance.update' as any)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update maintenance')
    }

    const existingMaintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!existingMaintenance) {
      throw new NotFoundError('Maintenance', id)
    }

    // Validate technician if provided
    if (input.technicianId) {
      const technician = await prisma.user.findFirst({
        where: {
          id: input.technicianId,
          role: 'TECHNICIAN',
          deletedAt: null,
        },
      })

      if (!technician) {
        throw new NotFoundError('Technician', input.technicianId)
      }
    }

    // Update maintenance
    const updatedMaintenance = await prisma.maintenance.update({
      where: { id },
      data: {
        type: input.type ? this.mapMaintenanceType(input.type) : undefined,
        status: input.status ? this.mapMaintenanceStatus(input.status) : undefined,
        priority: input.priority || undefined,
        scheduledDate: input.scheduledDate || undefined,
        technicianId: input.technicianId !== undefined ? input.technicianId : undefined,
        description: input.description || undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
        updatedBy: userId,
      },
      include: {
        equipment: {
          include: {
            category: true,
            brand: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Audit log
    await AuditService.log({
      action: 'maintenance.updated',
      userId,
      resourceType: 'maintenance',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    // Emit event
    await EventBus.emit('maintenance.updated', {
      maintenanceId: id,
      updatedBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToMaintenance(updatedMaintenance)
  }

  /**
   * Complete maintenance
   */
  static async complete(
    id: string,
    input: MaintenanceCompleteInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Maintenance> {
    // Check permission
    const canComplete = await hasPermission(userId, 'maintenance.complete' as any)
    if (!canComplete) {
      throw new ForbiddenError('You do not have permission to complete maintenance')
    }

    const maintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        equipment: true,
      },
    })

    if (!maintenance) {
      throw new NotFoundError('Maintenance', id)
    }

    // Update maintenance completion
    const updatedMaintenance = await prisma.maintenance.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedDate: input.completedDate || new Date(),
        notes: input.notes || maintenance.notes,
        cost: input.cost ? new Decimal(input.cost) : maintenance.cost,
        partsUsed: input.partsUsed ?? Prisma.JsonNull,
        equipmentConditionAfter: input.equipmentConditionAfter || maintenance.equipmentConditionAfter,
        updatedBy: userId,
      },
      include: {
        equipment: {
          include: {
            category: true,
            brand: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update equipment condition
    const newCondition = input.equipmentConditionAfter || maintenance.equipment.condition
    if (newCondition !== 'MAINTENANCE') {
      await prisma.equipment.update({
        where: { id: maintenance.equipmentId },
        data: {
          condition: newCondition,
          updatedBy: userId,
        },
      })
    }

    // Audit log
    await AuditService.log({
      action: 'maintenance.completed',
      userId,
      resourceType: 'maintenance',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        maintenanceNumber: maintenance.maintenanceNumber,
      },
    })

    // Emit event
    await EventBus.emit('maintenance.completed', {
      maintenanceId: id,
      equipmentId: maintenance.equipmentId,
      completedBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToMaintenance(updatedMaintenance)
  }

  /**
   * Delete maintenance (soft delete)
   */
  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Check permission
    const canDelete = await hasPermission(userId, 'maintenance.delete' as any)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete maintenance')
    }

    const maintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!maintenance) {
      throw new NotFoundError('Maintenance', id)
    }

    // Soft delete
    await prisma.maintenance.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'maintenance.deleted',
      userId,
      resourceType: 'maintenance',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        maintenanceNumber: maintenance.maintenanceNumber,
      },
    })

    // Emit event
    await EventBus.emit('maintenance.deleted', {
      maintenanceId: id,
      deletedBy: userId,
      timestamp: new Date(),
    } as any)
  }

  /**
   * Transform Prisma Maintenance to Maintenance type (helper method)
   */
  private static transformToMaintenance(maintenance: any): Maintenance {
    return {
      id: maintenance.id,
      maintenanceNumber: maintenance.maintenanceNumber,
      equipmentId: maintenance.equipmentId,
      type: this.mapFromPrismaType(maintenance.type),
      status: this.mapFromPrismaStatus(maintenance.status),
      priority: (maintenance.priority || 'medium') as MaintenancePriority,
      scheduledDate: maintenance.scheduledDate,
      completedDate: maintenance.completedDate,
      technicianId: maintenance.technicianId,
      description: maintenance.description,
      notes: maintenance.notes,
      cost: maintenance.cost ? Number(maintenance.cost) : undefined,
      partsUsed: maintenance.partsUsed as any,
      equipmentConditionBefore: maintenance.equipmentConditionBefore,
      equipmentConditionAfter: maintenance.equipmentConditionAfter,
      equipment: maintenance.equipment
        ? {
            id: maintenance.equipment.id,
            sku: maintenance.equipment.sku,
            model: maintenance.equipment.model,
          }
        : undefined,
      technician: maintenance.technician,
      createdAt: maintenance.createdAt,
      updatedAt: maintenance.updatedAt,
    }
  }
}
