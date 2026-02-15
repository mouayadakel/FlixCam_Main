/**
 * @file shoot-type.service.ts
 * @description Business logic for shoot types (Smart Kit Builder)
 * @module services/shoot-type
 */

import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { BudgetTier } from '@prisma/client'
import type { CreateShootTypeInput, UpdateShootTypeInput, CategoryFlowItemInput, RecommendationItemInput } from '@/lib/validators/shoot-type.validator'

const CACHE_NS = 'websiteContent' as const
const LIST_KEY = 'shoot-types-list'
const DETAIL_KEY_PREFIX = 'shoot-type:'

export interface ShootTypeListItem {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  nameZh: string | null
  icon: string | null
  coverImageUrl: string | null
  sortOrder: number
  isActive: boolean
  categoryCount: number
  recommendationCount: number
}

export interface CategoryStepConfig {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  sortOrder: number
  isRequired: boolean
  minRecommended: number | null
  maxRecommended: number | null
  stepTitle: string | null
  stepTitleAr: string | null
  stepDescription: string | null
  stepDescriptionAr: string | null
}

export interface EquipmentRecommendationItem {
  id: string
  equipmentId: string
  budgetTier: BudgetTier
  reason: string | null
  reasonAr: string | null
  defaultQuantity: number
  isAutoSelect: boolean
  sortOrder: number
  equipment: {
    id: string
    sku: string
    model: string | null
    dailyPrice: { toNumber: () => number }
    categoryId: string
    category: { id: string; name: string; slug: string }
    brand: { name: string; slug: string } | null
    media: { url: string; type: string }[]
    specifications: unknown
  }
}

export interface ShootTypeFullConfig {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  nameZh: string | null
  descriptionAr: string | null
  descriptionZh: string | null
  icon: string | null
  coverImageUrl: string | null
  sortOrder: number
  isActive: boolean
  questionnaire: unknown
  categorySteps: CategoryStepConfig[]
  recommendations: EquipmentRecommendationItem[]
}

export interface MatchingPrebuiltKit {
  id: string
  name: string
  slug: string
  description: string | null
  discountPercent: number | null
  itemCount: number
  totalDaily: number
  totalWithDiscount: number
  savingsPercent: number
  equipmentIds: string[]
}

