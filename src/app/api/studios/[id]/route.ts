/**
 * @file route.ts
 * @description Studio by ID – get, update, delete (soft)
 * @module app/api/studios/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateStudioSchema } from '@/lib/validators/studio.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/**
 * GET /api/studios/:id
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const { id } = await params
    const studio = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { bookings: true } },
      },
    })

    if (!studio) {
      throw new NotFoundError('Studio', id)
    }

    return NextResponse.json({
      data: {
        ...studio,
        hourlyRate: Number(studio.hourlyRate),
        createdAt: studio.createdAt.toISOString(),
        updatedAt: studio.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/studios/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const { id } = await params
    const existing = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new NotFoundError('Studio', id)
    }

    const body = await request.json()
    const parsed = updateStudioSchema.parse(body)

    if (parsed.name !== undefined && parsed.name.trim() !== existing.name) {
      const slug = (parsed.slug && parsed.slug.trim() !== '' ? slugify(parsed.slug.trim()) : slugify(parsed.name))
      const conflict = await prisma.studio.findFirst({
        where: {
          deletedAt: null,
          id: { not: id },
          OR: [{ slug }, { name: parsed.name.trim() }],
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: conflict.slug === slug ? 'Slug already in use' : 'Studio name already exists' },
          { status: 409 }
        )
      }
    }

    const slug =
      parsed.slug !== undefined && parsed.slug.trim() !== ''
        ? slugify(parsed.slug.trim())
        : parsed.name !== undefined
          ? slugify(parsed.name)
          : undefined

    const studio = await prisma.studio.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(parsed.description !== undefined && { description: parsed.description?.trim() ?? null }),
        ...(parsed.capacity !== undefined && { capacity: parsed.capacity }),
        ...(parsed.hourlyRate !== undefined && { hourlyRate: parsed.hourlyRate }),
        ...(parsed.setupBuffer !== undefined && { setupBuffer: parsed.setupBuffer }),
        ...(parsed.cleaningBuffer !== undefined && { cleaningBuffer: parsed.cleaningBuffer }),
        ...(parsed.resetTime !== undefined && { resetTime: parsed.resetTime }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
        updatedBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        capacity: true,
        hourlyRate: true,
        setupBuffer: true,
        cleaningBuffer: true,
        resetTime: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { bookings: true } },
      },
    })

    return NextResponse.json({
      data: {
        ...studio,
        hourlyRate: Number(studio.hourlyRate),
        createdAt: studio.createdAt.toISOString(),
        updatedAt: studio.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/studios/:id – Soft delete
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const { id } = await params
    const existing = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new NotFoundError('Studio', id)
    }

    const now = new Date()
    await prisma.studio.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedBy: session.user.id,
        updatedBy: session.user.id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
