/**
 * @file studio-package.service.ts
 * @description Business logic for studio packages (CMS)
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { Decimal } from '@prisma/client/runtime/library'
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
  CreateStudioPackageInput,
  UpdateStudioPackageInput,
} from '@/lib/validators/studio-package.validator'

const MAX_PACKAGES_PER_STUDIO = 15

export class StudioPackageService {
  static async listByStudio(studioId: string) {
    return prisma.studioPackage.findMany({
      where: { studioId, deletedAt: null },
      orderBy: { order: 'asc' },
    })
  }

  static async create(studioId: string, data: CreateStudioPackageInput, userId: string) {
    const count = await prisma.studioPackage.count({
      where: { studioId, deletedAt: null },
    })
    if (count >= MAX_PACKAGES_PER_STUDIO) {
      throw new Error(`Maximum ${MAX_PACKAGES_PER_STUDIO} packages per studio`)
    }

    const pkg = await prisma.studioPackage.create({
      data: {
        studioId,
        name: data.name,
        nameAr: data.nameAr,
        nameZh: data.nameZh,
        description: data.description,
        descriptionAr: data.descriptionAr,
        includes: data.includes,
        price: new Decimal(data.price),
        originalPrice: data.originalPrice != null ? new Decimal(data.originalPrice) : null,
        discountPercent: data.discountPercent,
        hours: data.hours,
        recommended: data.recommended ?? false,
        badgeText: data.badgeText,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'studio.package.created',
      userId,
      resourceType: 'studio_package',
      resourceId: pkg.id,
      metadata: { studioId, name: pkg.name },
    })

    await invalidateStudioCache(studioId)
    return pkg
  }

  static async update(id: string, data: UpdateStudioPackageInput, userId: string) {
    const existing = await prisma.studioPackage.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Studio package', id)

    const pkg = await prisma.studioPackage.update({
      where: { id },
      data: {
        name: data.name,
        nameAr: data.nameAr,
        nameZh: data.nameZh,
        description: data.description,
        descriptionAr: data.descriptionAr,
        includes: data.includes,
        price: data.price != null ? new Decimal(data.price) : undefined,
        originalPrice: data.originalPrice != null ? new Decimal(data.originalPrice) : undefined,
        discountPercent: data.discountPercent,
        hours: data.hours,
        recommended: data.recommended,
        badgeText: data.badgeText,
        order: data.order,
        isActive: data.isActive,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'studio.package.updated',
      userId,
      resourceType: 'studio_package',
      resourceId: id,
      metadata: { studioId: existing.studioId },
    })

    await invalidateStudioCache(existing.studioId)
    return pkg
  }

  static async delete(id: string, userId: string) {
    const existing = await prisma.studioPackage.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Studio package', id)

    await prisma.studioPackage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'studio.package.deleted',
      userId,
      resourceType: 'studio_package',
      resourceId: id,
      metadata: { studioId: existing.studioId },
    })

    await invalidateStudioCache(existing.studioId)
    return { success: true }
  }

  static async reorder(studioId: string, packageIds: string[], userId: string) {
    await prisma.$transaction(
      packageIds.map((id, index) =>
        prisma.studioPackage.updateMany({
          where: { id, studioId, deletedAt: null },
          data: { order: index, updatedBy: userId },
        })
      )
    )

    await AuditService.log({
      action: 'studio.package.reordered',
      userId,
      resourceType: 'studio',
      resourceId: studioId,
      metadata: { packageIds },
    })

    await invalidateStudioCache(studioId)
    return { success: true }
  }
}
