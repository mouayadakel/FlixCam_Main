/**
 * @file quote.service.ts
 * @description Quote service for managing quotes and converting them to bookings
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 * @updated 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { BookingService, BookingCreateInput } from './booking.service'
import { PricingService } from './pricing.service'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import type {
  Quote,
  QuoteStatus,
  QuoteCreateInput,
  QuoteUpdateInput,
} from '@/lib/types/quote.types'
import { QuoteStatus as PrismaQuoteStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Quote Service
 *
 * Uses the Quote model for proper data storage
 */
export class QuoteService {
  /**
   * Generate unique quote number
   */
  private static async generateQuoteNumber(): Promise<string> {
    const prefix = 'QT'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const quoteNumber = `${prefix}-${timestamp}-${random}`

    // Check uniqueness
    const existing = await prisma.quote.findFirst({
      where: {
        quoteNumber,
        deletedAt: null,
      },
    })

    if (existing) {
      // Retry with different random
      return this.generateQuoteNumber()
    }

    return quoteNumber
  }

  /**
   * Map TypeScript QuoteStatus to Prisma QuoteStatus
   */
  private static mapQuoteStatus(status: QuoteStatus): PrismaQuoteStatus {
    const statusMap: Record<QuoteStatus, PrismaQuoteStatus> = {
      draft: 'DRAFT',
      sent: 'SENT',
      accepted: 'ACCEPTED',
      rejected: 'REJECTED',
      expired: 'EXPIRED',
      converted: 'CONVERTED',
    }
    return statusMap[status] || 'DRAFT'
  }

  /**
   * Map Prisma QuoteStatus to TypeScript QuoteStatus
   */
  private static mapFromPrismaStatus(status: PrismaQuoteStatus): QuoteStatus {
    return status.toLowerCase() as QuoteStatus
  }

  /**
   * Create a new quote
   */
  static async create(
    input: QuoteCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Quote> {
    // Check permission
    const canCreate = await hasPermission(userId, 'quote.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create quotes')
    }

    // Validate dates
    if (input.endDate <= input.startDate) {
      throw new ValidationError('End date must be after start date')
    }

    // Validate equipment exists
    const equipment = await prisma.equipment.findMany({
      where: {
        id: { in: input.equipment.map((e) => e.equipmentId) },
        deletedAt: null,
      },
    })

    if (equipment.length !== input.equipment.length) {
      throw new ValidationError('Some equipment not found')
    }

    // Calculate pricing
    const pricing = await PricingService.generateQuote({
      equipment: input.equipment,
      startDate: input.startDate,
      endDate: input.endDate,
      studioId: input.studioId,
      studioStartTime: input.studioStartTime,
      studioEndTime: input.studioEndTime,
    })

    // Generate quote number
    const quoteNumber = await this.generateQuoteNumber()

    // Set validity period (default 30 days from now)
    const validUntil = input.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Prepare equipment data for JSON storage
    const equipmentData = input.equipment.map((eq) => {
      const eqData = equipment.find((e) => e.id === eq.equipmentId)!
      const days = Math.ceil(
        (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const dailyRate = Number(eqData.dailyPrice || 0)
      return {
        equipmentId: eq.equipmentId,
        quantity: eq.quantity,
        dailyRate,
        totalDays: days,
        subtotal: dailyRate * eq.quantity * days,
      }
    })

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: input.customerId,
        status: 'DRAFT',
        startDate: input.startDate,
        endDate: input.endDate,
        validUntil,
        studioId: input.studioId || null,
        studioStartTime: input.studioStartTime || null,
        studioEndTime: input.studioEndTime || null,
        subtotal: pricing.subtotal,
        discount: input.discount ? new Decimal(input.discount) : null,
        vatAmount: pricing.vatAmount,
        totalAmount: pricing.totalAmount,
        depositAmount: pricing.depositAmount ? new Decimal(pricing.depositAmount) : null,
        equipment: equipmentData as any,
        notes: input.notes || null,
        createdBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
          },
        },
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
        equipmentItems: {
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
    })

