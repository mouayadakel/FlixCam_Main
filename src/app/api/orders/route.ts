/**
 * @file route.ts
 * @description List orders (bookings) — real data, authorized.
 * @module app/api/orders
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await hasPermission(session.user.id, PERMISSIONS.BOOKING_READ))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const status = searchParams.get('status')?.trim() || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10) || 10))

  const where: Record<string, unknown> = { deletedAt: null }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { bookingNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ])

  const data = bookings.map((b) => ({
    id: b.id,
    orderNumber: b.bookingNumber,
    customer: b.customer?.name ?? b.customer?.email ?? 'Unknown',
    status: b.status,
    totalAmount: Number(b.totalAmount),
    createdAt: b.createdAt,
  }))

  return NextResponse.json({ data, total, page, pageSize })
}
