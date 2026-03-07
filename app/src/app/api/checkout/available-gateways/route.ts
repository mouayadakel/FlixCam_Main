/**
 * @file route.ts
 * @description GET enabled payment gateways for checkout (public info only).
 * @module app/api/checkout/available-gateways
 */

import { NextResponse } from 'next/server'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const gateways = await PaymentGatewayConfigService.getEnabledGateways()
    return NextResponse.json({ gateways })
  } catch (error) {
    console.error('Available gateways error:', error)
    return NextResponse.json({ gateways: [] }, { status: 200 })
  }
}
