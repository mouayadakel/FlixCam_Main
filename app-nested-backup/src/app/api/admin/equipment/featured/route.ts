/**
 * PATCH /api/admin/equipment/featured - Bulk set featured flag (only way to change featured).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

const patchFeaturedSchema = z.object({
  equipmentIds: z.array(z.string().min(1)).min(0),
  featured: z.boolean(),
})

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - equipment.update required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { equipmentIds, featured } = patchFeaturedSchema.parse(body)

    if (equipmentIds.length === 0) {
      return NextResponse.json({ updated: 0 })
    }

    const result = await prisma.equipment.updateMany({
      where: {
        id: { in: equipmentIds },
        deletedAt: null,
      },
      data: { featured },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating featured equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
