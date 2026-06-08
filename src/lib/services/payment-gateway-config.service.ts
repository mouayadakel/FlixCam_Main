/**
 * @file payment-gateway-config.service.ts
 * @description Payment gateway configuration: DB storage + env. At runtime, .env overrides DB per key (stale DB keys must not shadow deployment env).
 * @module lib/services/payment-gateway-config
 */

import { prisma } from '@/lib/db/prisma'
import { encrypt, decrypt, isEncrypted } from '@/lib/utils/encryption'
import { AuditService } from './audit.service'
import { isImplementedGatewaySlug } from '@/lib/integrations/payment-gateway/registry'

/** Env var names per gateway slug and credential key (for fallback when not in DB) */
export const GATEWAY_ENV_KEYS: Record<string, Record<string, string>> = {
  tap: {
    secretKey: 'TAP_SECRET_KEY',
    publicKey: 'TAP_PUBLIC_KEY',
    webhookSecret: 'TAP_WEBHOOK_SECRET',
  },
  moyasar: {
    secretKey: 'MOYASAR_SECRET_KEY',
    publishableKey: 'MOYASAR_PUBLISHABLE_KEY',
    webhookSecret: 'MOYASAR_WEBHOOK_SECRET',
  },
  myfatoorah: {
    apiKey: 'MYFATOORAH_API_KEY',
    webhookSecret: 'MYFATOORAH_WEBHOOK_SECRET',
  },
  tamara: {
    apiToken: 'TAMARA_API_TOKEN',
    notificationToken: 'TAMARA_NOTIFICATION_TOKEN',
    publicKey: 'TAMARA_PUBLIC_KEY',
  },
  tabby: {
    secretKey: 'TABBY_SECRET_KEY',
    publicKey: 'TABBY_PUBLIC_KEY',
  },
  paytabs: {
    profileId: 'PAYTABS_PROFILE_ID',
    serverKey: 'PAYTABS_SERVER_KEY',
  },
  hyperpay: {
    entityId: 'HYPERPAY_ENTITY_ID',
    accessToken: 'HYPERPAY_ACCESS_TOKEN',
  },
  geidea: {
    publicKey: 'GEIDEA_PUBLIC_KEY',
    apiPassword: 'GEIDEA_API_PASSWORD',
  },
}

/** All supported gateway slugs (order here = default sort order when no DB row) */
export const SUPPORTED_GATEWAY_SLUGS = [
  'tap',
  'moyasar',
  'myfatoorah',
  'tamara',
  'tabby',
  'paytabs',
  'hyperpay',
  'geidea',
] as const

export interface PaymentGatewayConfigPublic {
  slug: string
  enabled: boolean
  displayName: string | null
  sortOrder: number
  lastCheckedAt: Date | null
  lastCheckOk: boolean | null
}

export interface PaymentGatewayConfigForAdmin extends PaymentGatewayConfigPublic {
  credentialSources?: Record<string, 'db' | 'env'>
  credentialMask?: Record<string, string>
}

export interface PaymentGatewayCredentials {
  [key: string]: string | undefined
}

export interface EnabledGatewayPublic {
  slug: string
  displayName: string
  sortOrder: number
  publishableKey?: string
}

type PaymentGatewayConfigDelegate = {
  findMany?: (...args: any[]) => Promise<any>
  findFirst?: (...args: any[]) => Promise<any>
  update?: (...args: any[]) => Promise<any>
  updateMany?: (...args: any[]) => Promise<any>
  create?: (...args: any[]) => Promise<any>
}

function getPaymentGatewayConfigDelegate(): PaymentGatewayConfigDelegate | null {
  return ((prisma as unknown as { paymentGatewayConfig?: PaymentGatewayConfigDelegate })
    .paymentGatewayConfig ?? null)
}

function isMissingPaymentGatewayConfigTableError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('paymentgatewayconfig') ||
    msg.includes('does not exist') ||
    msg.includes("doesn't exist") ||
    msg.includes('unknown arg') ||
    (msg.includes('relation') && msg.includes('exist')) ||
    (msg.includes('table') && msg.includes('exist')) ||
    msg.includes('no such table')
  )
}

function getEnvFallback(slug: string): PaymentGatewayCredentials {
  const keys = GATEWAY_ENV_KEYS[slug]
  if (!keys) return {}
  const out: PaymentGatewayCredentials = {}
  for (const [credKey, envVar] of Object.entries(keys)) {
    const v = process.env[envVar]?.trim()
    if (v) out[credKey] = v
  }
  return out
}

