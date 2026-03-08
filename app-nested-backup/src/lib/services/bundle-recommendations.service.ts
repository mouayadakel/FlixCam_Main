/**
 * Bundle recommendations service – "Frequently Rented Together".
 * Uses booking co-occurrence, falls back to featured items in same category.
 */

import { prisma } from '@/lib/db/prisma'

export const bundleRecommendationsService = {
  /**
   * Get equipment frequently rented together with a given item.
   * 1. Find bookings containing this equipment
   * 2. Find other equipment in those bookings, ranked by co-occurrence
   * 3. Fallback: featured items in same category
   */
  async getFrequentlyRentedTogether(
    equipmentId: string,
    limit = 3
  ): Promise<{ items: FrequentlyRentedItem[]; source: 'co-occurrence' | 'category-fallback' }> {
    try {
      // Step 1: Find booking IDs containing this equipment
      const bookingItems = await prisma.bookingEquipment.findMany({
        where: {
          equipmentId,
          deletedAt: null,
          booking: { deletedAt: null },
        },
        select: { bookingId: true },
        take: 100,
      })

      const bookingIds = bookingItems.map((bi: { bookingId: string }) => bi.bookingId)

      if (bookingIds.length > 0) {
        // Step 2: Find co-occurring equipment
        const coItems = await prisma.bookingEquipment.findMany({
          where: {
            bookingId: { in: bookingIds },
            equipmentId: { not: equipmentId },
            deletedAt: null,
            equipment: { deletedAt: null, isActive: true },
          },
          select: {
            equipmentId: true,
            equipment: {
              select: {
                id: true,
                sku: true,
                model: true,
                dailyPrice: true,
                quantityAvailable: true,
                category: { select: { id: true, name: true, slug: true } },
                brand: { select: { id: true, name: true, slug: true } },
                media: { take: 1, select: { id: true, url: true, type: true } },
              },
            },
          },
        })

        // Count occurrences and deduplicate
        const countMap = new Map<
          string,
          { count: number; item: (typeof coItems)[0]['equipment'] }
        >()
        for (const ci of coItems) {
          const existing = countMap.get(ci.equipmentId)
          if (existing) {
            existing.count++
          } else {
            countMap.set(ci.equipmentId, { count: 1, item: ci.equipment })
          }
        }

        // Sort by count desc
        const sorted = [...countMap.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, limit)

        if (sorted.length > 0) {
          return {
            source: 'co-occurrence',
            items: sorted.map(([, { item }]) => ({
              id: item.id,
              sku: item.sku,
              model: item.model,
              dailyPrice: item.dailyPrice ? Number(item.dailyPrice) : 0,
              quantityAvailable: item.quantityAvailable ?? 0,
              category: item.category
                ? { name: item.category.name, slug: item.category.slug ?? '' }
                : null,
              brand: item.brand ? { name: item.brand.name, slug: item.brand.slug ?? '' } : null,
              media: item.media,
            })),
          }
        }
      }

      // Step 3: Fallback – featured items in same category
      return this.getCategoryFallback(equipmentId, limit)
    } catch (error) {
      console.error('[bundleRecommendations] error:', error)
      return { items: [], source: 'category-fallback' }
    }
  },

  async getCategoryFallback(
    equipmentId: string,
    limit: number
  ): Promise<{ items: FrequentlyRentedItem[]; source: 'category-fallback' }> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { categoryId: true },
    })

    if (!equipment?.categoryId) {
      return { items: [], source: 'category-fallback' }
    }

    const fallback = await prisma.equipment.findMany({
      where: {
        categoryId: equipment.categoryId,
        id: { not: equipmentId },
        deletedAt: null,
        isActive: true,
        featured: true,
      },
      take: limit,
      select: {
        id: true,
        sku: true,
        model: true,
        dailyPrice: true,
        quantityAvailable: true,
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        media: { take: 1, select: { id: true, url: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      source: 'category-fallback',
      items: fallback.map((e) => ({
        id: e.id,
        sku: e.sku,
        model: e.model,
        dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
        quantityAvailable: e.quantityAvailable ?? 0,
        category: e.category ? { name: e.category.name, slug: e.category.slug ?? '' } : null,
        brand: e.brand ? { name: e.brand.name, slug: e.brand.slug ?? '' } : null,
        media: e.media,
      })),
    }
  },
}

export interface FrequentlyRentedItem {
  id: string
  sku: string | null
  model: string | null
  dailyPrice: number
  quantityAvailable: number
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { id: string; url: string; type: string }[]
}
