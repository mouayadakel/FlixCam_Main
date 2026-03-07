/**
 * POST /api/auth/otp/verify – Verify OTP, create/find user, return one-time login token (Phase 3.2).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOtpSchema } from '@/lib/validators/auth.validator'
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const GUEST_EMAIL_DOMAIN = 'guest.flixcam.rent'

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = verifyOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors?.code?.[0] ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { phone, code } = parsed.data
  const stored = await cacheGet<{ code: string }>('otp', phone)
  if (!stored || stored.code !== code) {
    return NextResponse.json({ error: 'رمز غير صحيح أو منتهي' }, { status: 400 })
  }

  await cacheDelete('otp', phone)

  let user = await prisma.user.findFirst({
    where: { phone, deletedAt: null },
  })

  if (!user) {
    const placeholderEmail = `phone_${phone}@${GUEST_EMAIL_DOMAIN}`
    const existingEmail = await prisma.user.findUnique({ where: { email: placeholderEmail } })
    const email = existingEmail
      ? `phone_${phone}_${Date.now()}@${GUEST_EMAIL_DOMAIN}`
      : placeholderEmail
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12)
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        phone,
        name: null,
        role: 'DATA_ENTRY',
        status: 'active',
      },
    })
  }

  const oneTimeToken = randomBytes(32).toString('hex')
  await cacheSet('authToken', oneTimeToken, user.id)

  return NextResponse.json({
    oneTimeToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    },
  })
}
