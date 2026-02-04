/**
 * @file invoice.service.ts
 * @description Invoice service for invoice generation and management
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
  Invoice,
  InvoiceStatus,
  InvoiceType,
  InvoiceCreateInput,
  InvoiceUpdateInput,
  InvoicePaymentInput,
} from '@/lib/types/invoice.types'
import { InvoiceType as PrismaInvoiceType, InvoiceStatus as PrismaInvoiceStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Invoice Service
 * 
 * Uses the Invoice model for proper data storage
 */
export class InvoiceService {
  /**
   * Generate unique invoice number
   */
  private static async generateInvoiceNumber(): Promise<string> {
    const prefix = 'INV'
    const year = new Date().getFullYear()
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const invoiceNumber = `${prefix}-${year}-${timestamp}-${random}`

    // Check uniqueness
    const existing = await prisma.invoice.findFirst({
      where: {
        invoiceNumber,
        deletedAt: null,
      },
    })

    if (existing) {
      // Retry with different random
      return this.generateInvoiceNumber()
    }

    return invoiceNumber
  }

  /**
   * Map TypeScript InvoiceType to Prisma InvoiceType
   */
  private static mapInvoiceType(type: InvoiceType): PrismaInvoiceType {
    const typeMap: Record<InvoiceType, PrismaInvoiceType> = {
      booking: 'BOOKING',
      deposit: 'DEPOSIT',
      refund: 'REFUND',
      adjustment: 'ADJUSTMENT',
    }
    return typeMap[type] || 'BOOKING'
  }

  /**
   * Map TypeScript InvoiceStatus to Prisma InvoiceStatus
   */
  private static mapInvoiceStatus(status: InvoiceStatus): PrismaInvoiceStatus {
    const statusMap: Record<InvoiceStatus, PrismaInvoiceStatus> = {
      draft: 'DRAFT',
      sent: 'SENT',
      paid: 'PAID',
      overdue: 'OVERDUE',
      cancelled: 'CANCELLED',
      partially_paid: 'PARTIALLY_PAID',
    }
    return statusMap[status] || 'DRAFT'
  }

  /**
   * Map Prisma InvoiceStatus to TypeScript InvoiceStatus
   */
  private static mapFromPrismaStatus(status: PrismaInvoiceStatus): InvoiceStatus {
    return status.toLowerCase().replace('_', '_') as InvoiceStatus
  }

