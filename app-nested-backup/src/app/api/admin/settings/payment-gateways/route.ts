/**
 * @file route.ts
 * @description GET/PATCH payment gateways config (admin). Toggle, credentials, order.
 * @module app/api/admin/settings/payment-gateways
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { getSupportedGateways, isSupportedSlug } from '@/lib/integrations/payment-gateway/registry'

export const dynamic = 'force-dynamic'

function buildDefaultGateways() {
  const definitions = getSupportedGateways()
  return definitions.map((def, i) => ({
    ...def,
    enabled: false,
    displayName: null,
    sortOrder: i,
    lastCheckedAt: null,
    lastCheckOk: null,
    credentialSources: {} as Record<string, 'db' | 'env'>,
    credentialMask: {} as Record<string, string>,
  }))
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const definitions = getSupportedGateways()
    let configs: Awaited<ReturnType<typeof PaymentGatewayConfigService.listConfigs>>
    try {
      configs = await PaymentGatewayConfigService.listConfigs()
    } catch (dbError) {
      console.warn('Payment gateways listConfigs failed, returning defaults:', dbError)
      configs = buildDefaultGateways()
    }

    const configBySlug = new Map(configs.map((c) => [c.slug, c]))
    const gateways = definitions.map((def) => {
      const config = configBySlug.get(def.slug)
      return {
        ...def,
        enabled: config?.enabled ?? false,
        displayName: config?.displayName ?? null,
        sortOrder: config?.sortOrder ?? 0,
        lastCheckedAt: config?.lastCheckedAt ?? null,
        lastCheckOk: config?.lastCheckOk ?? null,
        credentialSources: config?.credentialSources ?? {},
        credentialMask: config?.credentialMask ?? {},
      }
    })
    gateways.sort((a, b) => a.sortOrder - b.sortOrder)

    return NextResponse.json({ gateways })
  } catch (error) {
    console.error('Payment gateways GET error:', error)
    return NextResponse.json(
      { gateways: buildDefaultGateways() },
      { status: 200 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (body.sortOrder !== undefined && Array.isArray(body.sortOrder)) {
      const slugOrder = body.sortOrder as Array<{ slug: string; sortOrder: number } | string>
      const slugs = slugOrder.map((item) => (typeof item === 'string' ? item : item.slug))
      if (slugs.some((s) => !isSupportedSlug(s))) {
        return NextResponse.json({ error: 'Invalid gateway slug in sortOrder' }, { status: 400 })
      }
      await PaymentGatewayConfigService.reorder(slugs, session.user.id)
      return NextResponse.json({ success: true })
    }

    const slug = body.slug as string | undefined
    if (!slug || !isSupportedSlug(slug)) {
      return NextResponse.json({ error: 'Invalid or missing slug' }, { status: 400 })
    }

    const credentials =
      typeof body.credentials === 'object' && body.credentials !== null
        ? (body.credentials as Record<string, string>)
        : undefined
    const filteredCreds: Record<string, string> = {}
    if (credentials) {
      for (const [k, v] of Object.entries(credentials)) {
        if (typeof v === 'string' && v.trim() !== '') filteredCreds[k] = v.trim()
      }
    }

    const enabled = typeof body.enabled === 'boolean' ? body.enabled : undefined
    const displayName =
      body.displayName !== undefined ? (body.displayName === '' ? null : body.displayName) : undefined
    const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : undefined

    const current = await PaymentGatewayConfigService.getConfigForAdmin(slug)
    const hasCredentialUpdate = Object.keys(filteredCreds).length > 0

    if (hasCredentialUpdate) {
      const dbOnly = await PaymentGatewayConfigService.getConfigDbOnly(slug)
      const merged = { ...dbOnly, ...filteredCreds }
      await PaymentGatewayConfigService.saveConfig(
        slug,
        merged,
        enabled ?? current?.enabled ?? false,
        session.user.id,
        {
          displayName: displayName ?? current?.displayName ?? null,
          sortOrder: sortOrder ?? current?.sortOrder,
        }
      )
    } else {
      await PaymentGatewayConfigService.updateMeta(
        slug,
        {
          enabled: enabled ?? current?.enabled,
          displayName: displayName ?? current?.displayName,
          sortOrder: sortOrder ?? current?.sortOrder,
        },
        session.user.id
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment gateways PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update payment gateway' },
      { status: 500 }
    )
  }
}
