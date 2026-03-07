/**
 * @file faq.service.ts
 * @description Business logic for homepage FAQ items
 * @module services/faq
 */

import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache'
import { AuditService } from '@/lib/services/audit.service'
import { NotFoundError } from '@/lib/errors'
import type {
  CreateFaqInput,
  UpdateFaqInput,
  ReorderFaqInput,
} from '@/lib/validators/faq.validator'

const CACHE_NS = 'faq' as const
const FAQ_CACHE_KEY = 'list'

export interface FaqItemPublic {
  id: string
  questionAr: string
  questionEn: string
  questionZh: string | null
  answerAr: string
  answerEn: string
  answerZh: string | null
  order: number
}

export interface FaqItemListItem {
  id: string
  questionAr: string
  questionEn: string
  questionZh: string | null
  answerAr: string
  answerEn: string
  answerZh: string | null
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class FaqService {
  /**
   * Get active FAQ items for public display. Cached.
   */
  static async getPublicFaq(): Promise<FaqItemPublic[]> {
    const cached = await cacheGet<FaqItemPublic[]>(CACHE_NS, FAQ_CACHE_KEY)
    if (cached) return cached

    const items = await prisma.faqItem.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        questionAr: true,
        questionEn: true,
        questionZh: true,
        answerAr: true,
        answerEn: true,
        answerZh: true,
        order: true,
      },
    })
    const result = items.map((i) => ({
      id: i.id,
      questionAr: i.questionAr,
      questionEn: i.questionEn,
      questionZh: i.questionZh,
      answerAr: i.answerAr,
      answerEn: i.answerEn,
      answerZh: i.answerZh,
      order: i.order,
    }))
    await cacheSet(CACHE_NS, FAQ_CACHE_KEY, result)
    return result
  }

  /**
   * List all FAQ items (admin), ordered by order ASC.
   */
  static async getAll(): Promise<FaqItemListItem[]> {
    const list = await prisma.faqItem.findMany({
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
    })
    return list.map((i) => ({
      id: i.id,
      questionAr: i.questionAr,
      questionEn: i.questionEn,
      questionZh: i.questionZh,
      answerAr: i.answerAr,
      answerEn: i.answerEn,
      answerZh: i.answerZh,
      order: i.order,
      isActive: i.isActive,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }))
  }

  /**
   * Get single FAQ item by ID (admin).
   */
  static async getById(id: string): Promise<FaqItemListItem> {
    const item = await prisma.faqItem.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) throw new NotFoundError('FAQ item', id)
    return {
      id: item.id,
      questionAr: item.questionAr,
      questionEn: item.questionEn,
      questionZh: item.questionZh,
      answerAr: item.answerAr,
      answerEn: item.answerEn,
      answerZh: item.answerZh,
      order: item.order,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }

  /**
   * Create a new FAQ item.
   */
  static async create(data: CreateFaqInput, userId?: string): Promise<FaqItemListItem> {
    const maxOrder = await prisma.faqItem
      .aggregate({
        where: { deletedAt: null },
        _max: { order: true },
      })
      .then((r) => r._max.order ?? -1)

    const item = await prisma.faqItem.create({
      data: {
        questionAr: data.questionAr,
        questionEn: data.questionEn,
        questionZh: data.questionZh ?? null,
        answerAr: data.answerAr,
        answerEn: data.answerEn,
        answerZh: data.answerZh ?? null,
        order: data.order ?? maxOrder + 1,
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    await this.invalidateCache()
    await AuditService.log({
      action: 'faq_item.created',
      userId,
      resourceType: 'faqItem',
      resourceId: item.id,
    })
    return this.getById(item.id)
  }

  /**
   * Update an FAQ item.
   */
  static async update(id: string, data: UpdateFaqInput, userId?: string): Promise<FaqItemListItem> {
    const existing = await prisma.faqItem.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('FAQ item', id)

    await prisma.faqItem.update({
      where: { id },
      data: {
        ...(data.questionAr !== undefined && { questionAr: data.questionAr }),
        ...(data.questionEn !== undefined && { questionEn: data.questionEn }),
        ...(data.questionZh !== undefined && { questionZh: data.questionZh ?? null }),
        ...(data.answerAr !== undefined && { answerAr: data.answerAr }),
        ...(data.answerEn !== undefined && { answerEn: data.answerEn }),
        ...(data.answerZh !== undefined && { answerZh: data.answerZh ?? null }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    await this.invalidateCache()
    await AuditService.log({
      action: 'faq_item.updated',
      userId,
      resourceType: 'faqItem',
      resourceId: id,
    })
    return this.getById(id)
  }

  /**
   * Soft delete an FAQ item.
   */
  static async delete(id: string, userId?: string): Promise<void> {
    const item = await prisma.faqItem.findFirst({
      where: { id, deletedAt: null },
    })
    if (!item) throw new NotFoundError('FAQ item', id)
    await prisma.faqItem.update({
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
      action: 'faq_item.deleted',
      userId,
      resourceType: 'faqItem',
      resourceId: id,
    })
  }

  /**
   * Reorder FAQ items by array of IDs (order = index).
   */
  static async reorder(data: ReorderFaqInput, userId?: string): Promise<FaqItemListItem[]> {
    await prisma.$transaction(
      data.faqIds.map((id, index) =>
        prisma.faqItem.updateMany({
          where: { id, deletedAt: null },
          data: { order: index, updatedBy: userId, updatedAt: new Date() },
        })
      )
    )
    await this.invalidateCache()
    await AuditService.log({
      action: 'faq_items.reordered',
      userId,
      resourceType: 'faqItem',
      resourceId: '',
      metadata: { faqIds: data.faqIds },
    })
    return this.getAll()
  }

  private static async invalidateCache(): Promise<void> {
    try {
      await cacheDelete(CACHE_NS, FAQ_CACHE_KEY)
    } catch {
      // ignore
    }
  }
}
