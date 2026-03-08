/**
 * GET /api/checkout/form-config?step=1|2|3
 * Public read-only: returns active sections + active fields for the given checkout step.
 * No auth required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stepParam = searchParams.get('step')
    const step = stepParam ? parseInt(stepParam, 10) : null

    if (step === null || Number.isNaN(step) || step < 1 || step > 3) {
      return NextResponse.json(
        { error: 'Query param step=1, 2, or 3 required' },
        { status: 400 }
      )
    }

    const sections = await prisma.checkoutFormSection.findMany({
      where: {
        step,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json({ sections })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/checkout/form-config]', error)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