/**
 * Per-key merge: environment (deployment) wins over DB so live keys in `MOYASAR_*` etc. are not
 * overridden by older test keys still stored in PaymentGatewayConfig.
 */
export function mergePaymentGatewayCredentials(
  envCreds: PaymentGatewayCredentials,
  dbCreds: PaymentGatewayCredentials
): PaymentGatewayCredentials {
  return { ...dbCreds, ...envCreds }
}

export class PaymentGatewayConfigService {
  /**
   * List all gateway configs (no raw credentials). One entry per supported slug; DB + env merged.
   * Ordered by sortOrder (DB) or default index.
   * If PaymentGatewayConfig table does not exist (migration not run), returns defaults so UI can load.
   */
  static async listConfigs(): Promise<PaymentGatewayConfigForAdmin[]> {
    const delegate = getPaymentGatewayConfigDelegate()
    let rows: Array<{
      slug: string
      enabled: boolean
      displayName: string | null
      sortOrder: number
      lastCheckedAt: Date | null
      lastCheckOk: boolean | null
      credentialsEnc: string | null
    }>
    if (!delegate?.findMany) {
      rows = []
    } else {
      try {
        rows = await delegate.findMany({
          where: { deletedAt: null },
          select: {
            slug: true,
            enabled: true,
            displayName: true,
            sortOrder: true,
            lastCheckedAt: true,
            lastCheckOk: true,
            credentialsEnc: true,
          },
        })
      } catch (err) {
        if (isMissingPaymentGatewayConfigTableError(err)) {
          rows = []
        } else {
          throw err
        }
      }
    }
    const bySlug = new Map(rows.map((r) => [r.slug, r]))
    const result: PaymentGatewayConfigForAdmin[] = []
    for (let i = 0; i < SUPPORTED_GATEWAY_SLUGS.length; i++) {
      const slug = SUPPORTED_GATEWAY_SLUGS[i]
      const row = bySlug.get(slug)
      let dbCreds: PaymentGatewayCredentials = {}
      if (row?.credentialsEnc) {
        try {
          const raw = decrypt(row.credentialsEnc)
          dbCreds = JSON.parse(raw) as PaymentGatewayCredentials
        } catch {
          // ignore
        }
      }
      const envCreds = getEnvFallback(slug)
      const credentialSources: Record<string, 'db' | 'env'> = {}
      const credentialMask: Record<string, string> = {}
      const keySet = new Set([
        ...Object.keys(dbCreds),
        ...Object.keys(envCreds),
        ...(GATEWAY_ENV_KEYS[slug] ? Object.keys(GATEWAY_ENV_KEYS[slug]) : []),
      ])
      for (const k of keySet) {
        if (envCreds[k]) {
          credentialSources[k] = 'env'
          credentialMask[k] = '••• from .env'
        } else if (dbCreds[k]) {
          credentialSources[k] = 'db'
          credentialMask[k] = '***'
        }
      }
      result.push({
        slug,
        enabled: row?.enabled ?? false,
        displayName: row?.displayName ?? null,
        sortOrder: row?.sortOrder ?? i,
        lastCheckedAt: row?.lastCheckedAt ?? null,
        lastCheckOk: row?.lastCheckOk ?? null,
        credentialSources,
        credentialMask,
      })
    }
    result.sort((a, b) => a.sortOrder - b.sortOrder)
    return result
  }

  /**
   * Get credentials stored in DB only (no .env fallback). Used when merging partial credential updates.
   */
  static async getConfigDbOnly(slug: string): Promise<PaymentGatewayCredentials> {
    const delegate = getPaymentGatewayConfigDelegate()
    if (!delegate?.findFirst) return {}

    let row: { credentialsEnc: string | null } | null = null
    try {
      row = await delegate.findFirst({
        where: { slug, deletedAt: null },
        select: { credentialsEnc: true },
      })
    } catch (err) {
      if (!isMissingPaymentGatewayConfigTableError(err)) {
        throw err
      }
    }
    if (!row?.credentialsEnc) return {}
    try {
      const raw = decrypt(row.credentialsEnc)
      return (JSON.parse(raw) as PaymentGatewayCredentials) || {}
    } catch {
      return {}
    }
  }

