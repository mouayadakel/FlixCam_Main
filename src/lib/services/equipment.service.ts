/**
 * @file equipment.service.ts
 * @description Business logic for equipment management
 * @module services/equipment
 */

import { prisma } from '@/lib/db/prisma'
import type { Equipment, EquipmentCondition, Prisma } from '@prisma/client'
import { TranslationService } from './translation.service'
import { MediaService } from './media.service'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import { generateSlug, ensureUniqueEquipmentSlug } from '@/lib/utils/slug.utils'
import { convertFlatToStructured } from '@/lib/utils/specifications.utils'
import { resolveTemplateName } from '@/lib/ai/spec-templates'
import { syncEquipmentToProduct } from '@/lib/services/product-equipment-sync.service'

export interface EquipmentTranslationInput {
  locale: 'ar' | 'en' | 'zh' | 'fr'
  name?: string
  description?: string
  shortDescription?: string
  longDescription?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
}

export type VendorSubmissionStatus = 'pending_review' | 'approved' | 'rejected'

export interface CreateEquipmentInput {
  sku?: string
  model?: string | null
  categoryId?: string
  subCategoryId?: string
  brandId?: string
  vendorId?: string
  condition?: EquipmentCondition
  quantityTotal?: number
  quantityAvailable?: number
  dailyPrice?: number
  weeklyPrice?: number
  monthlyPrice?: number
  /** سعر الشراء — internal only, for tracking and سند الأمر */
  purchasePrice?: number
  depositAmount?: number
  /** التأمين إلزامي للعميل — default false */
  requiresDeposit?: boolean
  featured?: boolean
  isActive?: boolean
  requiresAssistant?: boolean
  warehouseLocation?: string
  barcode?: string
  specifications?: Record<string, unknown>
  customFields?: Record<string, unknown>
  createdBy: string
  translations?: EquipmentTranslationInput[]
  featuredImageUrl?: string
  galleryImageUrls?: string[]
  videoUrl?: string
  relatedEquipmentIds?: string[]
  boxContents?: string
  tags?: string
  bufferTime?: number
  bufferTimeUnit?: 'hours' | 'days'
  vendorSubmissionStatus?: VendorSubmissionStatus
  specConfidence?: number
  specLastInferredAt?: Date
  specSource?: 'import' | 'ai-infer' | 'url-extract' | 'manual' | 'migration'
  itemType?: 'crew' | 'equipment'
  bookingMode?: 'cart' | 'quote'
  crewProfile?: {
    nameEn?: string
    nameAr?: string
    bioEn?: string
    bioAr?: string
    experienceYears?: number
    specialties?: string[]
    photoUrl?: string
  }
}

export interface UpdateEquipmentInput extends Partial<CreateEquipmentInput> {
  id: string
  updatedBy: string
}

export interface EquipmentFilters {
  search?: string
  categoryId?: string
  brandId?: string
  vendorId?: string
  condition?: EquipmentCondition
  isActive?: boolean
  featured?: boolean
  skip?: number
  take?: number
}

function specificationsJsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export function assessSpecsReadiness(
  specifications: unknown
): { ready: boolean; warnings: string[] } {
  const warnings: string[] = []
  if (!specifications || typeof specifications !== 'object') {
    warnings.push('Specifications are missing')
    return { ready: false, warnings }
  }

  if (isStructuredSpecifications(specifications)) {
    const groups = specifications.groups ?? []
    const specCount = groups.reduce((sum, group) => sum + (group.specs?.length ?? 0), 0)
    if (groups.length === 0) warnings.push('Specifications have no groups')
    if (specCount === 0) warnings.push('Specification groups contain no items')
    return { ready: warnings.length === 0, warnings }
  }

  warnings.push('Specifications are not in structured groups format')
  return { ready: false, warnings }
}

