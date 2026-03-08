import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [brands, categories] = await Promise.all([
      prisma.brand.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.category.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, parentId: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({ brands, categories })
  } catch (error: any) {
    console.error('Lookup failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
