/**
 * @file route.ts
 * @description Waitlist API - join waitlist for unavailable equipment + list entries
 * @module app/api/waitlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const WAITLIST_EXPIRY_DAYS = 7

const createWaitlistSchema = z.object({
  equipmentId: z.string().min(1, 'Equipment ID is required'),
  desiredStartDate: z.string().datetime(),
  desiredEndDate: z.string().datetime(),
  desiredQty: z.number().int().positive().default(1),
  email: z.string().email().optional(),
})

/**
 * POST /api/waitlist
 * Creates a waitlist entry. Auth is optional (guests can provide email).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id ?? null

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = createWaitlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { equipmentId, desiredStartDate, desiredEndDate, desiredQty, email } = parsed.data

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Either authentication or an email address is required' },
        { status: 400 }
      )
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    const startDate = new Date(desiredStartDate)
    const endDate = new Date(desiredEndDate)

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    const duplicateWhere: Record<string, unknown> = {
      equipmentId,
      desiredStartDate: startDate,
      desiredEndDate: endDate,
      status: 'WAITING',
    }

    if (userId) {
      duplicateWhere.userId = userId
    } else {
      duplicateWhere.guestEmail = email
    }

    const existing = await prisma.waitlistEntry.findFirst({
      where: duplicateWhere,
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a waitlist entry for this equipment and dates' },
        { status: 409 }
      )
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + WAITLIST_EXPIRY_DAYS)

    const entry = await prisma.waitlistEntry.create({
      data: {
        equipmentId,
        userId: userId ?? undefined,
        guestEmail: !userId ? email : undefined,
        desiredStartDate: startDate,
        desiredEndDate: endDate,
        desiredQty,
        expiresAt,
        status: 'WAITING',
      },
    })

    const position = await prisma.waitlistEntry.count({
      where: {
        equipmentId,
        status: 'WAITING',
        createdAt: { lte: entry.createdAt },
      },
    })

    logger.info('Waitlist entry created', {
      entryId: entry.id,
      equipmentId,
      userId,
      position,
    })

    return NextResponse.json(
      { success: true, position },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Create waitlist entry failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/waitlist
 * Returns waitlist entries for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const entries = await prisma.waitlistEntry.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: {
          select: { id: true, nameEn: true, model: true, sku: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: entries })
  } catch (error) {
    logger.error('Get waitlist entries failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
