/**
 * @file route.ts
 * @description POST test connection for a payment gateway (admin).
 * @module app/api/admin/settings/payment-gateways/[slug]/check
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import {
  GATEWAY_ENV_KEYS,
  PaymentGatewayConfigService,
} from '@/lib/services/payment-gateway-config.service'
import { testConnection, isSupportedSlug } from '@/lib/integrations/payment-gateway/registry'
import type { GatewaySlug } from '@/lib/integrations/payment-gateway/types'

export const dynamic = 'force-dynamic'

function isProductionRuntime(): boolean {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase()
  if (nodeEnv === 'production') return true
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || ''
  return /https?:\/\/(www\.)?flixcam\.rent/i.test(appUrl)
}

function isLikelyTestCredential(value: string | undefined): boolean {
  if (!value) return false
  const v = value.toLowerCase()
  return v.includes('test') || v.startsWith('sk_test_') || v.startsWith('pk_test_')
}

function detectProdTestKeyWarning(
  slug: string,
  config: Record<string, string | undefined>
): string | null {
  if (!isProductionRuntime()) return null

  if (slug === 'moyasar') {
    if (isLikelyTestCredential(config.secretKey) || isLikelyTestCredential(config.publishableKey)) {
      return 'Potential misconfiguration: Moyasar test keys detected in production environment.'
    }
    return null
  }

  if (slug === 'tap') {
    if (isLikelyTestCredential(config.secretKey) || isLikelyTestCredential(config.publicKey)) {
      return 'Potential misconfiguration: Tap test keys detected in production environment.'
    }
    return null
  }

  return null
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { slug } = await context.params
    if (!isSupportedSlug(slug)) {
      return NextResponse.json({ error: 'Invalid gateway slug' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    // Always start with DB + .env (same as checkout). Empty form `credentials: {}` must not
    // wipe keys — previously it did and "Test connection" always failed for Moyasar.
    const base = (await PaymentGatewayConfigService.getConfig(slug)) || {}
    const config: Record<string, string | undefined> = { ...base }
    // Force process.env onto config (same priority as live checkout) in case of any desync.
    const envKeyMap = GATEWAY_ENV_KEYS[slug]
    if (envKeyMap) {
      for (const [credKey, envVar] of Object.entries(envKeyMap)) {
        const v = process.env[envVar]?.trim()
        if (v) config[credKey] = v
      }
    }
    if (body.credentials && typeof body.credentials === 'object') {
      for (const [k, v] of Object.entries(body.credentials)) {
        if (typeof v === 'string' && v.trim() !== '') {
          config[k] = v.trim()
        }
      }
    }

    const result = await testConnection(slug as GatewaySlug, config)
    const warning = detectProdTestKeyWarning(slug, config)

    if (result.ok) {
      await PaymentGatewayConfigService.setLastCheck(slug, true)
    } else {
      await PaymentGatewayConfigService.setLastCheck(slug, false)
    }

    return NextResponse.json({ ok: result.ok, message: result.message, ...(warning && { warning }) })
  } catch (error) {
    console.error('Payment gateway check error:', error)
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Check failed' },
      { status: 200 }
    )
  }
}
