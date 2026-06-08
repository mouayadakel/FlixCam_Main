/**
 * Low-stock alert notifications for admin staff.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { NotificationChannel, UserRole } from '@prisma/client'
import { EmailService } from './email.service'

const LOW_STOCK_THRESHOLD = 1

export class LowStockAlertService {
  static async checkEquipment(equipmentId: string): Promise<void> {
    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null, isActive: true },
      select: {
        id: true,
        sku: true,
        model: true,
        nameEn: true,
        quantityAvailable: true,
        quantityTotal: true,
      },
    })

    if (!equipment || equipment.quantityAvailable > LOW_STOCK_THRESHOLD) {
      return
    }

    const label = equipment.nameEn || equipment.model || equipment.sku
    const message = `Low stock: ${label} (${equipment.quantityAvailable} available of ${equipment.quantityTotal})`

    const staff = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { in: [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER] },
      },
      select: { id: true, email: true },
    })

    if (staff.length === 0) return

    await prisma.notification.createMany({
      data: staff.map((u) => ({
        userId: u.id,
        channel: NotificationChannel.IN_APP,
        type: 'inventory.low_stock',
        title: 'مخزون منخفض',
        message,
        data: { equipmentId: equipment.id, sku: equipment.sku },
      })),
    })

    const adminEmails = staff.map((u) => u.email).filter(Boolean)
    for (const email of adminEmails) {
      await EmailService.send({
        to: email,
        subject: `[FlixCam] Low stock alert – ${label}`,
        html: `<p>${message}</p><p>Review inventory in the admin panel.</p>`,
        logToMessageLog: true,
      }).catch((error) => {
        logger.warn('LowStockAlertService: admin email failed', {
          equipmentId,
          email,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }
}