  /**
   * Create invoice from booking or manually
   */
  static async create(
    input: InvoiceCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Invoice> {
    // Check permission
    const canCreate = await hasPermission(userId, 'invoice.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create invoices')
    }

    // Validate customer exists
    const customer = await prisma.user.findFirst({
      where: {
        id: input.customerId,
        deletedAt: null,
      },
    })

    if (!customer) {
      throw new NotFoundError('Customer', input.customerId)
    }

    // Validate booking if provided
    if (input.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
          deletedAt: null,
        },
      })

      if (!booking) {
        throw new NotFoundError('Booking', input.bookingId)
      }
    }

    // Calculate totals
    const subtotal = input.items.reduce((sum, item) => sum + item.total, 0)
    const discount = input.discount || 0
    const subtotalAfterDiscount = subtotal - discount
    const vatAmount = subtotalAfterDiscount * 0.15 // 15% VAT
    const totalAmount = subtotalAfterDiscount + vatAmount

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber()

    // Check if overdue
    const isOverdue = new Date(input.dueDate) < new Date()
    const status: PrismaInvoiceStatus = isOverdue ? 'OVERDUE' : 'DRAFT'

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: input.customerId,
        bookingId: input.bookingId || null,
        type: this.mapInvoiceType(input.type),
        status,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        subtotal: new Decimal(subtotal),
        discount: discount > 0 ? new Decimal(discount) : null,
        vatAmount: new Decimal(vatAmount),
        totalAmount: new Decimal(totalAmount),
        paidAmount: new Decimal(0),
        remainingAmount: new Decimal(totalAmount),
        items: input.items.map((item) => ({
          ...item,
          vatRate: item.vatRate || 15,
          vatAmount: item.vatAmount || (item.total * 0.15),
        })) as any,
        notes: input.notes || null,
        paymentTerms: input.paymentTerms || null,
        createdBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
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
      action: 'invoice.created',
      userId,
      resourceType: 'invoice',
      resourceId: invoice.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        invoiceNumber,
      },
    })

    // Emit event
    await EventBus.emit('invoice.created', {
      invoiceId: invoice.id,
      invoiceNumber,
      bookingId: input.bookingId,
      customerId: input.customerId,
      totalAmount: Number(totalAmount),
      createdBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToInvoice(invoice)
  }

  /**
   * Get invoice by ID
   */
  static async getById(id: string, userId: string): Promise<Invoice> {
    // Check permission
    const canView = await hasPermission(userId, 'invoice.view' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view invoices')
    }

    const invoice = await prisma.invoice.findFirst({
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

    if (!invoice) {
      throw new NotFoundError('Invoice', id)
    }

    // Check if overdue
    if (invoice.dueDate < new Date() && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED') {
      if (invoice.status !== 'OVERDUE' && invoice.status !== 'PARTIALLY_PAID') {
        // Auto-update status if overdue
        await prisma.invoice.update({
          where: { id },
          data: { status: 'OVERDUE' },
        })
        invoice.status = 'OVERDUE'
      }
    }

    return this.transformToInvoice(invoice)
  }

  /**
   * List invoices with filters
   */
  static async list(
    userId: string,
    filters: {
      status?: InvoiceStatus
      type?: InvoiceType
      customerId?: string
      bookingId?: string
      dateFrom?: Date
      dateTo?: Date
      overdue?: boolean
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ invoices: Invoice[]; total: number; page: number; pageSize: number }> {
    // Check permission
    const canView = await hasPermission(userId, 'invoice.view' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view invoices')
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
    }

    if (filters.status) {
      where.status = this.mapInvoiceStatus(filters.status)
    }

    if (filters.type) {
      where.type = this.mapInvoiceType(filters.type)
    }

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.bookingId) {
      where.bookingId = filters.bookingId
    }

    if (filters.overdue) {
      where.status = { in: ['OVERDUE', 'PARTIALLY_PAID'] }
      where.dueDate = { lt: new Date() }
    }

    if (filters.dateFrom || filters.dateTo) {
      where.issueDate = {}
      if (filters.dateFrom) {
        where.issueDate.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.issueDate.lte = filters.dateTo
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
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
      prisma.invoice.count({ where }),
    ])

    return {
      invoices: invoices.map((inv) => this.transformToInvoice(inv)),
      total,
      page,
      pageSize,
    }
  }

  /**
   * Update invoice
   */
  static async update(
    id: string,
    input: InvoiceUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Invoice> {
    // Check permission
    const canUpdate = await hasPermission(userId, 'invoice.update' as any)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update invoices')
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!existingInvoice) {
      throw new NotFoundError('Invoice', id)
    }

    // Recalculate totals if items changed
    let updatedSubtotal = existingInvoice.subtotal
    let updatedVatAmount = existingInvoice.vatAmount
    let updatedTotalAmount = existingInvoice.totalAmount
    let updatedRemainingAmount = existingInvoice.remainingAmount

    if (input.items) {
      const subtotal = input.items.reduce((sum, item) => sum + item.total, 0)
      const discount = input.discount ?? Number(existingInvoice.discount || 0)
      const subtotalAfterDiscount = subtotal - discount
      const vatAmount = subtotalAfterDiscount * 0.15
      const totalAmount = subtotalAfterDiscount + vatAmount

      updatedSubtotal = new Decimal(subtotal)
      updatedVatAmount = new Decimal(vatAmount)
      updatedTotalAmount = new Decimal(totalAmount)
      updatedRemainingAmount = new Decimal(totalAmount - Number(existingInvoice.paidAmount))
    } else if (input.discount !== undefined) {
      const subtotalAfterDiscount = Number(existingInvoice.subtotal) - input.discount
      const vatAmount = subtotalAfterDiscount * 0.15
      updatedVatAmount = new Decimal(vatAmount)
      updatedTotalAmount = new Decimal(subtotalAfterDiscount + vatAmount)
      updatedRemainingAmount = new Decimal(subtotalAfterDiscount + vatAmount - Number(existingInvoice.paidAmount))
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        issueDate: input.issueDate || undefined,
        dueDate: input.dueDate || undefined,
        subtotal: input.items ? updatedSubtotal : undefined,
        discount: input.discount !== undefined ? new Decimal(input.discount) : undefined,
        vatAmount: input.items || input.discount !== undefined ? updatedVatAmount : undefined,
        totalAmount: input.items || input.discount !== undefined ? updatedTotalAmount : undefined,
        remainingAmount: input.items || input.discount !== undefined ? updatedRemainingAmount : undefined,
        items: input.items ? input.items.map((item) => ({
          ...item,
          vatRate: item.vatRate || 15,
          vatAmount: item.vatAmount || (item.total * 0.15),
        })) as any : undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
        paymentTerms: input.paymentTerms !== undefined ? input.paymentTerms : undefined,
        status: input.status ? this.mapInvoiceStatus(input.status) : undefined,
        updatedBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
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
      action: 'invoice.updated',
      userId,
      resourceType: 'invoice',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    return this.transformToInvoice(updatedInvoice)
  }

  /**
   * Record payment for invoice
   */
  static async recordPayment(
    id: string,
    input: InvoicePaymentInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Invoice> {
    // Check permission
    const canMarkPaid = await hasPermission(userId, 'invoice.mark_paid' as any)
    if (!canMarkPaid) {
      throw new ForbiddenError('You do not have permission to record payments')
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!invoice) {
      throw new NotFoundError('Invoice', id)
    }

    // Calculate new amounts
    const paymentDate = input.paymentDate || new Date()
    const newPaidAmount = Number(invoice.paidAmount) + input.amount
    const remainingAmount = Number(invoice.totalAmount) - newPaidAmount

    // Determine new status
    let newStatus: PrismaInvoiceStatus = invoice.status
    if (remainingAmount <= 0) {
      newStatus = 'PAID'
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIALLY_PAID'
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: new Decimal(newPaidAmount),
        remainingAmount: new Decimal(remainingAmount),
        status: newStatus,
        paidDate: remainingAmount <= 0 ? paymentDate : undefined,
        updatedBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Create payment record if booking exists
    if (invoice.bookingId) {
      const payment = await prisma.payment.create({
        data: {
          bookingId: invoice.bookingId,
          amount: new Decimal(input.amount),
          status: 'SUCCESS',
          createdBy: userId,
        },
      })

      // Link payment to invoice
      await prisma.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          paymentId: payment.id,
          amount: new Decimal(input.amount),
          createdBy: userId,
        },
      })
    }

    // Audit log
    await AuditService.log({
      action: 'invoice.payment_recorded',
      userId,
      resourceType: 'invoice',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        amount: input.amount,
      },
    })

    // Emit event
    await EventBus.emit('invoice.payment_recorded', {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      amount: input.amount,
      remainingAmount,
      recordedBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToInvoice(updatedInvoice)
  }

  /**
   * Generate invoice from booking
   */
  static async generateFromBooking(
    bookingId: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Invoice> {
    // Check permission
    const canCreate = await hasPermission(userId, 'invoice.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create invoices')
    }

    // Get booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
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
          include: {
            equipment: {
              select: {
                id: true,
                sku: true,
                model: true,
                dailyPrice: true,
              },
            },
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', bookingId)
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        bookingId,
        deletedAt: null,
      },
    })

    if (existingInvoice) {
      throw new ValidationError('Invoice already exists for this booking')
    }

    // Calculate rental days
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // Build invoice items from booking equipment
    const items = booking.equipment.map((be) => {
      const dailyPrice = Number(be.equipment.dailyPrice || 0)
      const total = dailyPrice * be.quantity * days
      const vatAmount = total * 0.15

      return {
        description: `${be.equipment.sku}${be.equipment.model ? ` - ${be.equipment.model}` : ''} (${be.quantity} × ${days} days)`,
        quantity: be.quantity,
        unitPrice: dailyPrice,
        total,
        vatRate: 15,
        vatAmount,
      }
    })

    // Create invoice
    return this.create(
      {
        bookingId,
        customerId: booking.customerId,
        type: 'booking',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        items,
        notes: `Invoice generated from booking ${booking.bookingNumber}`,
      },
      userId,
      auditContext
    )
  }

  /**
   * Delete invoice (soft delete)
   */
  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Check permission
    const canDelete = await hasPermission(userId, 'invoice.delete' as any)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete invoices')
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!invoice) {
      throw new NotFoundError('Invoice', id)
    }

    // Soft delete
    await prisma.invoice.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'invoice.deleted',
      userId,
      resourceType: 'invoice',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })
  }

  /**
   * Transform Prisma Invoice to Invoice type (helper method)
   */
  private static transformToInvoice(invoice: any): Invoice {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      customerId: invoice.customerId,
      type: invoice.type.toLowerCase() as InvoiceType,
      status: this.mapFromPrismaStatus(invoice.status),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      subtotal: Number(invoice.subtotal || 0),
      discount: invoice.discount ? Number(invoice.discount) : undefined,
      vatAmount: Number(invoice.vatAmount || 0),
      totalAmount: Number(invoice.totalAmount || 0),
      paidAmount: Number(invoice.paidAmount || 0),
      remainingAmount: Number(invoice.remainingAmount || 0),
      items: (invoice.items || []) as any,
      notes: invoice.notes,
      paymentTerms: invoice.paymentTerms,
      customer: invoice.customer,
      booking: invoice.booking,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }
  }
}
