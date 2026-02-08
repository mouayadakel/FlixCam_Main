/**
 * POST /api/user/profile/password – Change password for current user
 * @module app/api/user/profile/password
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth/auth-helpers'
import { z } from 'zod'

const bodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors?.newPassword?.[0]
      ?? parsed.error.flatten().fieldErrors?.currentPassword?.[0]
      ?? 'Invalid input'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: session.user.id, deletedAt: null },
    select: { passwordHash: true },
  })

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: 'Password not set for this account' },
      { status: 400 }
    )
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash)
  if (!isValid) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  })

  return NextResponse.json({ success: true })
}