  /**
   * Merged credentials for server use: .env overrides DB per key, then any DB-only keys apply.
   * Used by adapters and webhooks.
   */
  static async getConfig(slug: string): Promise<PaymentGatewayCredentials | null> {
    const delegate = getPaymentGatewayConfigDelegate()
    const envCreds = getEnvFallback(slug)
    let row: { credentialsEnc: string | null } | null = null
    if (delegate?.findFirst) {
      try {
        row = await delegate.findFirst({
          where: { slug, deletedAt: null },
          select: { credentialsEnc: true },
        })
      } catch (err) {
        if (!isMissingPaymentGatewayConfigTableError(err)) {
          throw err
        }
      }
    }
    let dbCreds: PaymentGatewayCredentials = {}
    if (row?.credentialsEnc) {
      try {
        const raw = decrypt(row.credentialsEnc)
        dbCreds = JSON.parse(raw) as PaymentGatewayCredentials
      } catch {
        // fall through to env
      }
    }
    const merged = mergePaymentGatewayCredentials(envCreds, dbCreds)
    if (Object.keys(merged).length === 0) return null
    return merged
  }

  /**
   * Get config shape for admin UI: merged credentials masked, with source per key (db vs env).
   */
  static async getConfigForAdmin(slug: string): Promise<PaymentGatewayConfigForAdmin | null> {
    const delegate = getPaymentGatewayConfigDelegate()
    let row: {
      slug: string
      enabled: boolean
      displayName: string | null
      sortOrder: number
      lastCheckedAt: Date | null
      lastCheckOk: boolean | null
      credentialsEnc: string | null
    } | null = null
    if (delegate?.findFirst) {
      try {
        row = await delegate.findFirst({
          where: { slug, deletedAt: null },
          select: {
            slug: true,
            enabled: true,
            displayName: true,
            sortOrder: true,
            lastCheckedAt: true,
            lastCheckOk: true,
            credentialsEnc: true,
          },
        })
      } catch (err) {
        if (!isMissingPaymentGatewayConfigTableError(err)) {
          throw err
        }
      }
    }
    const envCreds = getEnvFallback(slug)
    let dbCreds: PaymentGatewayCredentials = {}
    if (row?.credentialsEnc) {
      try {
        const raw = decrypt(row.credentialsEnc)
        dbCreds = JSON.parse(raw) as PaymentGatewayCredentials
      } catch {
        // ignore
      }
    }
    const credentialSources: Record<string, 'db' | 'env'> = {}
    const credentialMask: Record<string, string> = {}
    const keySet = new Set([
      ...Object.keys(dbCreds),
      ...Object.keys(envCreds),
      ...(GATEWAY_ENV_KEYS[slug] ? Object.keys(GATEWAY_ENV_KEYS[slug]) : []),
    ])
    for (const k of keySet) {
      if (envCreds[k]) {
        credentialSources[k] = 'env'
        credentialMask[k] = '••• from .env'
      } else if (dbCreds[k]) {
        credentialSources[k] = 'db'
        credentialMask[k] = '***'
      }
    }
    if (!row) {
      if (Object.keys(credentialSources).length === 0) return null
      return {
        slug,
        enabled: false,
        displayName: null,
        sortOrder: 0,
        lastCheckedAt: null,
        lastCheckOk: null,
        credentialSources,
        credentialMask,
      }
    }
    return {
      slug: row.slug,
      enabled: row.enabled,
      displayName: row.displayName,
      sortOrder: row.sortOrder,
      lastCheckedAt: row.lastCheckedAt,
      lastCheckOk: row.lastCheckOk,
      credentialSources,
      credentialMask,
    }
  }

