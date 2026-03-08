/**
 * GET /api/me – Current user profile (Phase 3.3). PATCH – update name/phone.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  billingAddress: z.string().max(500).optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      taxId: true,
      companyName: true,
      billingAddress: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(request: NextRequest) {
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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors?.name?.[0] ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const user = await prisma.user.update({
    where: { id: session.user.id, deletedAt: null },
    data: {
      ...(parsed.data.name != null && { name: parsed.data.name }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
      ...(parsed.data.taxId !== undefined && { taxId: parsed.data.taxId }),
      ...(parsed.data.companyName !== undefined && { companyName: parsed.data.companyName }),
      ...(parsed.data.billingAddress !== undefined && { billingAddress: parsed.data.billingAddress }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      taxId: true,
      companyName: true,
      billingAddress: true,
    },
  })

  return NextResponse.json(user)
}
