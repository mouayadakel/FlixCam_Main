/**
 * GET /api/admin/studios/[id]/addons - List add-ons
 * POST /api/admin/studios/[id]/addons - Create add-on
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0),
  originalPrice: z.number().min(0).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  iconName: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_READ))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const studio = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }
    const addOns = await prisma.studioAddOn.findMany({
      where: { studioId: id, deletedAt: null },
    })
    return NextResponse.json({
      data: addOns.map((a) => ({
        ...a,
        price: Number(a.price),
        originalPrice: a.originalPrice ? Number(a.originalPrice) : null,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const studio = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }
    const body = await request.json()
    const data = createSchema.parse(body)
    const addOn = await prisma.studioAddOn.create({
      data: {
        studioId: id,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        originalPrice: data.originalPrice ?? null,
        category: data.category ?? null,
        iconName: data.iconName ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
    })
    return NextResponse.json(
      {
        ...addOn,
        price: Number(addOn.price),
        originalPrice: addOn.originalPrice ? Number(addOn.originalPrice) : null,
      },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
