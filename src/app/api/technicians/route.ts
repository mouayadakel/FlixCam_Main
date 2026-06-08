/**
 * GET /api/technicians – List technicians (User role=TECHNICIAN) with maintenance job count.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { UserStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

function parseUserStatus(value: string | null | undefined): UserStatus | undefined {
  if (!value) return undefined
  const up = value.toUpperCase()
  if (up === 'ACTIVE' || up === 'LOCKED' || up === 'PENDING') {
    return up as UserStatus
  }
  return undefined
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const allowed = await hasPermission(session.user.id, 'maintenance.read' as never)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() || ''
  const statusParam = searchParams.get('status')?.toLowerCase()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

  const statusFilter = parseUserStatus(statusParam)

  const technicians = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: 'TECHNICIAN',
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      _count: { select: { maintenance: true } },
    },
    orderBy: { name: 'asc' },
  })

  const data = technicians.map((t) => ({
    id: t.id,
    name: t.name ?? t.email ?? '—',
    email: t.email ?? undefined,
    phone: t.phone ?? '—',
    specialty: '—',
    status: t.status ?? 'ACTIVE',
    jobs: t._count.maintenance,
    currentAssignment: null as string | null,
  }))

  const total = data.length
  const start = (page - 1) * pageSize
  const paged = data.slice(start, start + pageSize)

  return NextResponse.json({ data: paged, total, page, pageSize })
}
