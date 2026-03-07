/**
 * GET /api/footer – Public footer settings (no auth). Returns first enabled footer with full tree.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

const footerInclude = {
  brand: true,
  contacts: {
    where: { enabled: true },
    orderBy: { order: 'asc' as const },
  },
  socialLinks: {
    where: { enabled: true },
    orderBy: { order: 'asc' as const },
  },
  columns: {
    where: { enabled: true },
    orderBy: { order: 'asc' as const },
    include: {
      links: {
        where: { enabled: true },
        orderBy: { order: 'asc' as const },
      },
    },
  },
  legal: {
    include: {
      links: {
        where: { enabled: true },
        orderBy: { order: 'asc' as const },
      },
    },
  },
  newsletter: true,
} as const

export async function GET() {
  try {
    const footer = await prisma.footerSettings.findFirst({
      where: { enabled: true },
      include: footerInclude,
    })
    if (!footer) {
      return NextResponse.json(null)
    }
    return NextResponse.json(footer, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/footer]', error)
    }
    return NextResponse.json(null, { status: 200 })
  }
}
