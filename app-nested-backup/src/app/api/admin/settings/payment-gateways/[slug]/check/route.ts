/**
 * @file route.ts
 * @description POST test connection for a payment gateway (admin).
 * @module app/api/admin/settings/payment-gateways/[slug]/check
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { testConnection, isSupportedSlug } from '@/lib/integrations/payment-gateway/registry'
import type { GatewaySlug } from '@/lib/integrations/payment-gateway/types'

export const dynamic = 'force-dynamic'

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

    let config: Record<string, string | undefined>
    const body = await request.json().catch(() => ({}))
    if (body.credentials && typeof body.credentials === 'object') {
      config = {}
      for (const [k, v] of Object.entries(body.credentials)) {
        if (typeof v === 'string') config[k] = v
      }
    } else {
      const merged = await PaymentGatewayConfigService.getConfig(slug)
      config = merged ? { ...merged } : {}
    }

    const result = await testConnection(slug as GatewaySlug, config)

    if (result.ok) {
      await PaymentGatewayConfigService.setLastCheck(slug, true)
    } else {
      await PaymentGatewayConfigService.setLastCheck(slug, false)
    }

    return NextResponse.json({ ok: result.ok, message: result.message })
  } catch (error) {
    console.error('Payment gateway check error:', error)
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Check failed' },
      { status: 200 }
    )
  }
}
