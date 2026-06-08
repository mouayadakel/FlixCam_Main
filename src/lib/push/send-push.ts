/**
 * @file send-push.ts
 * @description Send Web Push notifications to subscribed devices
 */

import webpush from 'web-push'
import { prisma } from '@/lib/db/prisma'
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, isPushConfigured } from './vapid'
import { PushSubscriptionService } from './push-subscription.service'

export type PushMessage = {
  title: string
  body: string
  url?: string
  tag?: string
}

function configureWebPush() {
  const publicKey = getVapidPublicKey()
  const privateKey = getVapidPrivateKey()
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured')
  }
  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey)
}

async function deliver(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  message: PushMessage
) {
  configureWebPush()
  const payload = JSON.stringify(message)
  let sent = 0
  let failed = 0
  const staleEndpoints: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: unknown) {
        failed++
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          staleEndpoints.push(sub.endpoint)
        }
      }
    })
  )

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    })
  }

  return { sent, failed }
}

export async function sendPushToUser(userId: string, message: PushMessage) {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0, skipped: true as const }
  }
  const subs = await PushSubscriptionService.listByUser(userId)
  const result = await deliver(subs, message)
  return { ...result, skipped: false as const }
}

export async function sendPushToAll(message: PushMessage) {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0, skipped: true as const }
  }
  const subs = await PushSubscriptionService.listAll()
  const result = await deliver(subs, message)
  return { ...result, skipped: false as const }
}
