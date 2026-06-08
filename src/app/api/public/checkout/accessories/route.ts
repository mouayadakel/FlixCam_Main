/**
 * GET /api/public/checkout/accessories — dynamic checkout add-on catalog
 */

import { NextResponse } from 'next/server'
import { getCheckoutAccessories } from '@/lib/services/checkout-accessories.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await getCheckoutAccessories()
  return NextResponse.json({ items })
}
