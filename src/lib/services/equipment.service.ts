/**
 * @file equipment.service.ts
 * @description Business logic for equipment management
 * @module services/equipment
 */

import { prisma } from '@/lib/db/prisma'
import type { Equipment, EquipmentCondition } from '@prisma/client'
import { TranslationService } from './translation.service'
import { MediaService } from './media.service'

export interface EquipmentTranslationInput {
  locale: 'ar' | 'en' | 'zh'
  name?: string
  description?: string
  shortDescription?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
}

export type VendorSubmissionStatus = 'pending_review' | 'approved' | 'rejected'

export interface CreateEquipmentInput {
  sku: string
  model?: string
  categoryId: string
  brandId?: string
  vendorId?: string
  condition?: EquipmentCondition
  quantityTotal?: number
  quantityAvailable?: number
  dailyPrice: number
  weeklyPrice?: number
  monthlyPrice?: number
  featured?: boolean
  isActive?: boolean
  warehouseLocation?: string
  barcode?: string
  specifications?: Record<string, unknown>
  customFields?: Record<string, unknown>
  createdBy: string
  // New fields
  translations?: EquipmentTranslationInput[]
  featuredImageUrl?: string
  galleryImageUrls?: string[]
  videoUrl?: string
  relatedEquipmentIds?: string[]
  boxContents?: string
  bufferTime?: number
  bufferTimeUnit?: 'hours' | 'days'
  vendorSubmissionStatus?: VendorSubmissionStatus
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

export class EquipmentService {
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
      skip = 0,
      take = 50,
    } = filters

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
        where: where as Parameters<typeof prisma.equipment.findMany>[0]['where'],
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
            },
            take: 1,
            orderBy: {
              createdAt: 'asc',
            },
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
      prisma.equipment.count({ where }),
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
            },
            orderBy: {
              createdAt: 'asc',
            },
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
    const bufferTime = (customFields?.bufferTime as number) || undefined
    const bufferTimeUnit = (customFields?.bufferTimeUnit as 'hours' | 'days') || undefined

    // Get related equipment if IDs exist
    let relatedEquipment: { id: string; sku: string; model: string | null; category: { name: string } }[] = []
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
      bufferTime,
      bufferTimeUnit,
    }
  }

  /**
   * Create new equipment
   */
  static async createEquipment(input: CreateEquipmentInput) {
    // Check if SKU already exists
    const existing = await prisma.equipment.findFirst({
      where: {
        sku: input.sku,
        deletedAt: null,
      },
    })

    if (existing) {
      throw new Error(`Equipment with SKU "${input.sku}" already exists`)
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

    if (input.bufferTime !== undefined) {
      customFields.bufferTime = input.bufferTime
      customFields.bufferTimeUnit = input.bufferTimeUnit || 'hours'
    }

    if (input.vendorSubmissionStatus) {
      customFields.vendorSubmissionStatus = input.vendorSubmissionStatus
    } else if (input.vendorId) {
      customFields.vendorSubmissionStatus = 'pending_review'
    }

    // Create equipment in transaction
    const equipment = await prisma.$transaction(async (tx) => {
      // Create equipment record
      const newEquipment = await tx.equipment.create({
        data: {
          sku: input.sku,
          model: input.model,
          categoryId: input.categoryId,
          brandId: input.brandId,
          vendorId: input.vendorId ?? null,
          condition: input.condition || 'GOOD',
          quantityTotal: input.quantityTotal || 1,
          quantityAvailable: input.quantityAvailable ?? input.quantityTotal ?? 1,
          dailyPrice: input.dailyPrice,
          weeklyPrice: input.weeklyPrice,
          monthlyPrice: input.monthlyPrice,
          featured: input.featured || false,
          isActive: input.isActive !== undefined ? input.isActive : true,
          warehouseLocation: input.warehouseLocation,
          barcode: input.barcode,
          specifications: input.specifications ? JSON.parse(JSON.stringify(input.specifications)) : null,
          customFields: Object.keys(customFields).length > 0 ? JSON.parse(JSON.stringify(customFields)) : null,
          createdBy: input.createdBy,
        },
        include: {
          category: true,
          brand: true,
        },
      })

      // Save translations
      if (input.translations && input.translations.length > 0) {
        const translationInputs = TranslationService.formatTranslationsForSave(input.translations)
        await TranslationService.saveTranslations('equipment', newEquipment.id, translationInputs, input.createdBy)
      }

      // Create media records using transaction client
      if (input.featuredImageUrl) {
        await tx.media.create({
          data: {
            url: input.featuredImageUrl,
            type: 'image',
            filename: input.featuredImageUrl.split('/').pop() || 'featured.jpg',
            mimeType: 'image/jpeg',
            equipmentId: newEquipment.id,
            createdBy: input.createdBy,
          },
        })
      }

      if (input.galleryImageUrls && input.galleryImageUrls.length > 0) {
        await Promise.all(
          input.galleryImageUrls.map((url) =>
            tx.media.create({
              data: {
                url,
                type: 'image',
                filename: url.split('/').pop() || 'gallery.jpg',
                mimeType: 'image/jpeg',
                equipmentId: newEquipment.id,
                createdBy: input.createdBy,
              },
            })
          )
        )
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

    // Fetch complete equipment with relations
    return await this.getEquipmentById(equipment.id)
  }

  /**
   * Update equipment
   */
  static async updateEquipment(input: UpdateEquipmentInput & {
    translations?: EquipmentTranslationInput[]
    featuredImageUrl?: string
    galleryImageUrls?: string[]
    videoUrl?: string
    relatedEquipmentIds?: string[]
    boxContents?: string
    bufferTime?: number
    bufferTimeUnit?: 'hours' | 'days'
    vendorSubmissionStatus?: VendorSubmissionStatus
  }) {
    const { id, updatedBy, translations, featuredImageUrl, galleryImageUrls, videoUrl, relatedEquipmentIds, boxContents, bufferTime, bufferTimeUnit, vendorSubmissionStatus, ...data } = input

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

    if (bufferTime !== undefined) {
      customFields.bufferTime = bufferTime
      customFields.bufferTimeUnit = bufferTimeUnit || 'hours'
    }

    if (vendorSubmissionStatus !== undefined) {
      customFields.vendorSubmissionStatus = vendorSubmissionStatus
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update equipment record
      await tx.equipment.update({
        where: { id },
        data: {
          ...data,
          specifications: data.specifications ? JSON.parse(JSON.stringify(data.specifications)) : undefined,
          customFields: Object.keys(customFields).length > 0 ? JSON.parse(JSON.stringify(customFields)) : undefined,
          updatedBy,
          updatedAt: new Date(),
        },
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

      // Handle media updates using transaction client
      if (featuredImageUrl !== undefined) {
        // Delete existing featured images (first image by creation date)
        const existingFeatured = await tx.media.findFirst({
          where: {
            equipmentId: id,
            type: 'image',
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })

        if (existingFeatured) {
          await tx.media.update({
            where: { id: existingFeatured.id },
            data: {
              deletedAt: new Date(),
              deletedBy: updatedBy,
            },
          })
        }

        // Create new featured image if URL provided
        if (featuredImageUrl) {
          await tx.media.create({
            data: {
              url: featuredImageUrl,
              type: 'image',
              filename: featuredImageUrl.split('/').pop() || 'featured.jpg',
              mimeType: 'image/jpeg',
              equipmentId: id,
              createdBy: updatedBy,
            },
          })
        }
      }

      if (galleryImageUrls !== undefined) {
        // For gallery, we'll add new images (full replacement can be implemented later)
        if (galleryImageUrls.length > 0) {
          await Promise.all(
            galleryImageUrls.map((url) =>
              tx.media.create({
                data: {
                  url,
                  type: 'image',
                  filename: url.split('/').pop() || 'gallery.jpg',
                  mimeType: 'image/jpeg',
                  equipmentId: id,
                  createdBy: updatedBy,
                },
              })
            )
          )
        }
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

    // Return updated equipment with all relations
    return await this.getEquipmentById(id)
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

    await prisma.equipment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
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
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } },
              ],
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
    const available = equipment.quantityAvailable - totalRented

    return {
      available: available > 0,
      totalQuantity: equipment.quantityTotal,
      availableQuantity: equipment.quantityAvailable,
      rentedQuantity: totalRented,
      overlappingBookings: overlappingBookings.map((be) => ({
        bookingNumber: be.booking.bookingNumber,
        startDate: be.booking.startDate,
        endDate: be.booking.endDate,
        quantity: be.quantity,
      })),
    }
  }
}
