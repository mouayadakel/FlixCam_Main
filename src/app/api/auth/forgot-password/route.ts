/**
 * POST /api/auth/forgot-password – Request password reset (sends email when configured).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { EmailService } from '@/lib/services/email.service'
import { randomBytes } from 'crypto'

const bodySchema = z.object({ email: z.string().email() })

const RESET_EXPIRY_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = bodySchema.parse(body)

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      select: { id: true },
    })

    if (user) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000)

      await prisma.authToken.deleteMany({
        where: { userId: user.id, type: 'password_reset' },
      })
      await prisma.authToken.create({
        data: { userId: user.id, token, type: 'password_reset', expiresAt },
      })

      const result = await EmailService.sendPasswordReset(email, token)
      if (!result.ok && result.error) {
        console.error('[forgot-password] Email send failed:', result.error)
        // Still return success to avoid email enumeration
      }
    }

    return NextResponse.json({
      message: 'If an account exists for this email you will receive a reset link.',
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
