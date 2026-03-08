/**
 * PUT /api/admin/studios/[id]/addons/[addonId] - Update add-on
 * DELETE /api/admin/studios/[id]/addons/[addonId] - Soft delete add-on
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
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
    const { addonId } = await params
    const existing = await prisma.studioAddOn.findFirst({
      where: { id: addonId, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
    }
    const body = await request.json()
    const data = updateSchema.parse(body)
    const addOn = await prisma.studioAddOn.update({
      where: { id: addonId },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price != null && { price: data.price }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: session.user.id,
      },
    })
    return NextResponse.json({ ...addOn, price: Number(addOn.price) })
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
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
    const { addonId } = await params
    const existing = await prisma.studioAddOn.findFirst({
      where: { id: addonId, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
    }
    await prisma.studioAddOn.update({
      where: { id: addonId },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
        updatedBy: session.user.id,
      },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
