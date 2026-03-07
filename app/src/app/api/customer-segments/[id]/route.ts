/**
 * @file route.ts
 * @description Single customer segment – get, update, delete
 * @module app/api/customer-segments/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateCustomerSegmentSchema } from '@/lib/validators/customer-segment.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const segment = await prisma.customerSegment.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })
    if (!segment) throw new NotFoundError('Customer segment', id)
    return NextResponse.json({
      ...segment,
      discountPercent: segment.discountPercent?.toString() ?? null,
      userCount: segment._count.users,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
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
    const existing = await prisma.customerSegment.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Customer segment', id)

    const body = await request.json()
    const parsed = updateCustomerSegmentSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.slug !== undefined) updateData.slug = parsed.slug
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.discountPercent !== undefined)
      updateData.discountPercent =
        parsed.discountPercent != null ? new Decimal(parsed.discountPercent) : null
    if (parsed.priorityBooking !== undefined) updateData.priorityBooking = parsed.priorityBooking
    if (parsed.extendedTerms !== undefined) updateData.extendedTerms = parsed.extendedTerms
    if (parsed.autoAssignRules !== undefined) updateData.autoAssignRules = parsed.autoAssignRules

    const segment = await prisma.customerSegment.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { users: true } } },
    })
    return NextResponse.json({
      ...segment,
      discountPercent: segment.discountPercent?.toString() ?? null,
      userCount: segment._count.users,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.customerSegment.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Customer segment', id)
    await prisma.user.updateMany({ where: { segmentId: id }, data: { segmentId: null } })
    await prisma.customerSegment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
