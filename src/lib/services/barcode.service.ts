/**
 * Barcode lookup for warehouse operations (inventory items + equipment SKU/barcode).
 */

import { prisma } from '@/lib/db/prisma'
import { NotFoundError } from '@/lib/errors'

export interface BarcodeLookupResult {
  equipmentId: string
  sku: string
  name: string
  serialNumber?: string | null
  inventoryItemId?: string
  barcode: string
}

export class BarcodeService {
  static normalizeCode(raw: string): string {
    return raw.trim().replace(/\s+/g, '')
  }

  static async lookupByBarcode(rawCode: string): Promise<BarcodeLookupResult> {
    const code = this.normalizeCode(rawCode)
    if (!code) {
      throw new NotFoundError('Equipment', code)
    }

    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { barcode: code, deletedAt: null },
      include: {
        product: {
          select: {
            sku: true,
            equipment: {
              select: { id: true, sku: true, model: true, barcode: true },
            },
            translations: {
              where: { locale: 'ar' },
              take: 1,
              select: { name: true },
            },
          },
        },
      },
    })

    if (inventoryItem?.product?.equipment) {
      const eq = inventoryItem.product.equipment
      return {
        equipmentId: eq.id,
        sku: eq.sku ?? inventoryItem.product.sku ?? code,
        name:
          inventoryItem.product.translations[0]?.name ??
          eq.model ??
          eq.sku ??
          code,
        serialNumber: inventoryItem.serialNumber,
        inventoryItemId: inventoryItem.id,
        barcode: code,
      }
    }

    const equipment = await prisma.equipment.findFirst({
      where: {
        deletedAt: null,
        OR: [{ barcode: code }, { sku: code }],
      },
      select: {
        id: true,
        sku: true,
        model: true,
        barcode: true,
        nameEn: true,
      },
    })

    if (!equipment) {
      throw new NotFoundError('Equipment', code)
    }

    return {
      equipmentId: equipment.id,
      sku: equipment.sku ?? code,
      name: equipment.nameEn ?? equipment.model ?? equipment.sku ?? code,
      serialNumber: null,
      barcode: code,
    }
  }

  static async lookupForBooking(
    rawCode: string,
    bookingId: string
  ): Promise<BarcodeLookupResult & { bookingEquipmentId: string }> {
    const lookup = await this.lookupByBarcode(rawCode)

    const line = await prisma.bookingEquipment.findFirst({
      where: {
        bookingId,
        equipmentId: lookup.equipmentId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!line) {
      throw new NotFoundError('BookingEquipment', `${bookingId}:${lookup.equipmentId}`)
    }

    return { ...lookup, bookingEquipmentId: line.id }
  }
}
