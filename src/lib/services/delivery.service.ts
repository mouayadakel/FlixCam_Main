/**
 * @file delivery.service.ts
 * @description Delivery service for scheduling, tracking, and managing equipment deliveries
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 * @updated 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { BookingService } from './booking.service'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import {
  DeliveryType as PrismaDeliveryType,
  DeliveryStatus as PrismaDeliveryStatus,
} from '@prisma/client'

export type DeliveryType = 'pickup' | 'return'
export type DeliveryStatus =
  | 'pending'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'dispatched'
  | 'failed'
  | 'cancelled'

export interface DeliveryCreateInput {
  bookingId: string
  type: DeliveryType
  scheduledDate: Date
  address: string
  city: string
  contactName: string
  contactPhone: string
  notes?: string
  driverId?: string
}

export interface DeliveryUpdateInput {
  scheduledDate?: Date
  address?: string
  city?: string
  contactName?: string
  contactPhone?: string
  notes?: string
  driverId?: string
  status?: DeliveryStatus
}

export interface DeliveryTrackingInfo {
  id: string
  bookingNumber: string
  type: DeliveryType
  status: DeliveryStatus
  scheduledDate: Date
  address: string
  city: string
  contactName: string
  contactPhone: string
  driver?: {
    id: string
    name: string | null
    email: string
  } | null
  equipment: Array<{
    id: string
    sku: string
    model: string | null
    quantity: number
  }>
  createdAt: Date
  updatedAt: Date
}

/**
 * Delivery Service
 * Uses the Delivery model for proper data storage.
 */
export class DeliveryService {
  private static async generateDeliveryNumber(): Promise<string> {
    const prefix = 'DLV'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const deliveryNumber = `${prefix}-${timestamp}-${random}`

    const existing = await prisma.delivery.findFirst({
      where: { deliveryNumber, deletedAt: null },
    })
    if (existing) return this.generateDeliveryNumber()
    return deliveryNumber
  }

  private static mapDeliveryType(type: DeliveryType): PrismaDeliveryType {
    return type === 'pickup' ? 'PICKUP' : 'RETURN'
  }

  private static mapFromPrismaType(type: PrismaDeliveryType): DeliveryType {
    return type.toLowerCase() as DeliveryType
  }

  private static mapDeliveryStatus(status: DeliveryStatus): PrismaDeliveryStatus {
    const m: Record<DeliveryStatus, PrismaDeliveryStatus> = {
      pending: 'PENDING',
      scheduled: 'SCHEDULED',
      in_transit: 'IN_TRANSIT',
      delivered: 'DELIVERED',
      dispatched: 'DISPATCHED' as any,
      failed: 'FAILED',
      cancelled: 'CANCELLED',
    }
    return m[status] ?? 'PENDING'
  }

  private static mapFromPrismaStatus(status: PrismaDeliveryStatus): DeliveryStatus {
    return status.toLowerCase().replace('_', '_') as DeliveryStatus // IN_TRANSIT -> in_transit
  }

