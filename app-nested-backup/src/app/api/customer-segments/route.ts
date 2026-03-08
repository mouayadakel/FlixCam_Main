/**
 * @file route.ts
 * @description Customer segments API – list and create
 * @module app/api/customer-segments
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createCustomerSegmentSchema } from '@/lib/validators/customer-segment.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const segments = await prisma.customerSegment.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    })

    const shape = segments.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description ?? null,
      discountPercent: s.discountPercent?.toString() ?? null,
      priorityBooking: s.priorityBooking,
      extendedTerms: s.extendedTerms,
      autoAssignRules: s.autoAssignRules,
      userCount: s._count.users,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))

    return NextResponse.json({ segments: shape })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createCustomerSegmentSchema.parse(body)

    const slug =
      parsed.slug?.trim() ||
      parsed.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

    const existing = await prisma.customerSegment.findFirst({
      where: { OR: [{ slug }, { name: parsed.name }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: existing.slug === slug ? 'Slug already in use' : 'Name already in use' },
        { status: 409 }
      )
    }

    const segment = await prisma.customerSegment.create({
      data: {
        name: parsed.name,
        slug: slug || parsed.name,
        description: parsed.description ?? null,
        discountPercent:
          parsed.discountPercent != null ? new Decimal(parsed.discountPercent) : null,
        priorityBooking: parsed.priorityBooking ?? false,
        extendedTerms: parsed.extendedTerms ?? false,
        autoAssignRules: (parsed.autoAssignRules == null
          ? Prisma.JsonNull
          : parsed.autoAssignRules) as Prisma.InputJsonValue,
      },
      include: { _count: { select: { users: true } } },
    })

    return NextResponse.json({
      segment: {
        id: segment.id,
        name: segment.name,
        slug: segment.slug,
        description: segment.description ?? null,
        discountPercent: segment.discountPercent?.toString() ?? null,
        priorityBooking: segment.priorityBooking,
        extendedTerms: segment.extendedTerms,
        autoAssignRules: segment.autoAssignRules,
        userCount: segment._count.users,
        createdAt: segment.createdAt.toISOString(),
        updatedAt: segment.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
