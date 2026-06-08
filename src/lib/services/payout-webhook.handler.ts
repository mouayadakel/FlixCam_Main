/**
 * @file payout-webhook.handler.ts
 * @description Moyasar payout / balance webhook persistence and staff alerts.
 * @module lib/services/payout-webhook.handler
 */

import { NotificationChannel, UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { EventBus } from '@/lib/events/event-bus'
import { logger } from '@/lib/logger'
import type {
  MoyasarWebhookRegistryEntry,
  MoyasarWebhookDomainEvent,
} from '@/lib/services/moyasar-webhook.registry'

export interface MoyasarPayoutWebhookPayload {
  registryKey: string
  entry: MoyasarWebhookRegistryEntry
  dataId: string
  amountHalalah?: number
  currency?: string
  failureReason?: string | null
  rawPayload: unknown
}

// [FIX 4] [FIX 5]
export async function handleMoyasarPayoutOrBalanceWebhook(
  ctx: MoyasarPayoutWebhookPayload
): Promise<void> {
  const { registryKey, entry, dataId, amountHalalah, currency, failureReason, rawPayload } = ctx

  await prisma.moyasarPayoutWebhookRecord.upsert({
    where: { moyasarResourceId: dataId },
    create: {
      moyasarResourceId: dataId,
      eventClass: entry.eventClass,
      eventType: registryKey,
      amountHalalah: amountHalalah ?? null,
      currency: currency ?? 'SAR',
      failureReason: failureReason ?? null,
      rawPayload: rawPayload as object,
    },
    update: {
      eventType: registryKey,
      amountHalalah: amountHalalah ?? null,
      currency: currency ?? 'SAR',
      failureReason: failureReason ?? null,
      rawPayload: rawPayload as object,
    },
  })

  const domain = entry.domainEvent as MoyasarWebhookDomainEvent
  if (domain && domain.startsWith('payout.')) {
    await emitPayoutDomainEvent(
      domain as
        | 'payout.initiated'
        | 'payout.paid'
        | 'payout.failed'
        | 'payout.canceled'
        | 'payout.returned',
      {
      moyasarPayoutId: dataId,
      amountHalalah,
      currency: currency ?? 'SAR',
      failureReason: failureReason ?? undefined,
    })
  }

  if (registryKey === 'PAYOUT_FAILED') {
    await notifyStaffPayoutEvent('failed', {
      moyasarPayoutId: dataId,
      amountHalalah,
      currency: currency ?? 'SAR',
      reason: failureReason ?? undefined,
    })
  } else if (registryKey === 'PAYOUT_RETURNED') {
    await notifyStaffPayoutEvent('returned', {
      moyasarPayoutId: dataId,
      amountHalalah,
      currency: currency ?? 'SAR',
      reason: failureReason ?? undefined,
    })
  } else if (registryKey === 'PAYOUT_PAID') {
    await notifyStaffPayoutEvent('paid', {
      moyasarPayoutId: dataId,
      amountHalalah,
      currency: currency ?? 'SAR',
    })
  }
}

async function emitPayoutDomainEvent(
  domain: Exclude<MoyasarWebhookDomainEvent, null | 'payment.success' | 'payment.failed' | 'payment.refunded'>,
  p: {
    moyasarPayoutId: string
    amountHalalah?: number
    currency: string
    failureReason?: string
  }
): Promise<void> {
  const amountStr =
    p.amountHalalah != null && Number.isFinite(p.amountHalalah)
      ? String(p.amountHalalah)
      : undefined

  const base = {
    moyasarPayoutId: p.moyasarPayoutId,
    amount: amountStr,
    currency: p.currency,
    failureReason: p.failureReason,
    userId: 'system',
    timestamp: new Date(),
  }

  switch (domain) {
    case 'payout.initiated':
      await EventBus.emit('payout.initiated', base)
      return
    case 'payout.paid':
      await EventBus.emit('payout.paid', base)
      return
    case 'payout.failed':
      await EventBus.emit('payout.failed', base)
      return
    case 'payout.canceled':
      await EventBus.emit('payout.canceled', base)
      return
    case 'payout.returned':
      await EventBus.emit('payout.returned', base)
      return
    default:
      return
  }
}

type PayoutStaffVariant = 'failed' | 'returned' | 'paid'

/**
 * [FIX 5] Staff in-app alerts for critical / informational payout outcomes.
 */
export async function notifyStaffPayoutEvent(
  variant: PayoutStaffVariant,
  p: {
    moyasarPayoutId: string
    amountHalalah?: number
    currency: string
    reason?: string
  }
): Promise<void> {
  const staff = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { notIn: [UserRole.CUSTOMER, UserRole.VENDOR] },
    },
    select: { id: true },
  })
  if (staff.length === 0) return

  const amt =
    p.amountHalalah != null && Number.isFinite(p.amountHalalah)
      ? `${p.amountHalalah} ${p.currency} (halalah)`
      : '—'

  const typeMap: Record<PayoutStaffVariant, { type: string; title: string; message: string }> = {
    failed: {
      type: 'admin.payout.failed',
      title: 'فشل تحويل مالي (Moyasar)',
      message: `فشل السحب ${p.moyasarPayoutId} — ${amt}${p.reason ? ` — ${p.reason}` : ''}`,
    },
    returned: {
      type: 'admin.payout.returned',
      title: 'إرجاع تحويل (Moyasar)',
      message: `تم إرجاع السحب ${p.moyasarPayoutId} — ${amt}${p.reason ? ` — ${p.reason}` : ''}`,
    },
    paid: {
      type: 'admin.payout.paid',
      title: 'تم السحب (Moyasar)',
      message: `اكتمل السحب ${p.moyasarPayoutId} — ${amt}`,
    },
  }

  const tpl = typeMap[variant]

  await prisma.notification.createMany({
    data: staff.map((u) => ({
      userId: u.id,
      channel: NotificationChannel.IN_APP,
      type: tpl.type,
      title: tpl.title,
      message: tpl.message,
      data: {
        moyasarPayoutId: p.moyasarPayoutId,
        amountHalalah: p.amountHalalah,
        currency: p.currency,
        reason: p.reason,
      },
    })),
  })

  logger.info('[Moyasar] Staff payout notification', {
    variant,
    moyasarPayoutId: p.moyasarPayoutId,
  })
}
