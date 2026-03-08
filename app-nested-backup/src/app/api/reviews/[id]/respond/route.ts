/**
 * @file route.ts
 * @description Respond to a review (admin reply)
 * @module app/api/reviews/[id]/respond
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { respondToReviewSchema } from '@/lib/validators/review.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.review.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Review', id)

    const body = await request.json()
    const parsed = respondToReviewSchema.parse(body)

    const review = await prisma.review.update({
      where: { id },
      data: {
        adminResponse: parsed.adminResponse,
        respondedBy: session.user.id,
        respondedAt: new Date(),
        status: 'APPROVED',
      },
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
