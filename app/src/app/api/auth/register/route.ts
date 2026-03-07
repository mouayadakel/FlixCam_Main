/**
 * POST /api/auth/register – Deferred registration at checkout (Phase 3.2).
 * Creates client account (email + password); caller then signs in and syncs cart.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { deferredRegisterSchema } from '@/lib/validators/auth.validator'
import { prisma } from '@/lib/db/prisma'
import { EmailService } from '@/lib/services/email.service'
import * as bcrypt from 'bcryptjs'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { NotificationChannel } from '@prisma/client'

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'auth')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = deferredRegisterSchema.safeParse(body)
  if (!parsed.success) {
    const err = parsed.error.flatten()
    const msg = err.fieldErrors?.email?.[0] ?? err.fieldErrors?.password?.[0] ?? 'Invalid input'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { email, password, name } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && !existing.deletedAt) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني مسجل مسبقاً. سجّل الدخول أو استخدم الجوال.' },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      phone: null,
      role: 'DATA_ENTRY',
      status: 'active',
    },
  })

  const verificationToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.authToken.create({
    data: { userId: user.id, token: verificationToken, type: 'email_verification', expiresAt },
  })
  const emailConfig = await prisma.messagingChannelConfig.findUnique({
    where: { channel: NotificationChannel.EMAIL },
  })
  const emailEnabled = emailConfig?.isEnabled ?? true
  const emailResult = emailEnabled
    ? await EmailService.sendVerificationEmail(email, verificationToken)
    : { ok: false, error: 'Email channel disabled' }
  if (!emailResult.ok && emailResult.error) {
    // Intentionally silent — avoid exposing email service status
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    },
  })
}
