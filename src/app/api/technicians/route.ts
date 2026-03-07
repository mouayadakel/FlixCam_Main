/**
 * GET /api/technicians – List technicians (User role=TECHNICIAN) with maintenance job count.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

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
  const status = searchParams.get('status')?.toLowerCase()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

  const technicians = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: 'TECHNICIAN',
      ...(status && { status }),
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
      maintenance: {
        where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, deletedAt: null },
        take: 1,
        select: { id: true, maintenanceNumber: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const data = technicians.map((t) => ({
    id: t.id,
    name: t.name ?? t.email ?? '—',
    email: t.email ?? undefined,
    phone: t.phone ?? '—',
    specialty: '—',
    status: t.status ?? 'active',
    jobs: t._count.maintenance,
    currentAssignment: t.maintenance[0]?.maintenanceNumber ?? null,
  }))

  const total = data.length
  const start = (page - 1) * pageSize
  const paged = data.slice(start, start + pageSize)

  return NextResponse.json({ data: paged, total, page, pageSize })
}
