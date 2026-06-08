import { prisma } from '@/lib/db/prisma'
import { EventBus } from '@/lib/events/event-bus'
import { ValidationError, NotFoundError } from '@/lib/errors'

export type ScanMode = 'CHECKOUT' | 'CHECKIN'

export class WarehouseProcessingService {
  /**
   * Process a single item scan against a booking.
   */
  static async processScan(
    barcode: string,
    bookingId: string,
    mode: ScanMode,
    userId: string
  ) {
    // 1. Find equipment by barcode or SKU
    const equipment = await prisma.equipment.findFirst({
      where: {
        OR: [{ barcode: barcode.trim() }, { sku: barcode.trim() }],
        deletedAt: null
      }
    })

    if (!equipment) {
      throw new NotFoundError('Equipment', barcode)
    }

    // 2. Verify it's in the booking
    const bookingItem = await prisma.bookingEquipment.findFirst({
      where: {
        bookingId,
        equipmentId: equipment.id
      }
    })

    if (!bookingItem) {
      throw new ValidationError(`المعدة ${equipment.sku} غير موجودة في هذا الحجز`)
    }

    // 3. Perform atomic stock update
    const result = await prisma.$transaction(async (tx) => {
      // Find current quantity in this mode
      if (mode === 'CHECKOUT') {
        if (equipment.quantityAvailable < 1) {
          throw new ValidationError('المعدة غير متوفرة في المخزن حاليا')
        }
        
        await tx.equipment.update({
          where: { id: equipment.id },
          data: { quantityAvailable: { decrement: 1 } }
        })
      } else {
        const updatedCycles = ((equipment as any).rentalCycles || 0) + 1
        const thresholdHit = updatedCycles >= ((equipment as any).maxCyclesBeforeService || 50)
        
        await tx.equipment.update({
          where: { id: equipment.id },
          data: { 
            quantityAvailable: { increment: 1 },
            rentalCycles: { increment: 1 },
            needsService: thresholdHit ? true : undefined
          } as any
        })

        if (thresholdHit) {
          await EventBus.emit('warehouse.maintenance_alert' as any, {
            equipmentId: equipment.id,
            sku: equipment.sku,
            rentalCycles: updatedCycles,
            timestamp: new Date()
          } as any)
        }
      }

      // Log the scan for audit
      const scanLog = await (tx as any).warehouseScan.create({
        data: {
          bookingId,
          equipmentId: equipment.id,
          type: mode as any,
          scannedBy: userId,
          barcode: barcode.trim()
        }
      })

      return { equipment, scanLog }
    })

    // 4. Emit event for live UI update
    await EventBus.emit('warehouse.item_scanned' as any, {
      bookingId,
      equipmentId: equipment.id,
      sku: equipment.sku,
      mode,
      timestamp: new Date()
    } as any)

    return result
  }
}
