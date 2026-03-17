/**
 * POST /api/auth/forgot-password/verify-otp – Verify OTP for password reset, return reset token.
 * After success, redirect to /reset-password?token=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheDelete } from '@/lib/cache'
import { randomBytes } from 'crypto'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { verifyOtpSchema } from '@/lib/validators/auth.validator'

const RESET_EXPIRY_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimitUpstash(request, 'auth')
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '300' } }
      )
    }

    const body = await request.json()
    const parsed = verifyOtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors?.code?.[0] ?? parsed.error.flatten().fieldErrors?.phone?.[0] ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { phone, code } = parsed.data
    const cacheKey = `password_reset:${phone}`
    const stored = await cacheGet<{ code: string }>('otp', cacheKey)

    if (!stored || stored.code !== code) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    await cacheDelete('otp', cacheKey)

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { phone: `+${phone}` }],
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000)

    await prisma.authToken.deleteMany({
      where: { userId: user.id, type: 'password_reset' },
    })
    await prisma.authToken.create({
      data: { userId: user.id, token, type: 'password_reset', expiresAt },
    })

    return NextResponse.json({
      resetToken: token,
      redirectUrl: `/reset-password?token=${encodeURIComponent(token)}`,
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
