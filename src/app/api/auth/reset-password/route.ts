/**
 * POST /api/auth/reset-password – Set new password using reset token.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

const bodySchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(6)
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must include lowercase, uppercase, and a number',
    }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = bodySchema.parse(body)

    const authToken = await prisma.authToken.findFirst({
      where: { token, type: 'password_reset', expiresAt: { gt: new Date() } },
      include: { user: true },
    })

    if (!authToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Request a new one.' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      }),
      prisma.authToken.delete({ where: { id: authToken.id } }),
    ])

    return NextResponse.json({ message: 'Password updated. You can sign in now.' })
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors[0]?.message ?? 'Invalid input'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
