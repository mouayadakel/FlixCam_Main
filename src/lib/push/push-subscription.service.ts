/**
 * @file push-subscription.service.ts
 * @description Persist Web Push subscriptions per user
 */

import { prisma } from '@/lib/db/prisma'

export type PushSubscriptionPayload = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export const PushSubscriptionService = {
  async upsert(userId: string, payload: PushSubscriptionPayload, userAgent?: string) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: payload.endpoint },
      create: {
        userId,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        userId,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent: userAgent ?? null,
      },
    })
  },

  async remove(userId: string, endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    })
  },

  async listByUser(userId: string) {
    return prisma.pushSubscription.findMany({ where: { userId } })
  },

  async listAll() {
    return prisma.pushSubscription.findMany()
  },
}
