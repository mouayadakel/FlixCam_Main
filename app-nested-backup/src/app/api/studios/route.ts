/**
 * @file route.ts
 * @description Studios API – list and create
 * @module app/api/studios
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { createStudioSchema } from '@/lib/validators/studio.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

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
 * GET /api/studios – List studios (with filters and pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const isActive = searchParams.get('isActive')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))

    const where: Prisma.StudioWhereInput = {
      deletedAt: null,
    }
    if (isActive === 'true') where.isActive = true
    if (isActive === 'false') where.isActive = false
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [studios, total] = await Promise.all([
      prisma.studio.findMany({
        where,
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
          _count: { select: { bookings: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.studio.count({ where }),
    ])

    const data = studios.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description ?? null,
      capacity: s.capacity ?? null,
      hourlyRate: Number(s.hourlyRate),
      setupBuffer: s.setupBuffer,
      cleaningBuffer: s.cleaningBuffer,
      resetTime: s.resetTime,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      _count: { bookings: s._count.bookings },
    }))

    return NextResponse.json({ data, total, page, pageSize })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/studios – Create studio
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const body = await request.json()
    const parsed = createStudioSchema.parse(body)

    const slug =
      parsed.slug && parsed.slug.trim() !== '' ? slugify(parsed.slug.trim()) : slugify(parsed.name)

    const existing = await prisma.studio.findFirst({
      where: {
        OR: [{ slug }, { name: parsed.name }],
        deletedAt: null,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: existing.slug === slug ? 'Slug already in use' : 'Studio name already exists' },
        { status: 409 }
      )
    }

    const studio = await prisma.studio.create({
      data: {
        name: parsed.name.trim(),
        slug,
        description: parsed.description?.trim() ?? null,
        capacity: parsed.capacity ?? null,
        hourlyRate: parsed.hourlyRate,
        setupBuffer: parsed.setupBuffer ?? 30,
        cleaningBuffer: parsed.cleaningBuffer ?? 30,
        resetTime: parsed.resetTime ?? 15,
        isActive: parsed.isActive ?? true,
        createdBy: session.user.id,
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
        _count: { select: { bookings: true } },
      },
    })

    return NextResponse.json({
      data: {
        ...studio,
        hourlyRate: Number(studio.hourlyRate),
        createdAt: studio.createdAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
