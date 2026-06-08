/**
 * Checkout accessory catalog from active low-cost equipment / accessory categories.
 */

import { prisma } from '@/lib/db/prisma'

export interface CheckoutAccessoryItem {
  id: string
  name: string
  price: number
  sku: string
}

const ACCESSORY_CATEGORY_SLUGS = ['camera-accessories', 'light-accessories', 'accessories']

export async function getCheckoutAccessories(limit = 20): Promise<CheckoutAccessoryItem[]> {
  const items = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      category: {
        slug: { in: ACCESSORY_CATEGORY_SLUGS },
      },
    },
    select: {
      id: true,
      sku: true,
      model: true,
      nameEn: true,
      dailyPrice: true,
    },
    orderBy: { dailyPrice: 'asc' },
    take: limit,
  })

  return items.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.nameEn ?? item.model ?? item.sku,
    price: Number(item.dailyPrice),
  }))
}
