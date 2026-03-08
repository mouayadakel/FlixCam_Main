/**
 * @file contract.service.ts
 * @description Contract service for contract generation and management
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import type {
  Contract,
  ContractStatus,
  ContractCreateInput,
  ContractUpdateInput,
  ContractSignInput,
  ContractContent,
  SignatureData,
} from '@/lib/types/contract.types'

/**
 * Contract Service
 *
 * Handles contract generation, signing, and management
 */
export class ContractService {
  /**
   * Get current terms version
   */
  private static getCurrentTermsVersion(): string {
    // In production, this would fetch from a terms management system
    // For now, use a simple versioning scheme
    return '1.0.0'
  }

  /**
   * Generate contract content from booking
   */
  private static async generateContractContent(
    bookingId: string,
    termsVersion: string
  ): Promise<ContractContent> {
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

    // Generate contract terms (in production, fetch from template)
    const terms = this.generateTermsTemplate(booking, termsVersion)

    return {
      terms,
      equipment: (booking.equipment || []).map((be: any) => ({
        id: be.equipment.id,
        name: be.equipment.sku || '', // Use SKU as name fallback
        sku: be.equipment.sku,
        quantity: be.quantity,
        dailyPrice: Number(be.equipment.dailyPrice || 0),
      })),
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: Number(booking.totalAmount),
      },
      customer: booking.customer
        ? {
            id: booking.customer.id,
            name: booking.customer.name,
            email: booking.customer.email,
          }
        : {
            id: booking.customerId,
            name: null,
            email: '',
          },
      termsVersion,
      generatedAt: new Date(),
    }
  }

  /**
   * Generate contract terms template
   */
  private static generateTermsTemplate(booking: any, version: string): string {
    // In production, this would fetch from a template system
    // For now, generate a basic template
    return `
عقد إيجار معدات سينمائية

رقم العقد: ${booking.bookingNumber}
التاريخ: ${new Date().toLocaleDateString('ar-SA')}
إصدار الشروط: ${version}

الطرف الأول (المؤجر): FlixCam.rent
الطرف الثاني (المستأجر): ${booking.customer?.name || booking.customer?.email || 'N/A'}

الشروط والأحكام:
1. مدة الإيجار: من ${new Date(booking.startDate).toLocaleDateString('ar-SA')} إلى ${new Date(booking.endDate).toLocaleDateString('ar-SA')}
2. المعدات المؤجرة: ${(booking.equipment || []).length} عنصر
3. المبلغ الإجمالي: ${Number(booking.totalAmount).toLocaleString('ar-SA')} ريال سعودي
4. المستأجر مسؤول عن صيانة المعدات وإرجاعها في نفس الحالة
5. أي تلف أو فقدان للمعدات يتحمله المستأجر

هذا العقد ملزم قانونياً لكلا الطرفين.
    `.trim()
  }

  /**
   * Create contract for booking
   */
  static async create(
    input: ContractCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Contract> {
    // Check permission
    const canCreate = await hasPermission(userId, 'contract.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create contracts')
    }

    // Check if booking exists
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
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
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking', input.bookingId)
    }

    // Check if contract already exists
    const existing = await prisma.contract.findFirst({
      where: {
        bookingId: input.bookingId,
        deletedAt: null,
      },
    })

    if (existing) {
      throw new ValidationError('Contract already exists for this booking')
    }

    // Generate contract content
    const termsVersion = input.termsVersion || this.getCurrentTermsVersion()
    const contractContent = await this.generateContractContent(input.bookingId, termsVersion)

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        bookingId: input.bookingId,
        termsVersion,
        contractContent: contractContent as any,
        createdBy: userId,
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await AuditService.log({
      action: 'contract.created',
      userId,
      resourceType: 'contract',
      resourceId: contract.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        bookingId: input.bookingId,
        termsVersion,
      },
    })

    // Emit event
    await EventBus.emit('contract.created', {
      contractId: contract.id,
      bookingId: input.bookingId,
      termsVersion,
      createdBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToContract(contract)
  }

  /**
   * Get contract by ID
   */
  static async getById(id: string, userId: string): Promise<Contract> {
    // Check permission
    const canView = await hasPermission(userId, 'contract.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view contracts')
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!contract) {
      throw new NotFoundError('Contract', id)
    }

    return this.transformToContract(contract)
  }

  /**
   * List contracts with filters
   */
  static async list(
    userId: string,
    filters: {
      status?: ContractStatus
      bookingId?: string
      customerId?: string
      signed?: boolean
      dateFrom?: Date
      dateTo?: Date
      termsVersion?: string
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ contracts: Contract[]; total: number; page: number; pageSize: number }> {
    // Check permission
    const canView = await hasPermission(userId, 'contract.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view contracts')
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
    }

    if (filters.bookingId) {
      where.bookingId = filters.bookingId
    }

    if (filters.customerId) {
      where.booking = {
        customerId: filters.customerId,
        deletedAt: null,
      }
    }

    if (filters.signed !== undefined) {
      if (filters.signed) {
        where.signedAt = { not: null }
      } else {
        where.signedAt = null
      }
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

    if (filters.termsVersion) {
      where.termsVersion = filters.termsVersion
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          booking: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.contract.count({ where }),
    ])

    // Filter by status (computed from signedAt)
    let filteredContracts = contracts.map((c) => this.transformToContract(c))

    if (filters.status) {
      filteredContracts = filteredContracts.filter((c) => {
        if (filters.status === 'signed' && c.signedAt) return true
        if (filters.status === 'pending_signature' && !c.signedAt) return true
        if (filters.status === 'draft' && !c.signedAt) return true
        return c.status === filters.status
      })
    }

    return {
      contracts: filteredContracts,
      total: filteredContracts.length,
      page,
      pageSize,
    }
  }

  /**
   * Update contract
   */
  static async update(
    id: string,
    input: ContractUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Contract> {
    // Check permission
    const canUpdate = await hasPermission(userId, 'contract.update' as any)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update contracts')
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!contract) {
      throw new NotFoundError('Contract', id)
    }

    // Cannot update signed contracts
    if (contract.signedAt) {
      throw new ValidationError('Cannot update signed contract')
    }

    const updateData: any = {}

    if (input.termsVersion) {
      updateData.termsVersion = input.termsVersion
      // Regenerate contract content if terms version changed
      if (input.termsVersion !== contract.termsVersion) {
        const contractContent = await this.generateContractContent(
          contract.bookingId,
          input.termsVersion
        )
        updateData.contractContent = contractContent as any
      }
    }

    if (input.contractContent) {
      updateData.contractContent = input.contractContent as any
    }

    updateData.updatedBy = userId

    const updated = await prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await AuditService.log({
      action: 'contract.updated',
      userId,
      resourceType: 'contract',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    return this.transformToContract(updated)
  }

  /**
   * Sign contract
   */
  static async sign(
    id: string,
    input: ContractSignInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Contract> {
    // Check permission
    const canSign = await hasPermission(userId, 'contract.sign' as any)
    if (!canSign) {
      throw new ForbiddenError('You do not have permission to sign contracts')
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!contract) {
      throw new NotFoundError('Contract', id)
    }

    // Check if already signed
    if (contract.signedAt) {
      throw new ValidationError('Contract already signed')
    }

    // Create signature data
    const signatureData: SignatureData = {
      signature: input.signature,
      signedBy: userId,
      signedAt: new Date(),
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    }

    // Update contract
    const updated = await prisma.contract.update({
      where: { id },
      data: {
        signedAt: new Date(),
        signedBy: userId,
        signatureData: signatureData as any,
        updatedBy: userId,
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await AuditService.log({
      action: 'contract.signed',
      userId,
      resourceType: 'contract',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        signedAt: updated.signedAt?.toISOString(),
      },
    })

    // Emit event
    await EventBus.emit('contract.signed', {
      contractId: id,
      bookingId: contract.bookingId,
      signedBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToContract(updated)
  }

  /**
   * Delete contract (soft delete)
   */
  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Check permission
    const canDelete = await hasPermission(userId, 'contract.delete' as any)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete contracts')
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!contract) {
      throw new NotFoundError('Contract', id)
    }

    // Soft delete
    await prisma.contract.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        updatedBy: userId,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'contract.deleted',
      userId,
      resourceType: 'contract',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })
  }

  /**
   * Transform Prisma contract to Contract type
   */
  private static transformToContract(contract: any): Contract {
    const contractContent = contract.contractContent as ContractContent
    const signatureData = contract.signatureData as SignatureData | null

    // Determine status
    let status: ContractStatus = 'draft'
    if (contract.signedAt) {
      status = 'signed'
    } else if (contract.createdAt) {
      status = 'pending_signature'
    }

    return {
      id: contract.id,
      bookingId: contract.bookingId,
      termsVersion: contract.termsVersion,
      contractContent,
      signedAt: contract.signedAt ? new Date(contract.signedAt) : null,
      signedBy: contract.signedBy || null,
      signatureData: signatureData || null,
      status,
      booking: contract.booking
        ? {
            id: contract.booking.id,
            bookingNumber: contract.booking.bookingNumber,
            customerId: contract.booking.customerId,
            customer: contract.booking.customer,
          }
        : null,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      createdBy: contract.createdBy || null,
      updatedBy: contract.updatedBy || null,
    }
  }
}