  static async scheduleDelivery(
    input: DeliveryCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    const canSchedule = await hasPermission(userId, PERMISSIONS.DELIVERY_MANAGE)
    if (!canSchedule) {
      throw new ForbiddenError('You do not have permission to schedule deliveries')
    }

    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, deletedAt: null },
      include: {
        equipment: {
          where: { deletedAt: null },
          include: {
            equipment: {
              select: { id: true, sku: true, model: true },
            },
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', input.bookingId)
    }

    if (input.type === 'pickup' && booking.status !== 'CONFIRMED' && booking.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot schedule pickup delivery for booking in ${booking.status} status`
      )
    }
    if (input.type === 'return' && booking.status !== 'ACTIVE' && booking.status !== 'RETURNED') {
      throw new ValidationError(
        `Cannot schedule return delivery for booking in ${booking.status} status`
      )
    }

    if (input.driverId) {
      const driver = await prisma.user.findFirst({
        where: { id: input.driverId, deletedAt: null },
      })
      if (!driver) throw new NotFoundError('Driver', input.driverId)
    }

    const deliveryNumber = await this.generateDeliveryNumber()

    const delivery = await prisma.delivery.create({
      data: {
        deliveryNumber,
        bookingId: input.bookingId,
        type: this.mapDeliveryType(input.type),
        status: 'SCHEDULED',
        scheduledDate: input.scheduledDate,
        address: input.address,
        city: input.city,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        driverId: input.driverId ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
      },
    })

    await AuditService.log({
      action: 'delivery.scheduled',
      userId,
      resourceType: 'delivery',
      resourceId: delivery.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { type: input.type, scheduledDate: input.scheduledDate, driverId: input.driverId },
    })

    await EventBus.emit('delivery.scheduled', {
      bookingId: input.bookingId,
      deliveryId: delivery.id,
      type: input.type,
      scheduledDate: input.scheduledDate,
      scheduledBy: userId,
      timestamp: new Date(),
    })

    return prisma.booking.findFirst({
      where: { id: input.bookingId },
      include: {
        deliveries: true,
        equipment: {
          include: { equipment: true },
        },
      },
    })
  }

  static async updateDelivery(
    bookingId: string,
    input: DeliveryUpdateInput & { deliveryId?: string },
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    const canUpdate = await hasPermission(userId, PERMISSIONS.DELIVERY_UPDATE_STATUS)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update deliveries')
    }

    let delivery = null
    if (input.deliveryId) {
      delivery = await prisma.delivery.findFirst({
        where: { id: input.deliveryId, bookingId, deletedAt: null },
      })
    } else {
      delivery = await prisma.delivery.findFirst({
        where: { bookingId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })
    }

    if (!delivery) {
      throw new NotFoundError('Delivery', input.deliveryId ?? bookingId)
    }

    const deliveryId = delivery.id

    if (input.driverId) {
      const driver = await prisma.user.findFirst({
        where: { id: input.driverId, deletedAt: null },
      })
      if (!driver) throw new NotFoundError('Driver', input.driverId)
    }

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        scheduledDate: input.scheduledDate,
        address: input.address,
        city: input.city,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        notes: input.notes !== undefined ? input.notes : undefined,
        driverId: input.driverId,
        status: input.status ? this.mapDeliveryStatus(input.status) : undefined,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'delivery.updated',
      userId,
      resourceType: 'delivery',
      resourceId: deliveryId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    return prisma.booking.findFirst({
      where: { id: bookingId },
      include: { deliveries: true },
    })
  }

  static async updateDeliveryStatus(
    bookingId: string,
    status: DeliveryStatus,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string },
    deliveryIdParam?: string
  ) {
    const canUpdate = await hasPermission(userId, PERMISSIONS.DELIVERY_UPDATE_STATUS)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update delivery status')
    }

    let delivery = null
    if (deliveryIdParam) {
      delivery = await prisma.delivery.findFirst({
        where: { id: deliveryIdParam, bookingId, deletedAt: null },
        include: { booking: true },
      })
    } else {
      delivery = await prisma.delivery.findFirst({
        where: { bookingId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: { booking: true },
      })
    }

    if (!delivery) {
      throw new NotFoundError('Delivery', deliveryIdParam ?? bookingId)
    }

    const deliveryId = delivery.id

    const updateData: any = {
      status: this.mapDeliveryStatus(status),
      updatedBy: userId,
    }
    if (status === 'delivered') {
      updateData.deliveredDate = new Date()
    }

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
    })

    if (status === 'delivered') {
      const type = this.mapFromPrismaType(delivery.type)
      if (type === 'pickup' && delivery.booking.status === 'CONFIRMED') {
        await BookingService.transitionState(delivery.bookingId, 'ACTIVE', userId)
      }
      if (type === 'return' && delivery.booking.status === 'ACTIVE') {
        await BookingService.transitionState(delivery.bookingId, 'RETURNED', userId)
      }
    }

    await AuditService.log({
      action: 'delivery.status_updated',
      userId,
      resourceType: 'delivery',
      resourceId: deliveryId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { status },
    })

    await EventBus.emit('delivery.status_updated', {
      deliveryId,
      bookingId: delivery.bookingId,
      status,
      updatedBy: userId,
      timestamp: new Date(),
    })

    return prisma.delivery.findFirst({
      where: { id: deliveryId },
      include: { booking: true, driver: true },
    })
  }

  static async getDeliveriesByBooking(
    bookingId: string,
    userId: string
  ): Promise<DeliveryTrackingInfo[]> {
    const canView = await hasPermission(userId, PERMISSIONS.DELIVERY_READ)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view deliveries')
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        deliveries: {
          where: { deletedAt: null },
          include: { driver: { select: { id: true, name: true, email: true } } },
        },
        equipment: {
          where: { deletedAt: null },
          include: {
            equipment: { select: { id: true, sku: true, model: true } },
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', bookingId)
    }

    return booking.deliveries.map((d) => ({
      id: d.id,
      bookingNumber: booking.bookingNumber,
      type: this.mapFromPrismaType(d.type),
      status: this.mapFromPrismaStatus(d.status),
      scheduledDate: d.scheduledDate,
      address: d.address,
      city: d.city,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      driver: d.driver ?? null,
      equipment: booking.equipment.map((be) => ({
        id: be.equipment.id,
        sku: be.equipment.sku,
        model: be.equipment.model,
        quantity: be.quantity,
      })),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  }

  static async getPendingDeliveries(
    userId: string,
    filters: {
      type?: DeliveryType
      driverId?: string
      dateFrom?: Date
      dateTo?: Date
    } = {}
  ) {
    const canView = await hasPermission(userId, PERMISSIONS.DELIVERY_READ)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view deliveries')
    }

    const where: any = {
      deletedAt: null,
      status: { in: ['PENDING', 'SCHEDULED', 'IN_TRANSIT'] },
    }
    if (filters.type) where.type = this.mapDeliveryType(filters.type)
    if (filters.driverId) where.driverId = filters.driverId
    if (filters.dateFrom || filters.dateTo) {
      where.scheduledDate = {}
      if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom
      if (filters.dateTo) where.scheduledDate.lte = filters.dateTo
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        booking: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            equipment: {
              where: { deletedAt: null },
              include: {
                equipment: { select: { id: true, sku: true, model: true } },
              },
            },
          },
        },
        driver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    return deliveries.map((d) => ({
      id: d.id,
      bookingId: d.bookingId,
      deliveryNumber: d.deliveryNumber,
      bookingNumber: d.booking.bookingNumber,
      type: this.mapFromPrismaType(d.type),
      status: this.mapFromPrismaStatus(d.status),
      scheduledDate: d.scheduledDate,
      address: d.address,
      city: d.city,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      notes: d.notes,
      driver: d.driver,
      equipment: d.booking.equipment.map((be) => ({
        id: be.equipment.id,
        sku: be.equipment.sku,
        model: be.equipment.model,
        quantity: be.quantity,
      })),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  }

  static async getDriverDeliveries(
    driverId: string,
    userId: string,
    filters: {
      status?: DeliveryStatus
      dateFrom?: Date
      dateTo?: Date
    } = {}
  ) {
    const canView = await hasPermission(userId, PERMISSIONS.DELIVERY_READ)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view deliveries')
    }

    const where: any = { driverId, deletedAt: null }
    if (filters.status) where.status = this.mapDeliveryStatus(filters.status)
    if (filters.dateFrom || filters.dateTo) {
      where.scheduledDate = {}
      if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom
      if (filters.dateTo) where.scheduledDate.lte = filters.dateTo
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        booking: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            equipment: {
              include: { equipment: { select: { id: true, sku: true, model: true } } },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    return deliveries.map((d) => ({
      id: d.id,
      deliveryNumber: d.deliveryNumber,
      bookingNumber: d.booking.bookingNumber,
      type: this.mapFromPrismaType(d.type),
      status: this.mapFromPrismaStatus(d.status),
      scheduledDate: d.scheduledDate,
      address: d.address,
      city: d.city,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      equipment: d.booking.equipment.map((be) => ({
        id: be.equipment.id,
        sku: be.equipment.sku,
        model: be.equipment.model,
        quantity: be.quantity,
      })),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  }

  static async updateDriverLocation(
    deliveryId: string,
    lat: number,
    lng: number,
    userId: string
  ) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, driverId: userId, deletedAt: null },
    })

    if (!delivery) throw new NotFoundError('Delivery', deliveryId)

    return (prisma as any).delivery.update({
      where: { id: deliveryId },
      data: {
        currentLat: lat,
        currentLng: lng,
        lastLocationAt: new Date(),
      },
    })
  }

  static async getTrackingInfo(deliveryId: string) {
    const delivery = await (prisma as any).delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            deliveryAddress: true,
            deliveryLat: true,
            deliveryLng: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!delivery) throw new NotFoundError('Delivery', deliveryId)

    return {
      id: delivery.id,
      deliveryNumber: delivery.deliveryNumber,
      status: this.mapFromPrismaStatus(delivery.status),
      currentLocation: (delivery as any).currentLat ? { lat: (delivery as any).currentLat, lng: (delivery as any).currentLng } : null,
      destination: {
        address: delivery.booking.deliveryAddress,
        lat: delivery.booking.deliveryLat,
        lng: delivery.booking.deliveryLng,
      },
      driver: delivery.driver,
      lastUpdate: (delivery as any).lastLocationAt,
    }
  }
}
