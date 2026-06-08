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
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { invoiceNumberService } from './invoice-number.service'
import { getVATRate } from '@/lib/vat'
import { calculateBestRate } from './cart.service'
import { PricingService } from './pricing.service'
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceType,
  InvoiceCreateInput,
  InvoiceUpdateInput,
  InvoicePaymentInput,
} from '@/lib/types/invoice.types'
import type { Prisma } from '@prisma/client'
import {
  InvoiceType as PrismaInvoiceType,
  InvoiceStatus as PrismaInvoiceStatus,
} from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Invoice Service
 *
 * Uses the Invoice model for proper data storage
 */
export class InvoiceService {
  private static roundCurrency(value: number): number {
    return Math.round(value * 100) / 100
  }

  /**
   * Generate unique invoice number
   */
  private static async generateInvoiceNumber(): Promise<string> {
    return invoiceNumberService.nextConfiguredInvoiceNumber()
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

  /** Rental formula: line total = quantity × (days ?? 1) × unitPrice. Server is source of truth.
   *  VAT is calculated ONCE on the aggregate taxable amount (subtotal - discount), NOT per line item. */
  private static calculateTotals(
    items: Array<{ quantity: number; unitPrice: number; days?: number; [k: string]: unknown }>,
    discount: number = 0,
    vatRate: number
  ): {
    itemsWithTotals: Array<InvoiceItem>
    subtotal: number
    vatAmount: number
    totalAmount: number
  } {
    const itemsWithTotals: InvoiceItem[] = items.map((item) => {
      const days = item.days ?? 1
      const total = Math.round(item.quantity * days * item.unitPrice * 100) / 100
      return {
        description: item.description as string,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...(days > 1 && { days }),
        total,
      }
    })
    const subtotal = Math.round(itemsWithTotals.reduce((sum, item) => sum + (item.total ?? 0), 0) * 100) / 100
    const taxableAmount = Math.max(0, subtotal - discount)
    const vatAmount = Math.round(taxableAmount * vatRate * 100) / 100
    const totalAmount = Math.round((taxableAmount + vatAmount) * 100) / 100
    return { itemsWithTotals, subtotal, vatAmount, totalAmount }
  }

  private static async resolveBookingPaymentMethod(bookingId: string): Promise<string | null> {
    const payment = await prisma.payment.findFirst({
      where: { bookingId, status: 'SUCCESS', deletedAt: null },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      select: { gateway: true },
    })
    return payment?.gateway?.trim() || null
  }

  private static buildAuthoritativeBookingInvoiceItems(booking: {
    bookingNumber?: string | null
    totalAmount: Decimal | number
    vatAmount: Decimal | number
    depositAmount?: Decimal | number | null
    studio?: { name?: string | null } | null
    equipment: Array<{
      quantity: number
      equipment: {
        model?: string | null
        sku?: string | null
        dailyPrice?: Decimal | number | null
      }
    }>
    startDate: Date
    endDate: Date
  }): {
    itemsWithTotals: InvoiceItem[]
    subtotal: number
    vatAmount: number
    totalAmount: number
  } {
    const rentalDays = Math.max(
      1,
      Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24))
    )
    const authoritativeSubtotal = this.roundCurrency(Number(booking.totalAmount || 0))
    const authoritativeVatAmount = this.roundCurrency(Number(booking.vatAmount || 0))

    const baseItems: InvoiceItem[] = booking.equipment.map((be) => ({
      description: `${be.equipment.model || be.equipment.sku || 'Equipment'} (${rentalDays} days)`,
      quantity: be.quantity,
      unitPrice: Number(be.equipment.dailyPrice || 0),
      days: rentalDays,
      equipmentSku: be.equipment.sku || undefined,
    }))

    if (baseItems.length === 0 && booking.studio) {
      baseItems.push({
        description: `Studio booking${booking.studio.name ? ` - ${booking.studio.name}` : ''}`,
        quantity: 1,
        unitPrice:
          rentalDays > 0 ? this.roundCurrency(authoritativeSubtotal / rentalDays) : authoritativeSubtotal,
        days: rentalDays,
      })
    }

    if (baseItems.length === 0) {
      baseItems.push({
        description: `Booking ${booking.bookingNumber || ''}`.trim(),
        quantity: 1,
        unitPrice: authoritativeSubtotal,
      })
    }

    const itemsWithTotals = baseItems.map((item) => {
      const days = item.days ?? 1
      const total = this.roundCurrency(item.quantity * days * item.unitPrice)
      return {
        ...item,
        total,
      }
    })

