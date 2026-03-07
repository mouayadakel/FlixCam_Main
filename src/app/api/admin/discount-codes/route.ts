/**
 * @file route.ts
 * @description Admin endpoints for discount code management (list + create)
 * @module app/api/admin/discount-codes
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const ALLOWED_ROLES = ['ADMIN'] as const

const createDiscountCodeSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .transform((v) => v.toUpperCase().trim()),
  description: z.string().max(500).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().positive('Value must be positive'),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  usageLimitPerUser: z.number().int().positive().optional().nullable(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional().nullable(),
  appliesTo: z.enum(['ALL', 'EQUIPMENT', 'STUDIO', 'BUNDLES']).default('ALL'),
  isActive: z.boolean().default(true),
})

/**
 * GET /api/admin/discount-codes
 * Lists all discount codes with pagination and usage counts.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role as string | undefined
    if (!userRole || !ALLOWED_ROLES.includes(userRole as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden: ADMIN role required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100)
    const skip = (page - 1) * limit

    const [codes, total] = await Promise.all([
      prisma.discountCode.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { usages: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.discountCode.count({ where: { deletedAt: null } }),
    ])

    return NextResponse.json({
      success: true,
      data: codes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Admin list discount codes failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/discount-codes
 * Creates a new discount code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role as string | undefined
    if (!userRole || !ALLOWED_ROLES.includes(userRole as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden: ADMIN role required' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = createDiscountCodeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const existing = await prisma.discountCode.findFirst({
      where: { code: data.code, deletedAt: null },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Discount code "${data.code}" already exists` },
        { status: 409 }
      )
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        code: data.code,
        description: data.description,
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? null,
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        usageLimitPerUser: data.usageLimitPerUser ?? null,
        validFrom: new Date(data.validFrom),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        appliesTo: data.appliesTo,
        isActive: data.isActive,
        createdBy: session.user.id,
      },
    })

    logger.info('Discount code created', {
      codeId: discountCode.id,
      code: discountCode.code,
      createdBy: session.user.id,
    })

    return NextResponse.json(
      { success: true, data: discountCode },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Admin create discount code failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
