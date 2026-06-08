/**
 * @file moyasar-webhook.registry.ts
 * @description Explicit Moyasar webhook event registry (replaces substring heuristics for `moyasar` slug).
 * @module lib/services/moyasar-webhook.registry
 */

import { PaymentStatus } from '@prisma/client'

export type MoyasarWebhookEventClass = 'payment' | 'payout' | 'balance'

export type MoyasarWebhookDomainEvent =
  | 'payment.success'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payout.initiated'
  | 'payout.paid'
  | 'payout.failed'
  | 'payout.canceled'
  | 'payout.returned'
  | null

export interface MoyasarWebhookRegistryEntry {
  paymentStatus: PaymentStatus | null
  eventClass: MoyasarWebhookEventClass
  notifyCustomer: boolean
  notifyStaff: boolean
  domainEvent: MoyasarWebhookDomainEvent
}

/** Canonical uppercase keys as sent by Moyasar (and normalized aliases). */
export const MOYASAR_WEBHOOK_REGISTRY: Record<string, MoyasarWebhookRegistryEntry> = {
  // [FIX 1]
  PAYMENT_PAID: {
    paymentStatus: PaymentStatus.SUCCESS,
    eventClass: 'payment',
    notifyCustomer: true,
    notifyStaff: true,
    domainEvent: 'payment.success',
  },
  PAYMENT_FAILED: {
    paymentStatus: PaymentStatus.FAILED,
    eventClass: 'payment',
    notifyCustomer: true,
    notifyStaff: true,
    domainEvent: 'payment.failed',
  },
  PAYMENT_VOIDED: {
    paymentStatus: PaymentStatus.FAILED,
    eventClass: 'payment',
    notifyCustomer: true,
    notifyStaff: true,
    domainEvent: 'payment.failed',
  },
  PAYMENT_AUTHORIZED: {
    paymentStatus: PaymentStatus.PROCESSING,
    eventClass: 'payment',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: null,
  },
  PAYMENT_CAPTURED: {
    paymentStatus: PaymentStatus.SUCCESS,
    eventClass: 'payment',
    notifyCustomer: true,
    notifyStaff: true,
    domainEvent: 'payment.success',
  },
  PAYMENT_REFUNDED: {
    paymentStatus: PaymentStatus.REFUNDED,
    eventClass: 'payment',
    notifyCustomer: true,
    notifyStaff: true,
    domainEvent: 'payment.refunded',
  },
  PAYMENT_ABANDONED: {
    paymentStatus: PaymentStatus.FAILED,
    eventClass: 'payment',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payment.failed',
  },
  PAYMENT_VERIFIED: {
    paymentStatus: PaymentStatus.PROCESSING,
    eventClass: 'payment',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: null,
  },
  PAYMENT_CANCELED: {
    paymentStatus: PaymentStatus.FAILED,
    eventClass: 'payment',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payment.failed',
  },
  PAYMENT_EXPIRED: {
    paymentStatus: PaymentStatus.FAILED,
    eventClass: 'payment',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payment.failed',
  },
  BALANCE_TRANSFERRED: {
    paymentStatus: null,
    eventClass: 'balance',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: null,
  },
  PAYOUT_INITIATED: {
    paymentStatus: null,
    eventClass: 'payout',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payout.initiated',
  },
  PAYOUT_PAID: {
    paymentStatus: null,
    eventClass: 'payout',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payout.paid',
  },
  PAYOUT_FAILED: {
    paymentStatus: null,
    eventClass: 'payout',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payout.failed',
  },
  PAYOUT_CANCELED: {
    paymentStatus: null,
    eventClass: 'payout',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payout.canceled',
  },
  PAYOUT_RETURNED: {
    paymentStatus: null,
    eventClass: 'payout',
    notifyCustomer: false,
    notifyStaff: true,
    domainEvent: 'payout.returned',
  },
}

export class MoyasarWebhookUnknownEventError extends Error {
  constructor(public readonly rawType: string) {
    super(`[Moyasar] Unknown webhook event type: ${rawType}`)
    this.name = 'MoyasarWebhookUnknownEventError'
  }
}

/**
 * Payment resource `status` strings from Moyasar REST API / callbacks map to webhook registry keys.
 */
const MOYASAR_LEGACY_TYPE_ALIASES: Record<string, keyof typeof MOYASAR_WEBHOOK_REGISTRY> = {
  PAID: 'PAYMENT_PAID',
  FAILED: 'PAYMENT_FAILED',
  AUTHORIZED: 'PAYMENT_AUTHORIZED',
  CAPTURED: 'PAYMENT_CAPTURED',
  REFUNDED: 'PAYMENT_REFUNDED',
  VOIDED: 'PAYMENT_VOIDED',
  ABANDONED: 'PAYMENT_ABANDONED',
  VERIFIED: 'PAYMENT_VERIFIED',
  EXPIRED: 'PAYMENT_EXPIRED',
  CANCELED: 'PAYMENT_CANCELED',
  CANCELLED: 'PAYMENT_CANCELED',
}

/**
 * Normalize Moyasar `type` field to registry key (e.g. payment_paid → PAYMENT_PAID).
 */
export function normalizeMoyasarWebhookType(raw: string): string {
  const t = raw.trim()
  if (!t) {
    throw new MoyasarWebhookUnknownEventError(raw)
  }
  const upper = t.toUpperCase().replace(/\./g, '_')
  if (upper in MOYASAR_WEBHOOK_REGISTRY) {
    return upper
  }
  const snake = t
    .trim()
    .toLowerCase()
    .replace(/\./g, '_')
    .replace(/-/g, '_')
  const fromSnake = snake.toUpperCase()
  if (fromSnake in MOYASAR_WEBHOOK_REGISTRY) {
    return fromSnake
  }
  const aliasKey = MOYASAR_LEGACY_TYPE_ALIASES[upper] || MOYASAR_LEGACY_TYPE_ALIASES[fromSnake]
  if (aliasKey) {
    return aliasKey
  }
  throw new MoyasarWebhookUnknownEventError(raw)
}

export function getMoyasarWebhookRegistryEntry(rawType: string): MoyasarWebhookRegistryEntry {
  const key = normalizeMoyasarWebhookType(rawType)
  const entry = MOYASAR_WEBHOOK_REGISTRY[key]
  if (!entry) {
    throw new MoyasarWebhookUnknownEventError(rawType)
  }
  return entry
}
