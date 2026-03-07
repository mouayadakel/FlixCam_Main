/**
 * GET /api/technicians/[id] – Single technician with maintenance jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const allowed = await hasPermission(session.user.id, 'maintenance.read' as never)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        role: 'TECHNICIAN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        _count: { select: { maintenance: true } },
        maintenance: {
          orderBy: { scheduledDate: 'desc' },
          take: 20,
          select: {
            id: true,
            maintenanceNumber: true,
            type: true,
            status: true,
            scheduledDate: true,
            completedDate: true,
            equipment: { select: { sku: true, model: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name ?? user.email ?? '—',
      email: user.email ?? undefined,
      phone: user.phone ?? null,
      status: user.status ?? 'active',
      createdAt: user.createdAt,
      totalJobs: user._count.maintenance,
      maintenance: user.maintenance.map((m) => ({
        id: m.id,
        maintenanceNumber: m.maintenanceNumber,
        type: m.type,
        status: m.status,
        scheduledDate: m.scheduledDate,
        completedDate: m.completedDate,
        equipment: m.equipment?.sku ?? m.equipment?.model ?? '—',
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
