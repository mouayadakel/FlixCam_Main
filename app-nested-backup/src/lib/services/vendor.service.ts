/**
 * @file vendor.service.ts
 * @description Business logic for vendor (multi-vendor marketplace) management
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { AuditService } from './audit.service'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hashPassword } from '@/lib/auth/auth-helpers'
import { UserRole, VendorStatus } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'

export interface CreateVendorInput {
  email: string
  password: string
  name?: string
  phone?: string
  companyName: string
  companyNameAr?: string
  description?: string
  commercialReg?: string
  vatNumber?: string
  bankName?: string
  iban?: string
  commissionRate?: number
}

export interface UpdateVendorInput {
  companyName?: string
  companyNameAr?: string
  description?: string
  phone?: string
  email?: string
  commercialReg?: string
  vatNumber?: string
  bankName?: string
  iban?: string
  commissionRate?: number
  isNameVisible?: boolean
}

export interface VendorFilters {
  status?: VendorStatus
  search?: string
  skip?: number
  take?: number
}

export interface VendorEarningsFilters {
  startDate?: Date
  endDate?: Date
}

function toNumber(d: Decimal | null | undefined): number {
  if (d == null) return 0
  return typeof d === 'object' && 'toNumber' in d ? (d as Decimal).toNumber() : Number(d)
}

export class VendorService {
  /**
   * Create vendor (admin only, invite-only)
   */
  static async createVendor(input: CreateVendorInput, adminUserId: string) {
    const canCreate = await hasPermission(adminUserId, 'vendor.create' as never)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create vendors')
    }

    const existing = await prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    })
    if (existing) {
      throw new ValidationError('Email already exists')
    }

    const slug = input.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const existingSlug = await prisma.vendor.findFirst({
      where: { slug },
    })
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug

    const passwordHash = await hashPassword(input.password)
    const commissionRate = input.commissionRate ?? 15

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name ?? input.companyName,
          phone: input.phone ?? null,
          role: UserRole.VENDOR,
          status: 'active',
          createdBy: adminUserId,
        },
      })

      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          companyName: input.companyName,
          companyNameAr: input.companyNameAr ?? null,
          slug: finalSlug,
          description: input.description ?? null,
          phone: input.phone ?? null,
          email: input.email,
          commercialReg: input.commercialReg ?? null,
          vatNumber: input.vatNumber ?? null,
          bankName: input.bankName ?? null,
          iban: input.iban ?? null,
          commissionRate,
          status: VendorStatus.PENDING,
          createdBy: adminUserId,
        },
        include: { user: { select: { id: true, email: true, name: true } } },
      })

      return vendor
    })

    await AuditService.log({
      action: 'vendor.created',
      userId: adminUserId,
      resourceType: 'vendor',
      resourceId: result.id,
      metadata: { companyName: input.companyName, email: input.email },
    })

    return result
  }

  /**
   * Approve vendor (admin only)
   */
  static async approveVendor(vendorId: string, adminUserId: string) {
    const canApprove = await hasPermission(adminUserId, 'vendor.approve' as never)
    if (!canApprove) {
      throw new ForbiddenError('You do not have permission to approve vendors')
    }

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: VendorStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminUserId,
        updatedAt: new Date(),
        updatedBy: adminUserId,
      },
    })

    await AuditService.log({
      action: 'vendor.approved',
      userId: adminUserId,
      resourceType: 'vendor',
      resourceId: vendorId,
    })

    return this.getVendorById(vendorId, adminUserId)
  }

  /**
   * Suspend vendor (admin only)
   */
  static async suspendVendor(vendorId: string, adminUserId: string, reason?: string) {
    const canSuspend = await hasPermission(adminUserId, 'vendor.suspend' as never)
    if (!canSuspend) {
      throw new ForbiddenError('You do not have permission to suspend vendors')
    }

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: VendorStatus.SUSPENDED,
        updatedAt: new Date(),
        updatedBy: adminUserId,
      },
    })

    await prisma.user.update({
      where: { id: vendor.userId },
      data: { status: 'suspended', updatedAt: new Date(), updatedBy: adminUserId },
    })

    await AuditService.log({
      action: 'vendor.suspended',
      userId: adminUserId,
      resourceType: 'vendor',
      resourceId: vendorId,
      metadata: { reason },
    })

    return this.getVendorById(vendorId, adminUserId)
  }

  /**
   * Reactivate suspended vendor (admin only)
   */
  static async reactivateVendor(vendorId: string, adminUserId: string) {
    const canUpdate = await hasPermission(adminUserId, 'vendor.update' as never)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update vendors')
    }

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: VendorStatus.APPROVED,
        updatedAt: new Date(),
        updatedBy: adminUserId,
      },
    })

    await prisma.user.update({
      where: { id: vendor.userId },
      data: { status: 'active', updatedAt: new Date(), updatedBy: adminUserId },
    })

    await AuditService.log({
      action: 'vendor.reactivated',
      userId: adminUserId,
      resourceType: 'vendor',
      resourceId: vendorId,
    })

    return this.getVendorById(vendorId, adminUserId)
  }

  /**
   * Get vendor by ID (admin or the vendor themselves)
   */
  static async getVendorById(id: string, userId: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true, status: true } },
        equipment: {
          where: { deletedAt: null },
          select: { id: true, sku: true, model: true, isActive: true },
        },
      },
    })

    if (!vendor) throw new NotFoundError('Vendor', id)

    const isAdmin = await hasPermission(userId, 'vendor.read' as never)
    const isOwnVendor = vendor.userId === userId
    if (!isAdmin && !isOwnVendor) {
      throw new ForbiddenError('You do not have permission to view this vendor')
    }

    return vendor
  }

  /**
   * Get vendor list (admin only)
   */
  static async getVendorList(filters: VendorFilters = {}, adminUserId: string) {
    const canRead = await hasPermission(adminUserId, 'vendor.read' as never)
    if (!canRead) {
      throw new ForbiddenError('You do not have permission to view vendors')
    }

    const { status, search, skip = 0, take = 50 } = filters

    const where: Record<string, unknown> = { deletedAt: null }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { companyNameAr: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          _count: { select: { equipment: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.vendor.count({ where }),
    ])

    return { items, total, skip, take }
  }

  /**
   * Update vendor (admin or vendor for own profile)
   */
  static async updateVendor(id: string, input: UpdateVendorInput, userId: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', id)

    const isAdmin = await hasPermission(userId, 'vendor.update' as never)
    const isOwnVendor = vendor.userId === userId

    if (!isAdmin && !isOwnVendor) {
      throw new ForbiddenError('You do not have permission to update this vendor')
    }

    const allowedFields: (keyof UpdateVendorInput)[] = isAdmin
      ? [
          'companyName',
          'companyNameAr',
          'description',
          'phone',
          'email',
          'commercialReg',
          'vatNumber',
          'bankName',
          'iban',
          'commissionRate',
          'isNameVisible',
        ]
      : ['companyName', 'companyNameAr', 'description', 'phone', 'bankName', 'iban']

    const data: Record<string, unknown> = { updatedAt: new Date(), updatedBy: userId }
    for (const key of allowedFields) {
      if (input[key] !== undefined) {
        ;(data as Record<string, unknown>)[key] = input[key]
      }
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    await AuditService.log({
      action: 'vendor.updated',
      userId,
      resourceType: 'vendor',
      resourceId: id,
    })

    return updated
  }

  /**
   * Toggle vendor name visibility (admin only)
   */
  static async toggleVisibility(vendorId: string, adminUserId: string) {
    const canToggle = await hasPermission(adminUserId, 'vendor.toggle_visibility' as never)
    if (!canToggle) {
      throw new ForbiddenError('You do not have permission to toggle vendor visibility')
    }

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    const newValue = !vendor.isNameVisible
    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: { isNameVisible: newValue, updatedAt: new Date(), updatedBy: adminUserId },
    })

    await AuditService.log({
      action: 'vendor.visibility_toggled',
      userId: adminUserId,
      resourceType: 'vendor',
      resourceId: vendorId,
      metadata: { isNameVisible: newValue },
    })

    return updated
  }

  /**
   * Get vendor by user ID (for vendor dashboard)
   */
  static async getVendorByUserId(userId: string) {
    const vendor = await prisma.vendor.findFirst({
      where: {
        userId,
        deletedAt: null,
        status: VendorStatus.APPROVED,
      },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
    })
    return vendor
  }

  /**
   * Get vendor's equipment
   */
  static async getVendorEquipment(
    vendorId: string,
    filters: { skip?: number; take?: number; isActive?: boolean } = {},
    requestUserId: string
  ) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    const isAdmin = await hasPermission(requestUserId, 'vendor.read' as never)
    const isOwnVendor = vendor.userId === requestUserId
    if (!isAdmin && !isOwnVendor) {
      throw new ForbiddenError('You do not have permission to view this vendor equipment')
    }

    const { skip = 0, take = 50, isActive } = filters
    const where: Record<string, unknown> = { vendorId, deletedAt: null }
    if (isActive !== undefined) where.isActive = isActive

    const [items, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          media: {
            where: { deletedAt: null },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.equipment.count({ where }),
    ])

    return { items, total, skip, take }
  }

  /**
   * Get vendor earnings for date range
   */
  static async getVendorEarnings(
    vendorId: string,
    filters: VendorEarningsFilters = {},
    requestUserId: string
  ) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    const isAdmin = await hasPermission(requestUserId, 'vendor.read' as never)
    const isOwnVendor = vendor.userId === requestUserId
    if (!isAdmin && !isOwnVendor) {
      throw new ForbiddenError('You do not have permission to view this vendor earnings')
    }

    const payouts = await prisma.vendorPayout.findMany({
      where: {
        vendorId,
        ...(filters.startDate || filters.endDate
          ? {
              createdAt: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    const totals = payouts.reduce(
      (acc, p) => ({
        gross: acc.gross + toNumber(p.grossAmount),
        commission: acc.commission + toNumber(p.commissionAmount),
        net: acc.net + toNumber(p.netAmount),
      }),
      { gross: 0, commission: 0, net: 0 }
    )

    return { payouts, totals }
  }

  /**
   * Get vendor dashboard stats
   */
  static async getVendorDashboardStats(vendorId: string, requestUserId: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    const isOwnVendor = vendor.userId === requestUserId
    if (!isOwnVendor) {
      const canRead = await hasPermission(requestUserId, 'vendor.read' as never)
      if (!canRead) throw new ForbiddenError('You do not have permission to view this vendor')
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [equipmentCount, activeRentalsCount, monthEarnings, allTimeEarnings, recentBookings] =
      await Promise.all([
        prisma.equipment.count({
          where: {
            vendorId,
            deletedAt: null,
            isActive: true,
          },
        }),
        prisma.bookingEquipment.count({
          where: {
            equipment: { vendorId },
            booking: {
              status: { in: ['CONFIRMED', 'ACTIVE'] },
              deletedAt: null,
            },
          },
        }),
        prisma.vendorPayout.aggregate({
          where: {
            vendorId,
            createdAt: { gte: startOfMonth },
          },
          _sum: { netAmount: true },
        }),
        prisma.vendorPayout.aggregate({
          where: { vendorId },
          _sum: { netAmount: true },
        }),
        prisma.booking.findMany({
          where: {
            equipment: { some: { equipment: { vendorId } } },
            deletedAt: null,
          },
          include: {
            equipment: {
              where: { equipment: { vendorId } },
              include: { equipment: { select: { sku: true, model: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ])

    const monthlyData = await this.getMonthlyEarnings(vendorId, 6)

    return {
      totalEquipment: equipmentCount,
      activeRentals: activeRentalsCount,
      thisMonthEarnings: toNumber(monthEarnings._sum.netAmount),
      allTimeEarnings: toNumber(allTimeEarnings._sum.netAmount),
      recentBookings,
      monthlyEarnings: monthlyData,
    }
  }

  static async getMonthlyEarnings(vendorId: string, months: number = 6) {
    const results: { month: string; gross: number; net: number }[] = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const payouts = await prisma.vendorPayout.findMany({
        where: {
          vendorId,
          createdAt: { gte: d, lte: next },
        },
      })
      const gross = payouts.reduce((s, p) => s + toNumber(p.grossAmount), 0)
      const net = payouts.reduce((s, p) => s + toNumber(p.netAmount), 0)
      results.push({
        month: d.toISOString().slice(0, 7),
        gross,
        net,
      })
    }

    return results
  }
}