export class ShootTypeService {
  /**
   * List all shoot types (admin can include inactive).
   */
  static async getAll(includeInactive = false): Promise<ShootTypeListItem[]> {
    const list = await prisma.shootType.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      include: {
        _count: {
          select: { categoryFlows: true, recommendations: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return list.map((st) => ({
      id: st.id,
      name: st.name,
      slug: st.slug,
      description: st.description,
      nameAr: st.nameAr,
      nameZh: st.nameZh,
      icon: st.icon,
      coverImageUrl: st.coverImageUrl,
      sortOrder: st.sortOrder,
      isActive: st.isActive,
      categoryCount: st._count.categoryFlows,
      recommendationCount: st._count.recommendations,
    }))
  }

  /**
   * Get full shoot type config by slug (for public kit builder). Cached.
   */
  static async getBySlug(slug: string): Promise<ShootTypeFullConfig | null> {
    const cacheKey = `${DETAIL_KEY_PREFIX}${slug}`
    const cached = await cacheGet<ShootTypeFullConfig>(CACHE_NS, cacheKey)
    if (cached) return cached

    const st = await prisma.shootType.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        categoryFlows: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
        recommendations: {
          include: {
            equipment: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
                brand: { select: { name: true, slug: true } },
                media: { select: { url: true, type: true } },
              },
            },
          },
          orderBy: [{ budgetTier: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    })
    if (!st) return null

    const categorySteps: CategoryStepConfig[] = st.categoryFlows.map((cf) => ({
      id: cf.id,
      categoryId: cf.categoryId,
      categoryName: cf.category.name,
      categorySlug: cf.category.slug,
      sortOrder: cf.sortOrder,
      isRequired: cf.isRequired,
      minRecommended: cf.minRecommended,
      maxRecommended: cf.maxRecommended,
      stepTitle: cf.stepTitle,
      stepTitleAr: cf.stepTitleAr,
      stepDescription: cf.stepDescription,
      stepDescriptionAr: cf.stepDescriptionAr,
    }))

    const recommendations: EquipmentRecommendationItem[] = st.recommendations.map((r) => ({
      id: r.id,
      equipmentId: r.equipmentId,
      budgetTier: r.budgetTier,
      reason: r.reason,
      reasonAr: r.reasonAr,
      defaultQuantity: r.defaultQuantity,
      isAutoSelect: r.isAutoSelect,
      sortOrder: r.sortOrder,
      equipment: {
        id: r.equipment.id,
        sku: r.equipment.sku,
        model: r.equipment.model,
        dailyPrice: r.equipment.dailyPrice,
        categoryId: r.equipment.categoryId,
        category: r.equipment.category,
        brand: r.equipment.brand,
        media: r.equipment.media,
        specifications: r.equipment.specifications,
      },
    }))

    const result: ShootTypeFullConfig = {
      id: st.id,
      name: st.name,
      slug: st.slug,
      description: st.description,
      nameAr: st.nameAr,
      nameZh: st.nameZh,
      descriptionAr: st.descriptionAr,
      descriptionZh: st.descriptionZh,
      icon: st.icon,
      coverImageUrl: st.coverImageUrl,
      sortOrder: st.sortOrder,
      isActive: st.isActive,
      questionnaire: st.questionnaire,
      categorySteps,
      recommendations,
    }
    await cacheSet(CACHE_NS, cacheKey, result)
    return result
  }

  /**
   * Get by ID (admin).
   */
  static async getById(id: string): Promise<ShootTypeFullConfig> {
    const st = await prisma.shootType.findFirst({
      where: { id, deletedAt: null },
      include: {
        categoryFlows: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
        recommendations: {
          include: {
            equipment: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
                brand: { select: { name: true, slug: true } },
                media: { select: { url: true, type: true } },
              },
            },
          },
          orderBy: [{ budgetTier: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    })
    if (!st) throw new NotFoundError('Shoot type', id)
    const categorySteps: CategoryStepConfig[] = st.categoryFlows.map((cf) => ({
      id: cf.id,
      categoryId: cf.categoryId,
      categoryName: cf.category.name,
      categorySlug: cf.category.slug,
      sortOrder: cf.sortOrder,
      isRequired: cf.isRequired,
      minRecommended: cf.minRecommended,
      maxRecommended: cf.maxRecommended,
      stepTitle: cf.stepTitle,
      stepTitleAr: cf.stepTitleAr,
      stepDescription: cf.stepDescription,
      stepDescriptionAr: cf.stepDescriptionAr,
    }))
    const recommendations: EquipmentRecommendationItem[] = st.recommendations.map((r) => ({
      id: r.id,
      equipmentId: r.equipmentId,
      budgetTier: r.budgetTier,
      reason: r.reason,
      reasonAr: r.reasonAr,
      defaultQuantity: r.defaultQuantity,
      isAutoSelect: r.isAutoSelect,
      sortOrder: r.sortOrder,
      equipment: {
        id: r.equipment.id,
        sku: r.equipment.sku,
        model: r.equipment.model,
        dailyPrice: r.equipment.dailyPrice,
        categoryId: r.equipment.categoryId,
        category: r.equipment.category,
        brand: r.equipment.brand,
        media: r.equipment.media,
        specifications: r.equipment.specifications,
      },
    }))
    return {
      id: st.id,
      name: st.name,
      slug: st.slug,
      description: st.description,
      nameAr: st.nameAr,
      nameZh: st.nameZh,
      descriptionAr: st.descriptionAr,
      descriptionZh: st.descriptionZh,
      icon: st.icon,
      coverImageUrl: st.coverImageUrl,
      sortOrder: st.sortOrder,
      isActive: st.isActive,
      questionnaire: st.questionnaire,
      categorySteps,
      recommendations,
    }
  }

  static async create(data: CreateShootTypeInput, userId?: string): Promise<ShootTypeFullConfig> {
    const existing = await prisma.shootType.findFirst({ where: { slug: data.slug, deletedAt: null } })
    if (existing) throw new ValidationError('A shoot type with this slug already exists', { slug: ['Slug must be unique'] })

    const st = await prisma.shootType.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        nameAr: data.nameAr ?? undefined,
        nameZh: data.nameZh ?? undefined,
        descriptionAr: data.descriptionAr ?? undefined,
        descriptionZh: data.descriptionZh ?? undefined,
        icon: data.icon ?? undefined,
        coverImageUrl: data.coverImageUrl || undefined,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        questionnaire: (data.questionnaire as object) ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    await this.invalidateCache(st.slug)
    return this.getById(st.id)
  }

  static async update(id: string, data: UpdateShootTypeInput, userId?: string): Promise<ShootTypeFullConfig> {
    const existing = await prisma.shootType.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Shoot type', id)
    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await prisma.shootType.findFirst({ where: { slug: data.slug, deletedAt: null } })
      if (slugTaken) throw new ValidationError('A shoot type with this slug already exists', { slug: ['Slug must be unique'] })
    }

    await prisma.shootType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.nameAr !== undefined && { nameAr: data.nameAr }),
        ...(data.nameZh !== undefined && { nameZh: data.nameZh }),
        ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr }),
        ...(data.descriptionZh !== undefined && { descriptionZh: data.descriptionZh }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl || null }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.questionnaire !== undefined && { questionnaire: data.questionnaire as object }),
        updatedBy: userId,
      },
    })
    await this.invalidateCache(existing.slug)
    if (data.slug) await this.invalidateCache(data.slug)
    return this.getById(id)
  }

  static async softDelete(id: string, userId?: string): Promise<void> {
    const st = await prisma.shootType.findFirst({ where: { id, deletedAt: null } })
    if (!st) throw new NotFoundError('Shoot type', id)
    await prisma.shootType.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    })
    await this.invalidateCache(st.slug)
  }

  static async updateCategoryFlow(shootTypeId: string, flows: CategoryFlowItemInput[]): Promise<void> {
    const st = await prisma.shootType.findFirst({ where: { id: shootTypeId, deletedAt: null } })
    if (!st) throw new NotFoundError('Shoot type', shootTypeId)

    await prisma.$transaction(async (tx) => {
      await tx.shootTypeCategoryFlow.deleteMany({ where: { shootTypeId } })
      if (flows.length > 0) {
        await tx.shootTypeCategoryFlow.createMany({
          data: flows.map((f) => ({
            shootTypeId,
            categoryId: f.categoryId,
            sortOrder: f.sortOrder,
            isRequired: f.isRequired,
            minRecommended: f.minRecommended ?? null,
            maxRecommended: f.maxRecommended ?? null,
            stepTitle: f.stepTitle ?? null,
            stepTitleAr: f.stepTitleAr ?? null,
            stepDescription: f.stepDescription ?? null,
            stepDescriptionAr: f.stepDescriptionAr ?? null,
          })),
        })
      }
    })
    await this.invalidateCache(st.slug)
  }

  static async setRecommendations(
    shootTypeId: string,
    recommendations: RecommendationItemInput[],
    categoryId?: string
  ): Promise<void> {
    const st = await prisma.shootType.findFirst({ where: { id: shootTypeId, deletedAt: null } })
    if (!st) throw new NotFoundError('Shoot type', shootTypeId)

    if (categoryId) {
      const toDelete = await prisma.shootTypeRecommendation.findMany({
        where: { shootTypeId, equipment: { categoryId } },
        select: { id: true },
      })
      if (toDelete.length > 0) {
        await prisma.shootTypeRecommendation.deleteMany({
          where: { id: { in: toDelete.map((d) => d.id) } },
        })
      }
    } else {
      await prisma.shootTypeRecommendation.deleteMany({ where: { shootTypeId } })
    }

    if (recommendations.length > 0) {
      await prisma.shootTypeRecommendation.createMany({
        data: recommendations.map((r, i) => ({
          shootTypeId,
          equipmentId: r.equipmentId,
          budgetTier: r.budgetTier as BudgetTier,
          reason: r.reason ?? null,
          reasonAr: r.reasonAr ?? null,
          defaultQuantity: r.defaultQuantity ?? 1,
          isAutoSelect: r.isAutoSelect ?? false,
          sortOrder: r.sortOrder ?? i,
        })),
      })
    }
    await this.invalidateCache(st.slug)
  }

  /**
   * Get recommendations for a category, optionally filtered by budget tier.
   */
  static async getRecommendationsForCategory(
    shootTypeId: string,
    categoryId: string,
    budgetTier?: BudgetTier | null
  ): Promise<EquipmentRecommendationItem[]> {
    const recs = await prisma.shootTypeRecommendation.findMany({
      where: {
        shootTypeId,
        equipment: { categoryId, isActive: true, deletedAt: null, quantityAvailable: { gt: 0 } },
        ...(budgetTier && { budgetTier }),
      },
      include: {
        equipment: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { name: true, slug: true } },
            media: { select: { url: true, type: true } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { budgetTier: 'asc' }],
    })
    return recs.map((r) => ({
      id: r.id,
      equipmentId: r.equipmentId,
      budgetTier: r.budgetTier,
      reason: r.reason,
      reasonAr: r.reasonAr,
      defaultQuantity: r.defaultQuantity,
      isAutoSelect: r.isAutoSelect,
      sortOrder: r.sortOrder,
      equipment: {
        id: r.equipment.id,
        sku: r.equipment.sku,
        model: r.equipment.model,
        dailyPrice: r.equipment.dailyPrice,
        categoryId: r.equipment.categoryId,
        category: r.equipment.category,
        brand: r.equipment.brand,
        media: r.equipment.media,
        specifications: r.equipment.specifications,
      },
    }))
  }

  /**
   * Find prebuilt kits that match (by equipment overlap) and compute savings.
   */
  static async findMatchingPrebuiltKits(equipmentIds: string[]): Promise<MatchingPrebuiltKit[]> {
    if (equipmentIds.length === 0) return []

    const kits = await prisma.kit.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        items: {
          include: {
            equipment: {
              select: {
                id: true,
                dailyPrice: true,
              },
            },
          },
        },
      },
    })

    const customerSet = new Set(equipmentIds)
    const results: MatchingPrebuiltKit[] = []

    for (const kit of kits) {
      const kitEquipmentIds = kit.items.map((i) => i.equipment.id)
      const overlap = kitEquipmentIds.filter((id) => customerSet.has(id))
      if (overlap.length === 0) continue
      const overlapRatio = overlap.length / kitEquipmentIds.length
      if (overlapRatio < 0.5) continue

      const totalDaily = kit.items.reduce(
        (sum, i) => sum + Number(i.equipment.dailyPrice) * i.quantity,
        0
      )
      const discount = kit.discountPercent ? Number(kit.discountPercent) : 0
      const totalWithDiscount = totalDaily * (1 - discount / 100)
      const savingsPercent = discount

      results.push({
        id: kit.id,
        name: kit.name,
        slug: kit.slug,
        description: kit.description,
        discountPercent: kit.discountPercent ? Number(kit.discountPercent) : null,
        itemCount: kit.items.length,
        totalDaily,
        totalWithDiscount,
        savingsPercent,
        equipmentIds: kitEquipmentIds,
      })
    }

    results.sort((a, b) => b.savingsPercent - a.savingsPercent)
    return results.slice(0, 3)
  }

  private static async invalidateCache(slug: string): Promise<void> {
    try {
      await cacheDelete(CACHE_NS, LIST_KEY)
      await cacheDelete(CACHE_NS, `${DETAIL_KEY_PREFIX}${slug}`)
    } catch {
      // ignore
    }
  }
}
