/**
 * @file registry.ts
 * @description Gateway registry: supported gateways, getAdapter, testConnection.
 * @module lib/integrations/payment-gateway
 */

import type { GatewayDefinition, GatewaySlug, PaymentGatewayAdapter } from './types'
import { createTapAdapter, testTapConnection } from '@/lib/integrations/tap/adapter'
import { createMoyasarAdapter, testMoyasarConnection } from '@/lib/integrations/moyasar/adapter'
import { createMyFatoorahAdapter, testMyFatoorahConnection } from '@/lib/integrations/myfatoorah/adapter'
import { createTamaraAdapter, testTamaraConnection } from '@/lib/integrations/tamara/adapter'
import { createTabbyAdapter, testTabbyConnection } from '@/lib/integrations/tabby/adapter'

const notImplemented = (slug: string) =>
  Promise.resolve({
    ok: false,
    message: `${slug} integration not implemented yet`,
  })

const stubAdapter: PaymentGatewayAdapter = {
  async createPayment() {
    return { success: false, error: 'Gateway not implemented' }
  },
}

const gatewayDefinitions: GatewayDefinition[] = [
  {
    slug: 'tap',
    name: 'Tap Payments',
    credentialKeys: ['secretKey', 'publicKey', 'webhookSecret'],
    createAdapter: createTapAdapter,
    testConnection: testTapConnection,
  },
  {
    slug: 'moyasar',
    name: 'Moyasar',
    credentialKeys: ['secretKey', 'publishableKey', 'webhookSecret'],
    createAdapter: createMoyasarAdapter,
    testConnection: testMoyasarConnection,
  },
  {
    slug: 'myfatoorah',
    name: 'MyFatoorah',
    credentialKeys: ['apiKey', 'webhookSecret'],
    createAdapter: createMyFatoorahAdapter,
    testConnection: testMyFatoorahConnection,
  },
  {
    slug: 'tamara',
    name: 'Tamara',
    credentialKeys: ['apiToken', 'notificationToken', 'publicKey'],
    createAdapter: createTamaraAdapter,
    testConnection: testTamaraConnection,
  },
  {
    slug: 'tabby',
    name: 'Tabby',
    credentialKeys: ['secretKey', 'publicKey'],
    createAdapter: createTabbyAdapter,
    testConnection: testTabbyConnection,
  },
  {
    slug: 'paytabs',
    name: 'PayTabs',
    credentialKeys: ['profileId', 'serverKey'],
    createAdapter: () => stubAdapter,
    testConnection: (c) => notImplemented('paytabs'),
  },
  {
    slug: 'hyperpay',
    name: 'HyperPay',
    credentialKeys: ['entityId', 'accessToken'],
    createAdapter: () => stubAdapter,
    testConnection: (c) => notImplemented('hyperpay'),
  },
  {
    slug: 'geidea',
    name: 'Geidea',
    credentialKeys: ['publicKey', 'apiPassword'],
    createAdapter: () => stubAdapter,
    testConnection: (c) => notImplemented('geidea'),
  },
]

const bySlug = new Map<GatewaySlug, GatewayDefinition>(
  gatewayDefinitions.map((d) => [d.slug, d])
)

const implementedGatewaySlugs = new Set<GatewaySlug>(['tap', 'moyasar', 'myfatoorah', 'tamara', 'tabby'])

/**
 * Get all supported gateway definitions (for admin list).
 */
export function getSupportedGateways(): GatewayDefinition[] {
  return [...gatewayDefinitions]
}

export function isImplementedGatewaySlug(slug: string): slug is GatewaySlug {
  return implementedGatewaySlugs.has(slug as GatewaySlug)
}

/**
 * Get adapter for a gateway slug with the given config.
 */
export function getAdapter(
  slug: GatewaySlug,
  config: Record<string, string | undefined>
): PaymentGatewayAdapter {
  const def = bySlug.get(slug)
  if (!def) {
    return stubAdapter
  }
  if (!isImplementedGatewaySlug(slug)) {
    throw new Error(
      `Gateway ${slug} is not implemented for checkout yet. Implemented gateways: tap, moyasar.`
    )
  }
  return def.createAdapter(config)
}

/**
 * Test connection for a gateway. Uses credentials from config (from DB or .env).
 */
export async function testConnection(
  slug: GatewaySlug,
  config: Record<string, string | undefined>
): Promise<{ ok: boolean; message: string }> {
  const def = bySlug.get(slug)
  if (!def) {
    return { ok: false, message: `Unknown gateway: ${slug}` }
  }
  return def.testConnection(config)
}

/**
 * Check if slug is a supported gateway.
 */
export function isSupportedSlug(slug: string): slug is GatewaySlug {
  return bySlug.has(slug as GatewaySlug)
}
