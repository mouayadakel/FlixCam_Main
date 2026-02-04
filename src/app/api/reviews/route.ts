/**
 * @file route.ts
 * @description Reviews API – list and create
 * @module app/api/reviews
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createReviewSchema } from '@/lib/validators/review.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const bookingId = searchParams.get('bookingId')
    const minRating = searchParams.get('minRating')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (userId) where.userId = userId
    if (bookingId) where.bookingId = bookingId
    if (minRating !== null && minRating !== undefined && minRating !== '') {
      where.rating = { gte: parseInt(minRating, 10) }
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    const shape = reviews.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      userId: r.userId,
      rating: r.rating,
      comment: r.comment ?? null,
      status: r.status,
      adminResponse: r.adminResponse ?? null,
      respondedBy: r.respondedBy ?? null,
      respondedAt: r.respondedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: r.user,
      booking: r.booking
        ? {
            ...r.booking,
            startDate: r.booking.startDate.toISOString(),
            endDate: r.booking.endDate.toISOString(),
          }
        : null,
    }))

    return NextResponse.json({ reviews: shape })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createReviewSchema.parse(body)

    const existing = await prisma.review.findUnique({
      where: { bookingId: parsed.bookingId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'This booking already has a review' },
        { status: 409 }
      )
    }

    const review = await prisma.review.create({
      data: {
        bookingId: parsed.bookingId,
        userId: parsed.userId,
        rating: parsed.rating,
        comment: parsed.comment ?? null,
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
      review: {
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
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
