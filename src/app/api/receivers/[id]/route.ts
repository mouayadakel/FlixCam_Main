/**
 * PATCH – update a saved receiver
 * DELETE – soft-delete a saved receiver
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateReceiverSchema } from '@/lib/validators/receiver.validator'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateReceiverSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.receiver.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
  }

  const receiver = await prisma.receiver.update({
    where: { id },
    data: parsed.data,
  })
  return NextResponse.json(receiver)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.receiver.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
  }

  await prisma.receiver.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
  return NextResponse.json({ success: true })
}
