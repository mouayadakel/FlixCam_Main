/**
 * @file client.service.ts
 * @description Client service for client management
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
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
import { UserRole } from '@prisma/client'
import { hashPassword } from '@/lib/auth/auth-helpers'
import type {
  Client,
  ClientStatus,
  ClientCreateInput,
  ClientUpdateInput,
} from '@/lib/types/client.types'

/**
 * Client Service
 * 
 * Manages client users (users with DATA_ENTRY role or other client roles)
 */
export class ClientService {
  /**
   * Create new client
   */
  static async create(
    input: ClientCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Client> {
    // Check permission
    const canCreate = await hasPermission(userId, 'client.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create clients')
    }

    // Check if email already exists
    const existing = await prisma.user.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
      },
    })

    if (existing) {
      throw new ValidationError('Email already exists')
    }

    // Hash password
    const passwordHash = await hashPassword(input.password)

    // Create user with client role (default: DATA_ENTRY)
    const role = input.role || UserRole.DATA_ENTRY
    const status = input.status || 'active'

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name || null,
        phone: input.phone || null,
        role,
        status,
        createdBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'client.created',
      userId,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        email: input.email,
        role,
      },
    })

    // Emit event
    await EventBus.emit('client.created', {
      clientId: user.id,
      email: input.email,
      createdBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToClient(user)
  }

  /**
   * Get client by ID
   */
  static async getById(id: string, userId: string): Promise<Client> {
    // Check permission
    const canView = await hasPermission(userId, 'client.view' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view clients')
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!user) {
      throw new NotFoundError('Client', id)
    }

    // Get statistics
    const stats = await this.getClientStatistics(id)

    return {
      ...this.transformToClient(user),
      ...stats,
    }
  }

  /**
   * List clients with filters
   */
  static async list(
    userId: string,
    filters: {
      status?: ClientStatus
      role?: UserRole
      search?: string
      dateFrom?: Date
      dateTo?: Date
      hasBookings?: boolean
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ clients: Client[]; total: number; page: number; pageSize: number }> {
    // Check permission
    const canView = await hasPermission(userId, 'client.view' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view clients')
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.role) {
      where.role = filters.role
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    // Get statistics for all clients
    const clientsWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await this.getClientStatistics(user.id)
        return {
          ...this.transformToClient(user),
          ...stats,
        }
      })
    )

    // Filter by hasBookings if specified
    let filteredClients = clientsWithStats
    if (filters.hasBookings !== undefined) {
      filteredClients = filteredClients.filter(
        (client) => (client.totalBookings || 0) > 0 === filters.hasBookings
      )
    }

    return {
      clients: filteredClients,
      total: filteredClients.length,
      page,
      pageSize,
    }
  }

  /**
   * Update client
   */
  static async update(
    id: string,
    input: ClientUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Client> {
    // Check permission
    const canUpdate = await hasPermission(userId, 'client.update' as any)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update clients')
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!user) {
      throw new NotFoundError('Client', id)
    }

    const updateData: any = {
      updatedBy: userId,
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.status !== undefined) updateData.status = input.status
    if (input.role !== undefined) updateData.role = input.role

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    // Audit log
    await AuditService.log({
      action: 'client.updated',
      userId,
      resourceType: 'user',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        changes: Object.keys(updateData),
      },
    })

    // Emit event
    await EventBus.emit('client.updated', {
      clientId: id,
      updatedBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToClient(updated)
  }

  /**
   * Delete client (soft delete)
   */
  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Check permission
    const canDelete = await hasPermission(userId, 'client.delete' as any)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete clients')
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!user) {
      throw new NotFoundError('Client', id)
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        updatedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'client.deleted',
      userId,
      resourceType: 'user',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    // Emit event
    await EventBus.emit('client.deleted', {
      clientId: id,
      deletedBy: userId,
      timestamp: new Date(),
    } as any)
  }

  /**
   * Get client statistics
   */
  private static async getClientStatistics(clientId: string): Promise<{
    totalBookings: number
    totalSpent: number
    lastBookingDate: Date | null
  }> {
    const bookings = await prisma.booking.findMany({
      where: {
        customerId: clientId,
        deletedAt: null,
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const totalBookings = bookings.length
    const totalSpent = bookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount),
      0
    )
    const lastBookingDate = bookings.length > 0 ? bookings[0].createdAt : null

    return {
      totalBookings,
      totalSpent,
      lastBookingDate,
    }
  }

  /**
   * Transform Prisma user to Client type
   */
  private static transformToClient(user: any): Client {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status as ClientStatus,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
