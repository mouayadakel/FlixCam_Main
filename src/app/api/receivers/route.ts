/**
 * GET  – list saved receivers for the current user
 * POST – create a new saved receiver
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createReceiverSchema } from '@/lib/validators/receiver.validator'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const receivers = await prisma.receiver.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      idNumber: true,
      phone: true,
      idPhotoUrl: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ data: receivers })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createReceiverSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const receiver = await prisma.receiver.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      idNumber: parsed.data.idNumber,
      phone: parsed.data.phone,
      idPhotoUrl: parsed.data.idPhotoUrl,
    },
  })

  return NextResponse.json(receiver)
}
