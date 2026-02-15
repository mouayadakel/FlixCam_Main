/**
 * GET /api/user/saved-gear – List saved equipment for current user.
 * POST /api/user/saved-gear – Add equipment to saved. Body: { equipmentId }.
 * DELETE /api/user/saved-gear?equipmentId=... – Remove from saved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const saved = await prisma.savedEquipment.findMany({
    where: { userId: session.user.id },
    include: {
      equipment: {
        select: {
          id: true,
          sku: true,
          model: true,
          dailyPrice: true,
          quantityAvailable: true,
          deletedAt: true,
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          media: { take: 1, select: { id: true, url: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = saved
    .filter((s) => s.equipment != null && s.equipment.deletedAt == null)
    .map((s) => {
      const eq = s.equipment!
      const { deletedAt: _d, ...rest } = eq
      return {
        id: s.id,
        savedAt: s.createdAt.toISOString(),
        equipment: {
          ...rest,
          dailyPrice: eq.dailyPrice ? Number(eq.dailyPrice) : 0,
          quantityAvailable: eq.quantityAvailable ?? 0,
        },
      }
    })

  return NextResponse.json({ data: items })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { equipmentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const equipmentId = body.equipmentId
  if (!equipmentId) {
    return NextResponse.json({ error: 'equipmentId required' }, { status: 400 })
  }

  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, deletedAt: null },
  })
  if (!equipment) {
    return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
  }

  await prisma.savedEquipment.upsert({
    where: {
      userId_equipmentId: { userId: session.user.id, equipmentId },
    },
    create: { userId: session.user.id, equipmentId },
    update: {},
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const equipmentId = request.nextUrl.searchParams.get('equipmentId')
  if (!equipmentId) {
    return NextResponse.json({ error: 'equipmentId required' }, { status: 400 })
  }

  await prisma.savedEquipment.deleteMany({
    where: { userId: session.user.id, equipmentId },
  })

  return NextResponse.json({ success: true })
}
