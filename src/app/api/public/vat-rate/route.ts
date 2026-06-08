/**
 * Public VAT rate from company settings (cached server-side in getVATRate).
 */

import { NextResponse } from 'next/server'
import { getVATRate, formatVATRate } from '@/lib/vat'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rate = await getVATRate()
    const n = rate.toNumber()
    return NextResponse.json(
      {
        rate: n,
        percentLabel: formatVATRate(rate),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch {
    return NextResponse.json({ rate: 0.15, percentLabel: '15.00%' }, { status: 200 })
  }
}
