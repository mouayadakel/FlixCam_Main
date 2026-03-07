/**
 * @file studio-faq.service.ts
 * @description Business logic for studio FAQs (CMS)
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { cacheDelete } from '@/lib/cache'
import { NotFoundError } from '@/lib/errors'

async function invalidateStudioCache(studioId: string) {
  const st = await prisma.studio.findFirst({ where: { id: studioId }, select: { slug: true } })
  if (st) {
    await cacheDelete('equipmentDetail', `studio:${st.slug}`)
    await cacheDelete('equipmentList', 'studios')
  }
}
import type {
  CreateStudioFaqInput,
  UpdateStudioFaqInput,
} from '@/lib/validators/studio-faq.validator'

const MAX_FAQS_PER_STUDIO = 9

export class StudioFaqService {
  static async listByStudio(studioId: string, activeOnly = false) {
    return prisma.studioFaq.findMany({
      where: {
        studioId,
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { order: 'asc' },
    })
  }

  static async create(studioId: string, data: CreateStudioFaqInput, userId: string) {
    const count = await prisma.studioFaq.count({
      where: { studioId, deletedAt: null },
    })
    if (count >= MAX_FAQS_PER_STUDIO) {
      throw new Error(`Maximum ${MAX_FAQS_PER_STUDIO} FAQs per studio`)
    }

    const faq = await prisma.studioFaq.create({
      data: {
        studioId,
        questionAr: data.questionAr,
        questionEn: data.questionEn,
        questionZh: data.questionZh,
        answerAr: data.answerAr,
        answerEn: data.answerEn,
        answerZh: data.answerZh,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'studio.faq.created',
      userId,
      resourceType: 'studio_faq',
      resourceId: faq.id,
      metadata: { studioId },
    })

    await invalidateStudioCache(studioId)
    return faq
  }

  static async update(id: string, data: UpdateStudioFaqInput, userId: string) {
    const existing = await prisma.studioFaq.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Studio FAQ', id)

    const faq = await prisma.studioFaq.update({
      where: { id },
      data: {
        questionAr: data.questionAr,
        questionEn: data.questionEn,
        questionZh: data.questionZh,
        answerAr: data.answerAr,
        answerEn: data.answerEn,
        answerZh: data.answerZh,
        order: data.order,
        isActive: data.isActive,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'studio.faq.updated',
      userId,
      resourceType: 'studio_faq',
      resourceId: id,
      metadata: { studioId: existing.studioId },
    })

    await invalidateStudioCache(existing.studioId)
    return faq
  }

  static async delete(id: string, userId: string) {
    const existing = await prisma.studioFaq.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Studio FAQ', id)

    await prisma.studioFaq.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'studio.faq.deleted',
      userId,
      resourceType: 'studio_faq',
      resourceId: id,
      metadata: { studioId: existing.studioId },
    })

    await invalidateStudioCache(existing.studioId)
    return { success: true }
  }

  static async reorder(studioId: string, faqIds: string[], userId: string) {
    await prisma.$transaction(
      faqIds.map((id, index) =>
        prisma.studioFaq.updateMany({
          where: { id, studioId, deletedAt: null },
          data: { order: index, updatedBy: userId },
        })
      )
    )

    await AuditService.log({
      action: 'studio.faq.reordered',
      userId,
      resourceType: 'studio',
      resourceId: studioId,
      metadata: { faqIds },
    })

    await invalidateStudioCache(studioId)
    return { success: true }
  }
}
