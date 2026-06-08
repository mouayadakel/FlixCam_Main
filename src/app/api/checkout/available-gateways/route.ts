/**
 * @file route.ts
 * @description GET enabled payment gateways for checkout (public info only).
 * @module app/api/checkout/available-gateways
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const gateways = await PaymentGatewayConfigService.getEnabledGateways()
    const defaultGateway = (process.env.PAYMENT_DEFAULT_GATEWAY || 'moyasar').toLowerCase()

    const sortedGateways = [...gateways].sort((a, b) => {
      if (a.slug === defaultGateway && b.slug !== defaultGateway) return -1
      if (b.slug === defaultGateway && a.slug !== defaultGateway) return 1
      return a.sortOrder - b.sortOrder
    })

    return NextResponse.json({
      gateways: sortedGateways,
    })
  } catch (error) {
    logger.error('Available gateways error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ gateways: [] }, { status: 200 })
  }
}