    const computedSubtotal = this.roundCurrency(
      itemsWithTotals.reduce((sum, item) => sum + Number(item.total || 0), 0)
    )
    const adjustmentAmount = this.roundCurrency(authoritativeSubtotal - computedSubtotal)

    if (Math.abs(adjustmentAmount) > 0.01) {
      itemsWithTotals.push({
        description: 'Pricing adjustment',
        quantity: 1,
        unitPrice: adjustmentAmount,
        total: adjustmentAmount,
      })
    }

    const deposit = this.roundCurrency(Number(booking.depositAmount || 0))
    if (deposit > 0) {
      itemsWithTotals.unshift({
        description: 'Security deposit (refundable)',
        quantity: 1,
        unitPrice: deposit,
        total: deposit,
      })
    }

    return {
      itemsWithTotals,
      subtotal: authoritativeSubtotal,
      vatAmount: authoritativeVatAmount,
      totalAmount: this.roundCurrency(authoritativeSubtotal + authoritativeVatAmount),
    }
  }

  static async syncBookingInvoicePayments(bookingId: string, userId = 'system'): Promise<void> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        bookingId,
        deletedAt: null,
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
      },
    })

    if (!invoice) {
      return
    }

    const successfulPayments = await prisma.payment.findMany({
      where: {
        bookingId,
        status: 'SUCCESS',
        deletedAt: null,
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const paidAmount = this.roundCurrency(
      successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    )
    const remainingAmount = this.roundCurrency(Math.max(0, Number(invoice.totalAmount) - paidAmount))
    const latestPaidAt =
      successfulPayments.length > 0 ? successfulPayments[successfulPayments.length - 1].createdAt : null

    let nextStatus = invoice.status
    if (paidAmount <= 0 && invoice.status !== 'CANCELLED' && invoice.status !== 'OVERDUE') {
      nextStatus = 'SENT'
    } else if (remainingAmount <= 0) {
      nextStatus = 'PAID'
    } else if (paidAmount > 0) {
      nextStatus = 'PARTIALLY_PAID'
    }

    const latestPayment = await prisma.payment.findFirst({
      where: { bookingId, status: 'SUCCESS', deletedAt: null },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      select: { gateway: true },
    })

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: new Decimal(paidAmount),
        remainingAmount: new Decimal(remainingAmount),
        status: nextStatus,
        paidDate: remainingAmount <= 0 ? latestPaidAt : null,
        paymentMethod: latestPayment?.gateway?.trim() || null,
        updatedBy: userId,
      },
    })

    if (successfulPayments.length > 0) {
      await prisma.invoicePayment.createMany({
        data: successfulPayments.map((payment) => ({
          invoiceId: invoice.id,
          paymentId: payment.id,
          amount: payment.amount,
          paidAt: payment.createdAt,
          createdBy: userId,
          updatedBy: userId,
        })),
        skipDuplicates: true,
      })
    }
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
    const canCreate = await hasPermission(userId, PERMISSIONS.INVOICE_CREATE)
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

    const discount = input.discount || 0
    const vatRate = (await getVATRate()).toNumber()
    const { itemsWithTotals, subtotal, vatAmount, totalAmount } = this.calculateTotals(
      input.items as unknown as Array<{ quantity: number; unitPrice: number; days?: number; vatRate?: number; vatAmount?: number; [k: string]: unknown }>,
      discount,
      vatRate
    )

    const invoiceNumber = await this.generateInvoiceNumber()
    const isOverdue = new Date(input.dueDate) < new Date()
    const status: PrismaInvoiceStatus = isOverdue ? 'OVERDUE' : 'DRAFT'

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
        items: itemsWithTotals as unknown as NonNullable<Prisma.InvoiceCreateInput['items']>,
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
            phone: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
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
   * Auto-generate an invoice when a booking is confirmed.
   * Idempotent: returns existing invoice if one already exists for the booking.
   * Uses atomic counter for race-condition-safe invoice numbering.
   */
  static async autoGenerateForBooking(bookingId: string): Promise<Invoice> {
    const existing = await prisma.invoice.findFirst({
      where: { bookingId, deletedAt: null },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, taxId: true, companyName: true, billingAddress: true },
        },
        booking: { select: { id: true, bookingNumber: true } },
      },
    })
    if (existing) {
      return this.transformToInvoice(existing)
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, taxId: true, companyName: true, billingAddress: true },
        },
        studio: {
          select: { name: true },
        },
        equipment: {
          where: { deletedAt: null },
          include: { equipment: { select: { model: true, sku: true, dailyPrice: true, weeklyPrice: true, monthlyPrice: true } } },
        },
        payments: { select: { amount: true } },
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', bookingId)
    }

    const { itemsWithTotals, subtotal, vatAmount, totalAmount } =
      this.buildAuthoritativeBookingInvoiceItems(booking)
    const invoiceNumber = await this.generateInvoiceNumber()
    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + 30)

    const paidAmount = booking.payments?.reduce(
      (sum: number, p: { amount: { toNumber: () => number } }) => sum + p.amount.toNumber(),
      0
    ) ?? 0
    const paymentMethod = await this.resolveBookingPaymentMethod(booking.id)
    const depositAmount = this.roundCurrency(Number(booking.depositAmount || 0))

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: booking.customerId,
        bookingId: booking.id,
        type: 'BOOKING',
        status: paidAmount >= totalAmount ? 'PAID' : 'SENT',
        issueDate: now,
        dueDate,
        subtotal: new Decimal(subtotal),
        vatAmount: new Decimal(vatAmount),
        totalAmount: new Decimal(totalAmount),
        depositAmount: new Decimal(depositAmount),
        paidAmount: new Decimal(paidAmount),
        remainingAmount: new Decimal(Math.max(0, totalAmount - paidAmount)),
        paymentMethod,
        items: itemsWithTotals as unknown as NonNullable<Prisma.InvoiceCreateInput['items']>,
        createdBy: booking.createdBy,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, taxId: true, companyName: true, billingAddress: true },
        },
        booking: { select: { id: true, bookingNumber: true } },
      },
    })

    await AuditService.log({
      action: 'invoice.auto_generated',
      userId: booking.createdBy,
      resourceType: 'invoice',
      resourceId: invoice.id,
      metadata: { invoiceNumber, bookingId, trigger: 'booking_confirmed' },
    })

    await EventBus.emit('invoice.created', {
      invoiceId: invoice.id,
      invoiceNumber,
      bookingId,
      customerId: booking.customerId,
      totalAmount: Number(totalAmount),
      createdBy: booking.createdBy,
      timestamp: now,
    } as any)

    await this.syncBookingInvoicePayments(bookingId, booking.createdBy)

    const refreshedInvoice = await prisma.invoice.findFirst({
      where: { id: invoice.id, deletedAt: null },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, taxId: true, companyName: true, billingAddress: true },
        },
        booking: { select: { id: true, bookingNumber: true } },
      },
    })

    return this.transformToInvoice(refreshedInvoice ?? invoice)
  }

  /**
   * Get invoice by ID
   */
  static async getById(id: string, userId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
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

    const canStaff = await hasPermission(userId, 'invoice.read')
    if (!canStaff && invoice.customerId !== userId) {
      throw new ForbiddenError('You do not have permission to view this invoice')
    }

    // Check if overdue
    if (
      invoice.dueDate < new Date() &&
      invoice.status !== 'PAID' &&
      invoice.status !== 'CANCELLED'
    ) {
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
    const canView = await hasPermission(userId, PERMISSIONS.INVOICE_READ)
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
              phone: true,
              taxId: true,
              companyName: true,
              billingAddress: true,
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
    const canUpdate = await hasPermission(userId, PERMISSIONS.INVOICE_UPDATE)
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

    if (existingInvoice.lockedAt || existingInvoice.status === 'PAID') {
      throw new ValidationError('Cannot update a paid or locked invoice')
    }

    if (existingInvoice.status === 'PARTIALLY_PAID') {
      throw new ValidationError('Cannot update invoice amounts after partial payment')
    }

    // Recalculate totals if items changed
    let updatedSubtotal = existingInvoice.subtotal
    let updatedVatAmount = existingInvoice.vatAmount
    let updatedTotalAmount = existingInvoice.totalAmount
    let updatedRemainingAmount = existingInvoice.remainingAmount

    let itemsToStore: InvoiceItem[] | undefined
    if (input.items) {
      const discount = input.discount ?? Number(existingInvoice.discount || 0)
      const vatRate = (await getVATRate()).toNumber()
      const { itemsWithTotals, subtotal, vatAmount, totalAmount } = this.calculateTotals(
        input.items as unknown as Array<{ quantity: number; unitPrice: number; days?: number; vatRate?: number; vatAmount?: number; [k: string]: unknown }>,
        discount,
        vatRate
      )
      updatedSubtotal = new Decimal(subtotal)
      updatedVatAmount = new Decimal(vatAmount)
      updatedTotalAmount = new Decimal(totalAmount)
      updatedRemainingAmount = new Decimal(totalAmount - Number(existingInvoice.paidAmount))
      itemsToStore = itemsWithTotals
    } else if (input.discount !== undefined) {
      const vatRate = (await getVATRate()).toNumber()
      const taxableAmount = Math.max(0, Number(existingInvoice.subtotal) - input.discount)
      const vatAmount = Math.round(taxableAmount * vatRate * 100) / 100
      const totalAmount = Math.round((taxableAmount + vatAmount) * 100) / 100
      updatedVatAmount = new Decimal(vatAmount)
      updatedTotalAmount = new Decimal(totalAmount)
      updatedRemainingAmount = new Decimal(
        Math.round((totalAmount - Number(existingInvoice.paidAmount)) * 100) / 100
      )
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        issueDate: input.issueDate || undefined,
        dueDate: input.dueDate || undefined,
        subtotal: input.items ? updatedSubtotal : undefined,
        discount: input.discount !== undefined ? new Decimal(input.discount) : undefined,
        vatAmount: input.items || input.discount !== undefined ? updatedVatAmount : undefined,
        totalAmount: input.items || input.discount !== undefined ? updatedTotalAmount : undefined,
        remainingAmount:
          input.items || input.discount !== undefined ? updatedRemainingAmount : undefined,
        items: input.items ? (itemsToStore as unknown as NonNullable<Prisma.InvoiceUpdateInput['items']>) : undefined,
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
            phone: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
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
    const canMarkPaid = await hasPermission(userId, PERMISSIONS.INVOICE_MARK_PAID)
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

    if (newPaidAmount - Number(invoice.totalAmount) > 0.01) {
      throw new ValidationError('Payment amount exceeds invoice outstanding balance')
    }

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
        lockedAt: remainingAmount <= 0 ? paymentDate : undefined,
        lockedBy: remainingAmount <= 0 ? userId : undefined,
        updatedBy: userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
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
    const canCreate = await hasPermission(userId, PERMISSIONS.INVOICE_CREATE)
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
            phone: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
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
                weeklyPrice: true,
                monthlyPrice: true,
                categoryId: true,
                category: { select: { id: true, name: true } },
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

    // Build line items with optimal weekly/monthly rates; VAT applied once in create() via calculateTotals()
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    const days = Math.max(1, PricingService.calculateRentalDays(startDate, endDate))

    const items = booking.equipment.map((be) => {
      const eq = be.equipment
      const dailyPrice = Number(eq.dailyPrice || 0)
      const weeklyPrice = eq.weeklyPrice ? Number(eq.weeklyPrice) : null
      const monthlyPrice = eq.monthlyPrice ? Number(eq.monthlyPrice) : null
      const { effectiveTotal } = calculateBestRate(
        days,
        be.quantity,
        dailyPrice,
        weeklyPrice,
        monthlyPrice
      )
      const effectiveUnitPrice =
        be.quantity * days > 0
          ? this.roundCurrency(effectiveTotal / (be.quantity * days))
          : dailyPrice

      return {
        description: `${eq.sku}${eq.model ? ` - ${eq.model}` : ''} (${be.quantity} × ${days} days)`,
        quantity: be.quantity,
        unitPrice: effectiveUnitPrice,
        days,
        equipmentId: eq.id,
        equipmentSku: eq.sku,
        categoryId: eq.categoryId ?? undefined,
        categoryName: eq.category?.name ?? undefined,
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
    const canDelete = await hasPermission(userId, PERMISSIONS.INVOICE_DELETE)
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

    if (invoice.lockedAt || invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') {
      throw new ValidationError('Cannot delete an invoice with payments or a locked invoice')
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
  private static mapPrismaLineItemsToInvoiceItems(invoice: {
    lineItems?: Array<{
      description: string
      quantity: unknown
      unitPrice: unknown
      rentalDays: number | null
      lineTotal: unknown
      vatAmount: unknown
      vatRate: unknown
    }>
    items?: unknown
  }): InvoiceItem[] {
    if (invoice.lineItems?.length) {
      return invoice.lineItems.map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        ...(li.rentalDays != null && li.rentalDays > 0 ? { days: li.rentalDays } : {}),
        total: Number(li.lineTotal),
        vatAmount: Number(li.vatAmount),
        vatRate: Number(li.vatRate),
      }))
    }
    return (invoice.items || []) as InvoiceItem[]
  }

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
      items: this.mapPrismaLineItemsToInvoiceItems(invoice),
      notes: invoice.notes,
      paymentTerms: invoice.paymentTerms,
      paymentMethod: invoice.paymentMethod ?? null,
      depositAmount: Number(invoice.depositAmount || 0),
      customer: invoice.customer,
      booking: invoice.booking,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }
  }
}