export class EquipmentService {
  private static async normalizeSpecificationsForStorage(input: {
    specifications?: unknown
    categoryId: string
  }): Promise<Record<string, unknown> | undefined> {
    const specs = input.specifications
    if (!specs || typeof specs !== 'object') return undefined
    if (isStructuredSpecifications(specs)) {
      return JSON.parse(JSON.stringify(specs)) as Record<string, unknown>
    }

    // Flat → Structured for long-term storage
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, deletedAt: null },
      select: { name: true, slug: true },
    })
    const categoryHint = resolveTemplateName(category?.slug || category?.name || 'Equipment')
      .toLowerCase()
    const structured = convertFlatToStructured(specs as Record<string, unknown>, categoryHint)
    return JSON.parse(JSON.stringify(structured)) as Record<string, unknown>
  }

  /**
   * Get equipment list with filters
   */
  static async getEquipmentList(filters: EquipmentFilters = {}) {
    const {
      search,
      categoryId,
      brandId,
      vendorId,
      condition,
      isActive,
      featured,
      skip: skipIn = 0,
      take: takeIn = 50,
    } = filters

    const skip = Number.isFinite(skipIn) && skipIn >= 0 ? Math.min(skipIn, 10000) : 0
    const take = Number.isFinite(takeIn) && takeIn >= 1 ? Math.min(takeIn, 500) : 50

    const where: Record<string, unknown> = {
      deletedAt: null,
    }

    if (vendorId) {
      where.vendorId = vendorId
    }

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (brandId) {
      where.brandId = brandId
    }

    if (condition) {
      where.condition = condition
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (featured !== undefined) {
      where.featured = featured
    }

    const [items, total] = await Promise.all([
      prisma.equipment.findMany({
        where: where as Prisma.EquipmentWhereInput,
        include: {
          vendor: {
            select: { id: true, companyName: true, isNameVisible: true },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          media: {
            where: {
              deletedAt: null,
              type: 'image',
            },
            take: 1,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          maintenance: {
            where: { completedDate: { not: null } },
            orderBy: { completedDate: 'desc' },
            take: 1,
            select: { completedDate: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.equipment.count({ where: where as Prisma.EquipmentWhereInput }),
    ])

    return {
      items,
      total,
      skip,
      take,
    }
  }

  /**
   * Get equipment by ID
   */
  static async getEquipmentById(id: string) {
    const [equipment, translations] = await Promise.all([
      prisma.equipment.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          category: true,
          brand: true,
          vendor: {
            select: { id: true, companyName: true, isNameVisible: true },
          },
          media: {
            where: {
              deletedAt: null,
              type: 'image',
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          bookings: {
            where: {
              deletedAt: null,
              booking: {
                deletedAt: null,
              },
            },
            include: {
              booking: {
                select: {
                  id: true,
                  bookingNumber: true,
                  status: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      }),
      TranslationService.getTranslationsByLocale('equipment', id),
    ])

    if (!equipment) {
      throw new Error('Equipment not found')
    }

    // Parse customFields for related equipment, box contents, buffer time
    const customFields = equipment.customFields as Record<string, unknown> | null
    const relatedEquipmentIds = (customFields?.relatedEquipmentIds as string[]) || []
    const boxContents = (customFields?.boxContents as string) || undefined
    const tags = (customFields?.tags as string) || undefined
    const bufferTime = (customFields?.bufferTime as number) || undefined
    const bufferTimeUnit = (customFields?.bufferTimeUnit as 'hours' | 'days') || undefined

    // Get related equipment if IDs exist
    let relatedEquipment: {
      id: string
      sku: string
      model: string | null
      category: { name: string }
    }[] = []
    if (relatedEquipmentIds.length > 0) {
      relatedEquipment = await prisma.equipment.findMany({
        where: {
          id: { in: relatedEquipmentIds },
          deletedAt: null,
        },
        select: {
          id: true,
          sku: true,
          model: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      })
    }

    return {
      ...equipment,
      translations,
      relatedEquipmentIds,
      relatedEquipment,
      boxContents,
      tags,
      bufferTime,
      bufferTimeUnit,
    }
  }

  /**
   * Create new equipment
   */
  static async createEquipment(input: CreateEquipmentInput) {
    let categoryId =
      typeof input.categoryId === 'string' && input.categoryId.trim() !== ''
        ? input.categoryId.trim()
        : ''
    if (!categoryId) {
      const fallback = await prisma.category.findFirst({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true },
      })
      if (!fallback) {
        throw new Error('Cannot save equipment: no categories exist. Create a category first.')
      }
      categoryId = fallback.id
    }

    const hasImage =
      Boolean(input.featuredImageUrl?.trim()) ||
      Boolean((input.galleryImageUrls || []).some((u) => u && String(u).trim()))

    const userWantedFeatured = input.featured === true
    const userWantedActive = input.isActive !== false

    let featured = input.featured ?? false
    let isActive = input.isActive !== undefined ? input.isActive : true
    if (!hasImage) {
      if (featured) featured = false
      if (isActive) isActive = false
    }
    const publishFlagsAdjustedForMedia = !hasImage && (userWantedActive || userWantedFeatured)

    const modelForDb = input.model?.trim() ? input.model.trim() : null
    const dailyPrice = input.dailyPrice ?? 0

    // Auto-generate SKU if not provided (DB requires unique non-null sku)
    const sku =
      input.sku?.trim() ||
      `EQ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    // Check if SKU already exists
    const existing = await prisma.equipment.findFirst({
      where: {
        sku,
        deletedAt: null,
      },
    })

    if (existing) {
      throw new Error(`Equipment with SKU "${sku}" already exists`)
    }

    // Build customFields
    const customFields: Record<string, unknown> = {
      ...(input.customFields || {}),
    }

    if (input.relatedEquipmentIds && input.relatedEquipmentIds.length > 0) {
      customFields.relatedEquipmentIds = input.relatedEquipmentIds
    }

    if (input.boxContents) {
      customFields.boxContents = input.boxContents
    }

    if (input.tags) {
      customFields.tags = input.tags
    }

    if (input.depositAmount !== undefined && !Number.isNaN(input.depositAmount)) {
      customFields.depositAmount = input.depositAmount
    }
    customFields.requiresDeposit = input.requiresDeposit ?? false

    if (input.subCategoryId) {
      customFields.subCategoryId = input.subCategoryId
    }

    if (input.itemType) {
      customFields.itemType = input.itemType
    }
    if (input.bookingMode) {
      customFields.bookingMode = input.bookingMode
    }
    if (input.crewProfile) {
      customFields.crewProfile = input.crewProfile
    }

    if (input.bufferTime !== undefined) {
      customFields.bufferTime = input.bufferTime
      customFields.bufferTimeUnit = input.bufferTimeUnit || 'hours'
    }

    if (input.vendorSubmissionStatus) {
      customFields.vendorSubmissionStatus = input.vendorSubmissionStatus
    } else if (input.vendorId) {
      customFields.vendorSubmissionStatus = 'pending_review'
    }

    const specsReadiness = assessSpecsReadiness(input.specifications)
    const publishSpecsWarnings =
      (isActive || featured) && !specsReadiness.ready ? specsReadiness.warnings : []

    const normalizedSpecifications = await this.normalizeSpecificationsForStorage({
      specifications: input.specifications,
      categoryId,
    })

    // Create equipment in transaction
    const equipment = await prisma.$transaction(async (tx) => {
      // Find English name for slug, fallback to model
      const enTranslation = input.translations?.find((t) => t.locale === 'en' && t.name)
      const slugBase = enTranslation?.name || input.model || ''
      
      // Generate unique slug
      const baseSlug = generateSlug(slugBase)
      const slug = await ensureUniqueEquipmentSlug(tx, baseSlug)

      // Create equipment record
      const newEquipment = await tx.equipment.create({
        data: {
          sku,
          model: modelForDb,
          slug,
          categoryId,
          brandId: input.brandId,
          vendorId: input.vendorId ?? null,
          condition: input.condition || 'GOOD',
          quantityTotal: input.quantityTotal || 1,
          quantityAvailable: input.quantityAvailable ?? input.quantityTotal ?? 1,
          dailyPrice,
          weeklyPrice: input.weeklyPrice,
          monthlyPrice: input.monthlyPrice,
          purchasePrice: input.purchasePrice,
          featured,
          isActive,
          requiresAssistant: input.requiresAssistant ?? false,
          warehouseLocation: input.warehouseLocation,
          barcode: input.barcode,
          specifications:
            normalizedSpecifications != null
              ? (normalizedSpecifications as Prisma.InputJsonValue)
              : undefined,
          customFields:
            Object.keys(customFields).length > 0
              ? (JSON.parse(JSON.stringify(customFields)) as Prisma.InputJsonValue)
              : undefined,
          createdBy: input.createdBy,
          specConfidence: input.specConfidence,
          specLastInferredAt: input.specLastInferredAt,
          specSource: input.specSource,
        },
        include: {
          category: true,
          brand: true,
        },
      })

      // Save translations (skip when nothing to persist — avoids empty delete/create cycles)
      if (input.translations && input.translations.length > 0) {
        const translationInputs = TranslationService.formatTranslationsForSave(input.translations)
        if (translationInputs.length > 0) {
          await TranslationService.saveTranslations(
            'equipment',
            newEquipment.id,
            translationInputs,
            input.createdBy
          )
        }
      }

      // Create media records with explicit sortOrder (primary=0, gallery=1,2,3...)
      const imageUrls: string[] = []
      if (input.featuredImageUrl) {
        imageUrls.push(input.featuredImageUrl)
      }
      if (input.galleryImageUrls?.length) {
        imageUrls.push(...input.galleryImageUrls)
      }
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i]
        await tx.media.create({
          data: {
            url,
            type: 'image',
            filename: url.split('/').pop() || 'image.jpg',
            mimeType: 'image/jpeg',
            equipmentId: newEquipment.id,
            createdBy: input.createdBy,
            sortOrder: i,
          },
        })
      }

      if (input.videoUrl) {
        await tx.media.create({
          data: {
            url: input.videoUrl,
            type: 'video',
            filename: input.videoUrl.split('/').pop() || 'video.mp4',
            mimeType: 'video/mp4',
            equipmentId: newEquipment.id,
            createdBy: input.createdBy,
          },
        })
      }

      return newEquipment
    })

    // Option A: Equipment is source-of-truth; keep Product/ProductTranslation in sync.
    let syncToProduct: { ok: true } | { ok: false; message: string } = { ok: true }
    try {
      await syncEquipmentToProduct(equipment.id)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Product sync failed'
      syncToProduct = { ok: false, message }
      console.warn('[EquipmentService] syncEquipmentToProduct failed after create', e)
    }

    // Fetch complete equipment with relations
    const createdEquipment = await this.getEquipmentById(equipment.id)
    const warnings: Record<string, unknown> = {}
    if (publishFlagsAdjustedForMedia) {
      warnings.publishState =
        'تم الحفظ كمسودة (غير نشطة) وليست مميزة حتى تضيف صورة مميزة أو صوراً في المعرض.'
    }
    if (publishSpecsWarnings.length > 0) {
      warnings.specifications = publishSpecsWarnings
    }
    if (!syncToProduct.ok) {
      warnings.syncToProduct = syncToProduct
    }
    if (Object.keys(warnings).length === 0) return createdEquipment
    return {
      ...createdEquipment,
      warnings,
    }
  }

  /**
   * Update equipment
   */
  static async updateEquipment(
    input: UpdateEquipmentInput & {
      translations?: EquipmentTranslationInput[]
      featuredImageUrl?: string
      galleryImageUrls?: string[]
      videoUrl?: string
      relatedEquipmentIds?: string[]
      boxContents?: string
      tags?: string
      bufferTime?: number
      bufferTimeUnit?: 'hours' | 'days'
      vendorSubmissionStatus?: VendorSubmissionStatus
    }
  ) {
    const {
      id,
      updatedBy,
      translations,
      featuredImageUrl,
      galleryImageUrls,
      videoUrl,
      relatedEquipmentIds,
      boxContents,
      tags,
      bufferTime,
      bufferTimeUnit,
      vendorSubmissionStatus,
      depositAmount,
      requiresDeposit,
      ...data
    } = input

    // Check if equipment exists
    const existing = await prisma.equipment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!existing) {
      throw new Error('Equipment not found')
    }

    // Active or featured equipment must have at least one valid image for public display
    const targetIsActive = data.isActive ?? existing.isActive
    const targetFeatured = data.featured ?? existing.featured
    const specsReadiness = assessSpecsReadiness(data.specifications ?? existing.specifications)
    const publishSpecsWarnings =
      (targetIsActive || targetFeatured) && !specsReadiness.ready ? specsReadiness.warnings : []
    if (targetIsActive || targetFeatured) {
      const willHaveNewImages =
        (featuredImageUrl != null && featuredImageUrl.trim() !== '') ||
        (galleryImageUrls != null && galleryImageUrls.length > 0)
      if (!willHaveNewImages) {
        const existingImageCount = await prisma.media.count({
          where: {
            equipmentId: id,
            type: 'image',
            deletedAt: null,
          },
        })
        if (existingImageCount === 0) {
          throw new Error(
            'Active or featured equipment must have at least one image. Add a featured image or gallery images before publishing.'
          )
        }
      }
    }

    // If SKU is being updated, check for duplicates
    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.equipment.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
          id: { not: id },
        },
      })

      if (duplicate) {
        throw new Error(`Equipment with SKU "${data.sku}" already exists`)
      }
    }

    // Build customFields
    const existingCustomFields = (existing.customFields as Record<string, unknown>) || {}
    const customFields: Record<string, unknown> = {
      ...existingCustomFields,
      ...(data.customFields || {}),
    }

    if (relatedEquipmentIds !== undefined) {
      customFields.relatedEquipmentIds = relatedEquipmentIds
    }

    if (boxContents !== undefined) {
      customFields.boxContents = boxContents
    }

    if (tags !== undefined) {
      if (tags.trim() === '') {
        delete customFields.tags
      } else {
        customFields.tags = tags
      }
    }

    if (bufferTime !== undefined) {
      customFields.bufferTime = bufferTime
      customFields.bufferTimeUnit = bufferTimeUnit || 'hours'
    }

    if (vendorSubmissionStatus !== undefined) {
      customFields.vendorSubmissionStatus = vendorSubmissionStatus
    }
    if (depositAmount !== undefined) {
      if (Number.isNaN(depositAmount)) {
        delete customFields.depositAmount
      } else {
        customFields.depositAmount = depositAmount
      }
    }
    if (requiresDeposit !== undefined) {
      customFields.requiresDeposit = requiresDeposit
    }

    if (data.subCategoryId !== undefined) {
      customFields.subCategoryId = data.subCategoryId
    }
    if (data.itemType !== undefined) {
      customFields.itemType = data.itemType
    }
    if (data.bookingMode !== undefined) {
      customFields.bookingMode = data.bookingMode
    }
    if (data.crewProfile !== undefined) {
      customFields.crewProfile = data.crewProfile
    }

    const specificationsWasProvided = Object.prototype.hasOwnProperty.call(data, 'specifications')
    const normalizedSpecifications = specificationsWasProvided
      ? await this.normalizeSpecificationsForStorage({
          specifications: data.specifications,
          categoryId: data.categoryId ?? existing.categoryId,
        })
      : undefined

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Regenerate slug only when the English name or model actually changes, or slug is missing
      let newSlug = undefined

      const enTranslation = translations?.find((t) => t.locale === 'en' && t.name)
      const newNameBase = enTranslation?.name || data.model

      const hasModelChanged = data.model && data.model !== existing.model
      // Only treat name as changed if EN name is different from what's already stored
      const hasNameChanged =
        enTranslation &&
        typeof enTranslation.name === 'string' &&
        enTranslation.name.trim() !== '' &&
        enTranslation.name.trim() !== (existing.model ?? '').trim()

      if (hasModelChanged || hasNameChanged || !existing.slug) {
        const baseSlug = generateSlug(newNameBase || existing.model || 'equipment')
        newSlug = await ensureUniqueEquipmentSlug(tx, baseSlug, id)
      }

      // Update equipment record
      const { specConfidence, specLastInferredAt, specSource, ...restData } = data
      await tx.equipment.update({
        where: { id },
        data: {
          ...restData,
          ...(newSlug && { slug: newSlug }),
          ...(specificationsWasProvided && { specifications: normalizedSpecifications ?? undefined }),
          customFields:
            Object.keys(customFields).length > 0
              ? JSON.parse(JSON.stringify(customFields))
              : undefined,
          updatedBy,
          updatedAt: new Date(),
          ...(specConfidence != null && { specConfidence }),
          ...(specLastInferredAt != null && { specLastInferredAt }),
          ...(specSource != null && { specSource }),
          // Prisma rejects undefined fields in spread — strip via cast for optional relation ids
        } as Prisma.EquipmentUpdateInput,
      })

      // Update translations
      if (translations !== undefined) {
        if (translations.length > 0) {
          const translationInputs = TranslationService.formatTranslationsForSave(translations)
          await TranslationService.saveTranslations('equipment', id, translationInputs, updatedBy)
        } else {
          // Delete all translations if empty array
          await TranslationService.deleteTranslations('equipment', id, updatedBy)
        }
      }

      // Handle media updates using transaction client (sortOrder: 0 = primary, 1+ = gallery)
      if (featuredImageUrl !== undefined) {
        const existingPrimary = await tx.media.findFirst({
          where: {
            equipmentId: id,
            type: 'image',
            deletedAt: null,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })

        if (existingPrimary) {
          await tx.media.update({
            where: { id: existingPrimary.id },
            data: {
              deletedAt: new Date(),
              deletedBy: updatedBy,
            },
          })
        }

        if (featuredImageUrl) {
          await tx.media.create({
            data: {
              url: featuredImageUrl,
              type: 'image',
              filename: featuredImageUrl.split('/').pop() || 'featured.jpg',
              mimeType: 'image/jpeg',
              equipmentId: id,
              createdBy: updatedBy,
              sortOrder: 0,
            },
          })
        }
      }

      if (galleryImageUrls !== undefined) {
        // Gallery payload is treated as source-of-truth:
        // replace previous gallery images instead of appending to avoid duplicates.
        const currentPrimary = await tx.media.findFirst({
          where: {
            equipmentId: id,
            type: 'image',
            deletedAt: null,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })

        await tx.media.updateMany({
          where: {
            equipmentId: id,
            type: 'image',
            deletedAt: null,
            ...(currentPrimary ? { id: { not: currentPrimary.id } } : {}),
          },
          data: {
            deletedAt: new Date(),
            deletedBy: updatedBy,
          },
        })

        const primaryUrl = currentPrimary?.url ?? null
        const normalizedGallery = Array.from(
          new Set(
            galleryImageUrls
              .map((url) => url.trim())
              .filter((url) => url.length > 0 && url !== primaryUrl)
          )
        )

        await Promise.all(
          normalizedGallery.map((url, i) =>
            tx.media.create({
              data: {
                url,
                type: 'image',
                filename: url.split('/').pop() || 'gallery.jpg',
                mimeType: 'image/jpeg',
                equipmentId: id,
                createdBy: updatedBy,
                sortOrder: i + 1,
              },
            })
          )
        )
      }

      if (videoUrl !== undefined) {
        // Delete existing video
        await tx.media.updateMany({
          where: {
            equipmentId: id,
            type: 'video',
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
            deletedBy: updatedBy,
          },
        })

        // Create new video if URL provided
        if (videoUrl) {
          await tx.media.create({
            data: {
              url: videoUrl,
              type: 'video',
              filename: videoUrl.split('/').pop() || 'video.mp4',
              mimeType: 'video/mp4',
              equipmentId: id,
              createdBy: updatedBy,
            },
          })
        }
      }
    })

    // Option A: sync Product/ProductTranslation only when normalized specs differ from stored.
    let syncToProduct: { ok: true } | { ok: false; message: string } = { ok: true }
    if (specificationsWasProvided) {
      const specsChanged = !specificationsJsonEqual(
        normalizedSpecifications ?? null,
        existing.specifications ?? null
      )
      if (specsChanged) {
        try {
          await syncEquipmentToProduct(id, { forceSpecOverride: true })
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Product sync failed'
          syncToProduct = { ok: false, message }
          console.warn('[EquipmentService] syncEquipmentToProduct failed after update', e)
        }
      }
    }

    if (data.quantityAvailable !== undefined) {
      void import('./low-stock-alert.service')
        .then(({ LowStockAlertService }) => LowStockAlertService.checkEquipment(id))
        .catch(() => undefined)
    }

    // Return updated equipment with all relations
    const updatedEquipment = await this.getEquipmentById(id)
    const warnings: Record<string, unknown> = {}
    if (publishSpecsWarnings.length > 0) {
      warnings.specifications = publishSpecsWarnings
    }
    if (!syncToProduct.ok) {
      warnings.syncToProduct = syncToProduct
    }
    if (Object.keys(warnings).length === 0) return updatedEquipment
    return {
      ...updatedEquipment,
      warnings,
    }
  }

  /**
   * Delete equipment (soft delete)
   */
  static async deleteEquipment(id: string, deletedBy: string) {
    const equipment = await prisma.equipment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!equipment) {
      throw new Error('Equipment not found')
    }

    // Check if equipment is in active bookings
    const activeBookings = await prisma.bookingEquipment.findFirst({
      where: {
        equipmentId: id,
        booking: {
          status: {
            in: ['CONFIRMED', 'ACTIVE'],
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
    })

    if (activeBookings) {
      throw new Error('Cannot delete equipment that is in active bookings')
    }

    await prisma.$transaction(async (tx) => {
      await tx.equipment.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy,
          isActive: false,
        },
      })

      // Soft-delete associated product if linked
      if (equipment.productId) {
        await tx.product.update({
          where: { id: equipment.productId },
          data: {
            deletedAt: new Date(),
            deletedBy,
          },
        })
      } else {
        // Check if product ID matches equipment ID (common in this DB)
        const productMatch = await tx.product.findFirst({
          where: { id: equipment.id, deletedAt: null },
        })
        if (productMatch) {
          await tx.product.update({
            where: { id: equipment.id },
            data: {
              deletedAt: new Date(),
              deletedBy,
            },
          })
        }
      }
    })

    return { success: true }
  }

  /**
   * Check equipment availability
   */
  static async checkAvailability(
    equipmentId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ) {
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        deletedAt: null,
        isActive: true,
      },
    })

    if (!equipment) {
      return { available: false, reason: 'Equipment not found or inactive' }
    }

    // Check for overlapping bookings
    if (equipment.condition === 'MAINTENANCE') {
      return {
        available: false,
        reason: 'MAINTENANCE',
        totalQuantity: equipment.quantityTotal,
        availableQuantity: 0,
        rentedQuantity: 0,
        maintenanceConflicts: [],
        overlappingBookings: [],
      }
    }

    const maintenanceConflicts = await prisma.maintenance.findMany({
      where: {
        equipmentId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: { lte: endDate },
        OR: [
          { completedDate: null },
          { completedDate: { gte: startDate } },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        maintenanceNumber: true,
        scheduledDate: true,
        completedDate: true,
        status: true,
      },
    })

    if (maintenanceConflicts.length > 0) {
      return {
        available: false,
        reason: 'MAINTENANCE',
        totalQuantity: equipment.quantityTotal,
        availableQuantity: 0,
        rentedQuantity: 0,
        maintenanceConflicts: maintenanceConflicts.map((m) => ({
          maintenanceNumber: m.maintenanceNumber,
          scheduledDate: m.scheduledDate,
          completedDate: m.completedDate,
          status: m.status,
        })),
        overlappingBookings: [],
      }
    }

    const overlappingBookings = await prisma.bookingEquipment.findMany({
      where: {
        equipmentId,
        booking: {
          status: {
            in: ['CONFIRMED', 'ACTIVE'],
          },
          deletedAt: null,
          OR: [
            {
              AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
            },
          ],
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
        deletedAt: null,
      },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    const totalRented = overlappingBookings.reduce((sum, be) => sum + be.quantity, 0)
    const available = equipment.quantityTotal - totalRented

    return {
      available: available > 0,
      totalQuantity: equipment.quantityTotal,
      availableQuantity: available,
      rentedQuantity: totalRented,
      maintenanceConflicts: [],
      overlappingBookings: overlappingBookings.map((be) => ({
        bookingNumber: be.booking.bookingNumber,
        startDate: be.booking.startDate,
        endDate: be.booking.endDate,
        quantity: be.quantity,
      })),
    }
  }
}