  /**
   * Save or update gateway config (encrypted in DB). At runtime, .env still overrides the same keys if set.
   */
  static async saveConfig(
    slug: string,
    credentials: PaymentGatewayCredentials,
    enabled: boolean,
    userId: string,
    options?: { displayName?: string | null; sortOrder?: number }
  ): Promise<void> {
    const delegate = getPaymentGatewayConfigDelegate()
    if (!delegate?.findFirst || !delegate?.update || !delegate?.create) {
      throw new Error('PaymentGatewayConfig model is not available in Prisma client')
    }

    const encrypted = credentials && Object.keys(credentials).length > 0
      ? encrypt(JSON.stringify(credentials))
      : null
    const existing = await delegate.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    })
    const now = new Date()
    if (existing) {
      await delegate.update({
        where: { id: existing.id },
        data: {
          enabled,
          credentialsEnc: encrypted,
          displayName: options?.displayName ?? undefined,
          sortOrder: options?.sortOrder ?? undefined,
          updatedAt: now,
          updatedBy: userId,
        },
      })
    } else {
      await delegate.create({
        data: {
          slug,
          enabled,
          credentialsEnc: encrypted,
          displayName: options?.displayName ?? null,
          sortOrder: options?.sortOrder ?? 0,
          createdBy: userId,
          updatedBy: userId,
        },
      })
    }
    await AuditService.log({
      action: 'payment_gateway.config.updated',
      userId,
      resourceType: 'PaymentGatewayConfig',
      resourceId: slug,
      metadata: { slug, enabled },
    })
  }

  /**
   * Update only metadata (enabled, displayName, sortOrder) without touching credentials.
   */
  static async updateMeta(
    slug: string,
    updates: { enabled?: boolean; displayName?: string | null; sortOrder?: number },
    userId: string
  ): Promise<void> {
    const delegate = getPaymentGatewayConfigDelegate()
    if (!delegate?.findFirst || !delegate?.update || !delegate?.create) {
      throw new Error('PaymentGatewayConfig model is not available in Prisma client')
    }

    const existing = await delegate.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    })
    const now = new Date()
    const data: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: userId,
    }
    if (updates.enabled !== undefined) data.enabled = updates.enabled
    if (updates.displayName !== undefined) data.displayName = updates.displayName
    if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder

    if (existing) {
      await delegate.update({
        where: { id: existing.id },
        data,
      })
    } else {
      await delegate.create({
        data: {
          slug,
          enabled: updates.enabled ?? false,
          displayName: updates.displayName ?? null,
          sortOrder: updates.sortOrder ?? 0,
          createdBy: userId,
          updatedBy: userId,
        },
      })
    }
    await AuditService.log({
      action: 'payment_gateway.config.updated',
      userId,
      resourceType: 'PaymentGatewayConfig',
      resourceId: slug,
      metadata: { slug, ...updates },
    })
  }

  /**
   * Get enabled gateways for checkout, ordered by sortOrder. Public info only (no secrets).
   */
  static async getEnabledGateways(): Promise<EnabledGatewayPublic[]> {
    const delegate = getPaymentGatewayConfigDelegate()
    let rows: Array<{ slug: string; displayName: string | null; sortOrder: number }>
    if (!delegate?.findMany) {
      return []
    }
    try {
      rows = await delegate.findMany({
        where: { enabled: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, displayName: true, sortOrder: true },
      })
    } catch (err) {
      if (isMissingPaymentGatewayConfigTableError(err)) return []
      throw err
    }
    const result: EnabledGatewayPublic[] = []
    for (const r of rows) {
      if (!isImplementedGatewaySlug(r.slug)) continue
      const creds = await this.getConfig(r.slug)
      const publishableKey = creds?.publicKey ?? creds?.publishableKey
      result.push({
        slug: r.slug,
        displayName: r.displayName || r.slug,
        sortOrder: r.sortOrder,
        ...(publishableKey && { publishableKey }),
      })
    }
    return result
  }

  /**
   * Batch update sort order. slugOrder = ordered list of slugs (index = sortOrder).
   */
  static async reorder(slugOrder: string[], userId: string): Promise<void> {
    const delegate = getPaymentGatewayConfigDelegate()
    if (!delegate?.updateMany) {
      throw new Error('PaymentGatewayConfig model is not available in Prisma client')
    }

    const updates = slugOrder.map((slug, index) =>
      delegate.updateMany!({
        where: { slug, deletedAt: null },
        data: { sortOrder: index, updatedAt: new Date(), updatedBy: userId },
      })
    )
    await Promise.all(updates)
    await AuditService.log({
      action: 'payment_gateway.reordered',
      userId,
      resourceType: 'PaymentGatewayConfig',
      metadata: { slugOrder },
    })
  }

  /**
   * Update last check result for a gateway (after Test connection).
   */
  static async setLastCheck(slug: string, ok: boolean): Promise<void> {
    const delegate = getPaymentGatewayConfigDelegate()
    if (!delegate?.updateMany) {
      return
    }
    await delegate.updateMany({
      where: { slug, deletedAt: null },
      data: { lastCheckedAt: new Date(), lastCheckOk: ok },
    })
  }
}
