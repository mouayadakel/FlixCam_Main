/**
 * @file route.ts
 * @description Single review – get, update (moderate)
 * @module app/api/reviews/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateReviewSchema } from '@/lib/validators/review.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            customerId: true,
          },
        },
      },
    })
    if (!review) throw new NotFoundError('Review', id)
    const b = review.booking!
    return NextResponse.json({
      id: review.id,
      bookingId: review.bookingId,
      userId: review.userId,
      rating: review.rating,
      comment: review.comment ?? null,
      status: review.status,
      adminResponse: review.adminResponse ?? null,
      respondedBy: review.respondedBy ?? null,
      respondedAt: review.respondedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      user: review.user,
      booking: {
        ...b,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.review.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Review', id)

    const body = await request.json()
    const parsed = updateReviewSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.status !== undefined) updateData.status = parsed.status
    if (parsed.adminResponse !== undefined) {
      updateData.adminResponse = parsed.adminResponse
      updateData.respondedBy = session.user.id
      updateData.respondedAt = new Date()
    }

    const review = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })
    const b = review.booking!
    return NextResponse.json({
      id: review.id,
      bookingId: review.bookingId,
      userId: review.userId,
      rating: review.rating,
      comment: review.comment ?? null,
      status: review.status,
      adminResponse: review.adminResponse ?? null,
      respondedBy: review.respondedBy ?? null,
      respondedAt: review.respondedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      user: review.user,
      booking: {
        ...b,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
