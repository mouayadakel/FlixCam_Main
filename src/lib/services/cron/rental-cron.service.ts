/**
 * Rental & booking cron jobs.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { BookingService } from '@/lib/services/booking.service'
import { BookingStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { addHours } from 'date-fns'
import { enqueueNotification } from '@/lib/services/notification-queue.service'
import { EquipmentService } from '@/lib/services/equipment.service'
import { getCronActorId, wrapCronJob } from './cron-utils'

export const runRentalStatusUpdates = wrapCronJob('rental-status-updates', async () => {
  const actorId = await getCronActorId()
  const now = new Date()

  const toActivate = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: 'CONFIRMED',
      startDate: { lte: now },
    },
    select: { id: true, createdBy: true },
    take: 50,
  })

  let activated = 0
  let activationFailed = 0

  for (const booking of toActivate) {
    try {
      await BookingService.transitionState(
        booking.id,
        BookingStatus.ACTIVE,
        booking.createdBy || actorId
      )
      activated++
    } catch (err) {
      activationFailed++
      logger.warn('rental-status-updates: activate failed', {
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const toClose = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: 'RETURNED',
      updatedAt: { lte: new Date(now.getTime() - 7 * 24 * 60 * 60_000) },
    },
    select: { id: true, createdBy: true },
    take: 50,
  })

  let closed = 0
  for (const booking of toClose) {
    try {
      await BookingService.transitionState(
        booking.id,
        BookingStatus.CLOSED,
        booking.createdBy || actorId
      )
      closed++
    } catch {
      // RETURNED may need manual approval with charges
    }
  }

  const softLocksReleased = await BookingService.releaseExpiredSoftLocks()

  return { activated, activationFailed, closed, softLocksReleased }
})

export const runLateReturnDetection = wrapCronJob('late-return-detection', async () => {
  const now = new Date()

  const overdue = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    include: {
      equipment: {
        where: { deletedAt: null },
        include: { equipment: { select: { dailyPrice: true } } },
      },
    },
    take: 100,
  })

  let updated = 0

  for (const booking of overdue) {
    const endDate = new Date(booking.endDate)
    const lateMs = now.getTime() - endDate.getTime()
    const lateDays = Math.ceil(lateMs / (24 * 60 * 60_000))
    if (lateDays <= 0) continue

    let lateFeeAmount = 0
    for (const be of booking.equipment) {
      const dailyRate = Number(be.equipment.dailyPrice ?? 0)
      lateFeeAmount += be.quantity * dailyRate * lateDays * 1.5
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        lateFeeAmount: lateFeeAmount > 0 ? new Decimal(lateFeeAmount) : null,
      },
    })
    updated++
  }

  return { overdueFound: overdue.length, lateFeesUpdated: updated }
})

export const runAutoExtendOffers = wrapCronJob('auto-extend-offers', async () => {
  const now = new Date()
  const windowStart = addHours(now, 23)
  const windowEnd = addHours(now, 25)

  const endingSoon = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: { in: ['ACTIVE', 'CONFIRMED'] },
      endDate: { gte: windowStart, lte: windowEnd },
    },
    include: {
      customer: { select: { id: true, email: true, phone: true } },
      equipment: {
        where: { deletedAt: null },
        select: { equipmentId: true, quantity: true },
      },
    },
    take: 50,
  })

  let offersSent = 0
  let unavailable = 0

  for (const booking of endingSoon) {
    const extendEnd = addHours(booking.endDate, 24)
    let allAvailable = true

    for (const be of booking.equipment) {
      const check = await EquipmentService.checkAvailability(
        be.equipmentId,
        booking.endDate,
        extendEnd,
        booking.id
      )
      if (!check.available || (check.availableQuantity ?? 0) < be.quantity) {
        allAvailable = false
        break
      }
    }

    if (!allAvailable) {
      unavailable++
      continue
    }

    const message = `Your rental is ending soon. Equipment is available for a 24h extension — visit your portal to extend.`

    if (booking.customer.email) {
      enqueueNotification({
        channel: 'email',
        recipient: booking.customer.email,
        subject: 'Extend your FlixCam rental',
        body: message,
        recipientUserId: booking.customer.id,
      })
    }
    if (booking.customer.phone) {
      enqueueNotification({
        channel: 'whatsapp',
        recipient: booking.customer.phone,
        body: message,
        recipientUserId: booking.customer.id,
      })
    }

    await prisma.notification.create({
      data: {
        userId: booking.customer.id,
        channel: 'IN_APP',
        type: 'booking.extend_offer',
        title: 'Extension available',
        message,
        data: { bookingId: booking.id },
      },
    })

    offersSent++
  }

  return { endingSoon: endingSoon.length, offersSent, unavailable }
})

export const runInventorySync = wrapCronJob('inventory-sync', async () => {
  const now = new Date()

  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, quantityTotal: true, quantityAvailable: true },
    take: 500,
  })

  let updated = 0
  let unchanged = 0

  for (const eq of equipment) {
    const rented = await prisma.bookingEquipment.aggregate({
      where: {
        equipmentId: eq.id,
        deletedAt: null,
        booking: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'ACTIVE'] },
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
      _sum: { quantity: true },
    })

    const rentedQty = rented._sum.quantity ?? 0
    const expectedAvailable = Math.max(0, eq.quantityTotal - rentedQty)

    if (expectedAvailable !== eq.quantityAvailable) {
      await prisma.equipment.update({
        where: { id: eq.id },
        data: { quantityAvailable: expectedAvailable },
      })
      updated++
    } else {
      unchanged++
    }
  }

  return { scanned: equipment.length, updated, unchanged }
})