    // Create QuoteEquipment records
    await prisma.quoteEquipment.createMany({
      data: equipmentData.map((eq) => ({
        quoteId: quote.id,
        equipmentId: eq.equipmentId,
        quantity: eq.quantity,
        dailyRate: new Decimal(eq.dailyRate),
        totalDays: eq.totalDays,
        subtotal: new Decimal(eq.subtotal),
        createdBy: userId,
      })),
    })

    // Audit log
    await AuditService.log({
      action: 'quote.created',
      userId,
      resourceType: 'quote',
      resourceId: quote.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        quoteNumber,
      },
    })

    // Emit event
    await EventBus.emit('quote.created', {
      quoteId: quote.id,
      quoteNumber,
      customerId: input.customerId,
      createdBy: userId,
      timestamp: new Date(),
    } as any)

    // Transform to Quote type
    return this.transformToQuote(quote)
  }

  /**
   * Get quote by ID
   */
  static async getById(id: string, userId: string): Promise<Quote> {
    // Check permission
    const canView = await hasPermission(userId, 'quote.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view quotes')
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
          },
        },
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
        equipmentItems: {
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
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
    })

    if (!quote) {
      throw new NotFoundError('Quote', id)
    }

    // Check if expired
    if (quote.validUntil < new Date() && quote.status !== 'CONVERTED') {
      // Auto-update status if expired
      if (quote.status !== 'EXPIRED') {
        await prisma.quote.update({
          where: { id },
          data: { status: 'EXPIRED' },
        })
        quote.status = 'EXPIRED'
      }
    }

    return this.transformToQuote(quote)
  }

  /**
   * List quotes with filters
   */
  static async list(
    userId: string,
    filters: {
      status?: QuoteStatus
      customerId?: string
      dateFrom?: Date
      dateTo?: Date
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ quotes: Quote[]; total: number; page: number; pageSize: number }> {
    // Check permission
    const canView = await hasPermission(userId, 'quote.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view quotes')
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
    }

    if (filters.status) {
      where.status = this.mapQuoteStatus(filters.status)
    }

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.dateFrom || filters.dateTo) {
      where.startDate = {}
      if (filters.dateFrom) {
        where.startDate.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.startDate.lte = filters.dateTo
      }
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              taxId: true,
              companyName: true,
              billingAddress: true,
            },
          },
          studio: {
            select: {
              id: true,
              name: true,
            },
          },
          equipmentItems: {
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
          booking: {
            select: {
              id: true,
              bookingNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.quote.count({ where }),
    ])

    return {
      quotes: quotes.map((q) => this.transformToQuote(q)),
      total,
      page,
      pageSize,
    }
  }

  /**
   * Update quote
   */
  static async update(
    id: string,
    input: QuoteUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Quote> {
    // Check permission
    const canUpdate = await hasPermission(userId, 'quote.update' as any)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update quotes')
    }

    const existingQuote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        equipmentItems: {
          include: {
            equipment: true,
          },
        },
      },
    })

    if (!existingQuote) {
      throw new NotFoundError('Quote', id)
    }

    // Update quote data
    const updatedStartDate = input.startDate || existingQuote.startDate
    const updatedEndDate = input.endDate || existingQuote.endDate

    let updatedSubtotal = existingQuote.subtotal
    let updatedVatAmount = existingQuote.vatAmount
    let updatedTotalAmount = existingQuote.totalAmount
    let updatedDepositAmount = existingQuote.depositAmount
    let updatedEquipment = existingQuote.equipment as any

    if (input.equipment || input.startDate || input.endDate) {
      // Recalculate pricing if equipment or dates changed
      const equipment = input.equipment
        ? await prisma.equipment.findMany({
            where: {
              id: { in: input.equipment.map((e) => e.equipmentId) },
              deletedAt: null,
            },
          })
        : []

      if (input.equipment && equipment.length !== input.equipment.length) {
        throw new ValidationError('Some equipment not found')
      }

      const finalEquipment =
        input.equipment ||
        existingQuote.equipmentItems.map((qe) => ({
          equipmentId: qe.equipmentId,
          quantity: qe.quantity,
        }))

      const pricing = await PricingService.generateQuote({
        equipment: finalEquipment,
        startDate: updatedStartDate,
        endDate: updatedEndDate,
        studioId: input.studioId || existingQuote.studioId || undefined,
        studioStartTime: input.studioStartTime || existingQuote.studioStartTime || undefined,
        studioEndTime: input.studioEndTime || existingQuote.studioEndTime || undefined,
      })

      // Apply discount if provided
      if (input.discount !== undefined) {
        const sub = Number(pricing.subtotal) * (1 - input.discount / 100)
        updatedSubtotal = new Decimal(sub)
        updatedTotalAmount = new Decimal(sub + Number(pricing.vatAmount))
      } else {
        updatedSubtotal = new Decimal(pricing.subtotal)
        updatedTotalAmount = new Decimal(pricing.totalAmount)
      }

      updatedVatAmount = new Decimal(pricing.vatAmount)
      updatedDepositAmount = pricing.depositAmount ? new Decimal(pricing.depositAmount) : null

      // Update equipment data
      updatedEquipment = finalEquipment.map((eq) => {
        const eqData =
          equipment.find((e) => e.id === eq.equipmentId) ||
          existingQuote.equipmentItems.find((qe) => qe.equipmentId === eq.equipmentId)?.equipment
        const days = Math.ceil(
          (updatedEndDate.getTime() - updatedStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const dailyRate = eqData ? Number((eqData as any).dailyPrice || 0) : 0
        return {
          equipmentId: eq.equipmentId,
          quantity: eq.quantity,
          dailyRate,
          totalDays: days,
          subtotal: dailyRate * eq.quantity * days,
        }
      })
    }

    // Update quote
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        startDate: updatedStartDate,
        endDate: updatedEndDate,
        validUntil: input.validUntil || existingQuote.validUntil,
        studioId: input.studioId !== undefined ? input.studioId : existingQuote.studioId,
        studioStartTime:
          input.studioStartTime !== undefined
            ? input.studioStartTime
            : existingQuote.studioStartTime,
        studioEndTime:
          input.studioEndTime !== undefined ? input.studioEndTime : existingQuote.studioEndTime,
        subtotal: updatedSubtotal,
        discount:
          input.discount !== undefined ? new Decimal(input.discount) : existingQuote.discount,
        vatAmount: updatedVatAmount,
        totalAmount: updatedTotalAmount,
        depositAmount: updatedDepositAmount,
        equipment: updatedEquipment as any,
        notes: input.notes !== undefined ? input.notes : existingQuote.notes,
        updatedBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
          },
        },
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
        equipmentItems: {
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
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
    })

    // Update equipment if changed
    if (input.equipment) {
      // Delete old equipment entries
      await prisma.quoteEquipment.deleteMany({
        where: {
          quoteId: id,
        },
      })

      // Create new equipment entries
      const equipment = await prisma.equipment.findMany({
        where: {
          id: { in: input.equipment.map((e) => e.equipmentId) },
          deletedAt: null,
        },
      })

      const days = Math.ceil(
        (updatedEndDate.getTime() - updatedStartDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      await prisma.quoteEquipment.createMany({
        data: input.equipment.map((eq) => {
          const eqData = equipment.find((e) => e.id === eq.equipmentId)!
          const dailyRate = Number(eqData.dailyPrice || 0)
          return {
            quoteId: id,
            equipmentId: eq.equipmentId,
            quantity: eq.quantity,
            dailyRate: new Decimal(dailyRate),
            totalDays: days,
            subtotal: new Decimal(dailyRate * eq.quantity * days),
            createdBy: userId,
          }
        }),
      })
    }

    // Audit log
    await AuditService.log({
      action: 'quote.updated',
      userId,
      resourceType: 'quote',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    // Emit event
    await EventBus.emit('quote.updated', {
      quoteId: id,
      updatedBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToQuote(updatedQuote)
  }

  /**
   * Convert quote to booking
   */
  static async convertToBooking(
    quoteId: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ) {
    // Check permission
    const canConvert = await hasPermission(userId, 'quote.convert' as any)
    if (!canConvert) {
      throw new ForbiddenError('You do not have permission to convert quotes')
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id: quoteId,
        deletedAt: null,
      },
      include: {
        equipmentItems: {
          include: {
            equipment: true,
          },
        },
      },
    })

    if (!quote) {
      throw new NotFoundError('Quote', quoteId)
    }

    // Check quote status
    if (quote.status !== 'DRAFT' && quote.status !== 'SENT' && quote.status !== 'ACCEPTED') {
      throw new ValidationError('Quote cannot be converted in current status')
    }

    // Check if quote is expired
    if (quote.validUntil < new Date()) {
      throw new ValidationError('Quote has expired')
    }

    // Create booking from quote
    const bookingInput: BookingCreateInput = {
      customerId: quote.customerId,
      startDate: quote.startDate,
      endDate: quote.endDate,
      equipment: quote.equipmentItems.map((qe) => ({
        equipmentId: qe.equipmentId,
        quantity: qe.quantity,
      })),
      studioId: quote.studioId || undefined,
      studioStartTime: quote.studioStartTime || undefined,
      studioEndTime: quote.studioEndTime || undefined,
      notes: quote.notes || undefined,
    }

    const booking = await BookingService.create(bookingInput, userId, auditContext)

    // Update quote status to converted and link to booking
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'CONVERTED',
        bookingId: booking.id,
        convertedAt: new Date(),
        updatedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'quote.converted',
      userId,
      resourceType: 'quote',
      resourceId: quoteId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      },
    })

    // Emit event
    await EventBus.emit('quote.converted', {
      quoteId,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      convertedBy: userId,
      timestamp: new Date(),
    } as any)

    return booking
  }

  /**
   * Update quote status
   */
  static async updateStatus(
    id: string,
    status: QuoteStatus,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Quote> {
    // Check permission
    const canUpdate = await hasPermission(userId, 'quote.update' as any)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update quote status')
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
          },
        },
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
        equipmentItems: {
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
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
    })

    if (!quote) {
      throw new NotFoundError('Quote', id)
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: this.mapQuoteStatus(status),
        updatedBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
          },
        },
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
        equipmentItems: {
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
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
    })

    // Audit log
    await AuditService.log({
      action: 'quote.status_updated',
      userId,
      resourceType: 'quote',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        status,
      },
    })

    // Emit event
    await EventBus.emit('quote.status_updated', {
      quoteId: id,
      status,
      updatedBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToQuote(updatedQuote)
  }

  /**
   * Delete quote (soft delete)
   */
  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Check permission
    const canDelete = await hasPermission(userId, 'quote.delete' as any)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete quotes')
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!quote) {
      throw new NotFoundError('Quote', id)
    }

    // Soft delete
    await prisma.quote.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'quote.deleted',
      userId,
      resourceType: 'quote',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    // Emit event
    await EventBus.emit('quote.deleted', {
      quoteId: id,
      deletedBy: userId,
      timestamp: new Date(),
    } as any)
  }

  /**
   * Transform Prisma Quote to Quote type (helper method)
   */
  private static transformToQuote(quote: any): Quote {
    // Check if quote is expired
    let status = this.mapFromPrismaStatus(quote.status)
    if (quote.validUntil < new Date() && status !== 'converted') {
      status = 'expired'
    }

    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerId: quote.customerId,
      status,
      startDate: quote.startDate,
      endDate: quote.endDate,
      equipment: (quote.equipmentItems || []).map((qe: any) => ({
        equipmentId: qe.equipmentId,
        quantity: qe.quantity,
        dailyRate: Number(qe.dailyRate || 0),
        totalDays: qe.totalDays,
        subtotal: Number(qe.subtotal || 0),
      })),
      studioId: quote.studioId,
      studioStartTime: quote.studioStartTime,
      studioEndTime: quote.studioEndTime,
      subtotal: Number(quote.subtotal || 0),
      discount: quote.discount ? Number(quote.discount) : undefined,
      vatAmount: Number(quote.vatAmount || 0),
      totalAmount: Number(quote.totalAmount || 0),
      depositAmount: quote.depositAmount ? Number(quote.depositAmount) : undefined,
      validUntil: quote.validUntil,
      notes: quote.notes,
      convertedToBookingId: quote.bookingId,
      customer: quote.customer,
      studio: quote.studio,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    }
  }
}
