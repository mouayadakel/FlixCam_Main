/**
 * @file registry.ts
 * @description Gateway registry: supported gateways, getAdapter, testConnection.
 * @module lib/integrations/payment-gateway
 */

import type { GatewayDefinition, GatewaySlug, PaymentGatewayAdapter } from './types'
import { createTapAdapter, testTapConnection } from '@/lib/integrations/tap/adapter'
import { createMoyasarAdapter, testMoyasarConnection } from '@/lib/integrations/moyasar/adapter'

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
    createAdapter: () => stubAdapter,
    testConnection: (c) => notImplemented('myfatoorah'),
  },
  {
    slug: 'tamara',
    name: 'Tamara',
    credentialKeys: ['apiToken', 'notificationToken', 'publicKey'],
    createAdapter: () => stubAdapter,
    testConnection: (c) => notImplemented('tamara'),
  },
  {
    slug: 'tabby',
    name: 'Tabby',
    credentialKeys: ['secretKey', 'publicKey'],
    createAdapter: () => stubAdapter,
    testConnection: (c) => notImplemented('tabby'),
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

/**
 * Get all supported gateway definitions (for admin list).
 */
export function getSupportedGateways(): GatewayDefinition[] {
  return [...gatewayDefinitions]
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
