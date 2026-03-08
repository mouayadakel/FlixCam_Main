/**
 * @file policy.service.ts
 * @description Business logic for rental policy items (policies page)
 * @module services/policy
 */

import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache'
import { AuditService } from '@/lib/services/audit.service'
import { NotFoundError } from '@/lib/errors'
import type {
  CreatePolicyInput,
  UpdatePolicyInput,
  ReorderPolicyInput,
} from '@/lib/validators/policy.validator'

const CACHE_NS = 'policy' as const
const POLICY_CACHE_KEY = 'list'

export interface PolicyItemPublic {
  id: string
  titleAr: string
  titleEn: string
  titleZh: string | null
  bodyAr: string
  bodyEn: string
  bodyZh: string | null
  order: number
}

export interface PolicyItemListItem {
  id: string
  titleAr: string
  titleEn: string
  titleZh: string | null
  bodyAr: string
  bodyEn: string
  bodyZh: string | null
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class PolicyService {
  /**
   * Get active policy items for public display. Cached.
   */
  static async getPublicPolicies(): Promise<PolicyItemPublic[]> {
    const cached = await cacheGet<PolicyItemPublic[]>(CACHE_NS, POLICY_CACHE_KEY)
    if (cached) return cached

    const items = await prisma.policyItem.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        titleZh: true,
        bodyAr: true,
        bodyEn: true,
        bodyZh: true,
        order: true,
      },
    })
    const result = items.map((i) => ({
      id: i.id,
      titleAr: i.titleAr,
      titleEn: i.titleEn,
      titleZh: i.titleZh,
      bodyAr: i.bodyAr,
      bodyEn: i.bodyEn,
      bodyZh: i.bodyZh,
      order: i.order,
    }))
    await cacheSet(CACHE_NS, POLICY_CACHE_KEY, result)
    return result
  }

  /**
   * List all policy items (admin), ordered by order ASC.
   */
  static async getAll(): Promise<PolicyItemListItem[]> {
    const list = await prisma.policyItem.findMany({
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
    })
    return list.map((i) => ({
      id: i.id,
      titleAr: i.titleAr,
      titleEn: i.titleEn,
      titleZh: i.titleZh,
      bodyAr: i.bodyAr,
      bodyEn: i.bodyEn,
      bodyZh: i.bodyZh,
      order: i.order,
      isActive: i.isActive,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }))
  }

  /**
   * Get single policy item by ID (admin).
   */
  static async getById(id: string): Promise<PolicyItemListItem> {
    const item = await prisma.policyItem.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) throw new NotFoundError('Policy item', id)
    return {
      id: item.id,
      titleAr: item.titleAr,
      titleEn: item.titleEn,
      titleZh: item.titleZh,
      bodyAr: item.bodyAr,
      bodyEn: item.bodyEn,
      bodyZh: item.bodyZh,
      order: item.order,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }

  /**
   * Create a new policy item.
   */
  static async create(data: CreatePolicyInput, userId?: string): Promise<PolicyItemListItem> {
    const maxOrder = await prisma.policyItem
      .aggregate({
        where: { deletedAt: null },
        _max: { order: true },
      })
      .then((r) => r._max.order ?? -1)

    const item = await prisma.policyItem.create({
      data: {
        titleAr: data.titleAr,
        titleEn: data.titleEn,
        titleZh: data.titleZh ?? null,
        bodyAr: data.bodyAr,
        bodyEn: data.bodyEn,
        bodyZh: data.bodyZh ?? null,
        order: data.order ?? maxOrder + 1,
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    await this.invalidateCache()
    await AuditService.log({
      action: 'policy_item.created',
      userId,
      resourceType: 'policyItem',
      resourceId: item.id,
    })
    return this.getById(item.id)
  }

  /**
   * Update a policy item.
   */
  static async update(
    id: string,
    data: UpdatePolicyInput,
    userId?: string
  ): Promise<PolicyItemListItem> {
    const existing = await prisma.policyItem.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Policy item', id)

    await prisma.policyItem.update({
      where: { id },
      data: {
        ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
        ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
        ...(data.titleZh !== undefined && { titleZh: data.titleZh ?? null }),
        ...(data.bodyAr !== undefined && { bodyAr: data.bodyAr }),
        ...(data.bodyEn !== undefined && { bodyEn: data.bodyEn }),
        ...(data.bodyZh !== undefined && { bodyZh: data.bodyZh ?? null }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    await this.invalidateCache()
    await AuditService.log({
      action: 'policy_item.updated',
      userId,
      resourceType: 'policyItem',
      resourceId: id,
    })
    return this.getById(id)
  }

  /**
   * Soft delete a policy item.
   */
  static async delete(id: string, userId?: string): Promise<void> {
    const item = await prisma.policyItem.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) throw new NotFoundError('Policy item', id)
    await prisma.policyItem.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    await this.invalidateCache()
    await AuditService.log({
      action: 'policy_item.deleted',
      userId,
      resourceType: 'policyItem',
      resourceId: id,
    })
  }

  /**
   * Reorder policy items by array of IDs (order = index).
   */
  static async reorder(data: ReorderPolicyInput, userId?: string): Promise<PolicyItemListItem[]> {
    await prisma.$transaction(
      data.policyIds.map((id, index) =>
        prisma.policyItem.updateMany({
          where: { id, deletedAt: null },
          data: { order: index, updatedBy: userId, updatedAt: new Date() },
        })
      )
    )
    await this.invalidateCache()
    await AuditService.log({
      action: 'policy_items.reordered',
      userId,
      resourceType: 'policyItem',
      resourceId: '',
      metadata: { policyIds: data.policyIds },
    })
    return this.getAll()
  }

  private static async invalidateCache(): Promise<void> {
    try {
      await cacheDelete(CACHE_NS, POLICY_CACHE_KEY)
    } catch {
      // ignore
    }
  }
}
