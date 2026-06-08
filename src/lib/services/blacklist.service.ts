/**
 * Client blacklist management.
 */

import { prisma } from '@/lib/db/prisma'
import { EventBus } from '@/lib/events/event-bus'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export class BlacklistService {
  static async listBlacklisted(limit = 100) {
    return prisma.user.findMany({
      where: { isBlacklisted: true, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        blacklistReason: true,
        blacklistedAt: true,
        blacklistedBy: true,
      },
      orderBy: { blacklistedAt: 'desc' },
      take: limit,
    })
  }

  static async blacklist(clientId: string, reason: string, actorId: string): Promise<void> {
    const allowed = await hasPermission(actorId, PERMISSIONS.CLIENT_BLACKLIST)
    if (!allowed) throw new ForbiddenError()

    if (!reason.trim()) throw new ValidationError('Blacklist reason is required')

    const user = await prisma.user.findFirst({
      where: { id: clientId, deletedAt: null, role: 'CUSTOMER' },
    })
    if (!user) throw new NotFoundError('Client', clientId)

    await prisma.user.update({
      where: { id: clientId },
      data: {
        isBlacklisted: true,
        blacklistReason: reason.trim(),
        blacklistedAt: new Date(),
        blacklistedBy: actorId,
        status: 'LOCKED',
        updatedBy: actorId,
      },
    })

    await EventBus.emit('client.updated', {
      clientId,
      updatedBy: actorId,
      timestamp: new Date(),
    })
  }

  static async unblacklist(clientId: string, actorId: string): Promise<void> {
    const allowed = await hasPermission(actorId, PERMISSIONS.CLIENT_BLACKLIST)
    if (!allowed) throw new ForbiddenError()

    const user = await prisma.user.findFirst({
      where: { id: clientId, deletedAt: null },
    })
    if (!user) throw new NotFoundError('Client', clientId)

    await prisma.user.update({
      where: { id: clientId },
      data: {
        isBlacklisted: false,
        blacklistReason: null,
        blacklistedAt: null,
        blacklistedBy: null,
        status: 'ACTIVE',
        updatedBy: actorId,
      },
    })

    await EventBus.emit('client.updated', {
      clientId,
      updatedBy: actorId,
      timestamp: new Date(),
    })
  }

  static async assertNotBlacklisted(customerId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { isBlacklisted: true, blacklistReason: true },
    })
    if (user?.isBlacklisted) {
      throw new ValidationError(
        user.blacklistReason
          ? `Account blocked: ${user.blacklistReason}`
          : 'Account is blacklisted and cannot create bookings'
      )
    }
  }
}
