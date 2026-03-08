/**
 * POST /api/auth/forgot-password – Request password reset (sends email when configured).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { EmailService } from '@/lib/services/email.service'
import { randomBytes } from 'crypto'
import { NotificationChannel } from '@prisma/client'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

const bodySchema = z.object({ email: z.string().email() })

const RESET_EXPIRY_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitUpstash(request, 'auth')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '300' } }
      )
    }

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

      const emailConfig = await prisma.messagingChannelConfig.findUnique({
        where: { channel: NotificationChannel.EMAIL },
      })
      const emailEnabled = emailConfig?.isEnabled ?? true
      const result =
        emailEnabled ? await EmailService.sendPasswordReset(email, token) : { ok: false, error: 'Email channel disabled' }
      if (!result.ok && result.error) {
        // Intentionally silent — avoid email enumeration
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
