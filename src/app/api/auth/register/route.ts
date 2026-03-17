/**
 * POST /api/auth/register – Deferred registration at checkout (Phase 3.2).
 * Stores registration data in cache until OTP verification. User is created only after OTP verify.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { deferredRegisterSchema } from '@/lib/validators/auth.validator'
import { prisma } from '@/lib/db/prisma'
import * as bcrypt from 'bcryptjs'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import crypto from 'crypto'
import { cacheSet } from '@/lib/cache'
import { deliverOtpCode } from '@/lib/services/otp-delivery.service'

function logDbError(context: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  console.error(`[AUTH][register] ${context}`, {
    message: err.message,
    stack: err.stack,
    prismaCode,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const bodyForLog = await request.clone().json().catch(() => 'unreadable')
    console.log('[AUTH][register] Request received', {
      body: bodyForLog,
      timestamp: new Date().toISOString(),
    })

    const rate = await checkRateLimitUpstash(request, 'auth')
    if (!rate.allowed) {
      console.log('[AUTH][register] Response sent', { status: 429 })
      return NextResponse.json(
        { error: 'Too many attempts. Please wait and try again.' },
        { status: 429 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      console.log('[AUTH][register] Response sent', { status: 400 })
      return NextResponse.json(
        { error: 'Invalid data. Please check all fields.', details: null },
        { status: 400 }
      )
    }

    const parsed = deferredRegisterSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[AUTH][register] Validation failed', {
        errors: parsed.error.flatten(),
        receivedData: body,
      })
      console.log('[AUTH][register] Response sent', { status: 400 })
      return NextResponse.json(
        { error: 'Invalid data. Please check all fields.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, name, phoneNumber } = parsed.data
    console.log('[AUTH][register] Phone received:', phoneNumber)
    if (!phoneNumber?.startsWith('966') && !phoneNumber?.startsWith('+966')) {
      console.error('[AUTH][register] Phone not in E.164 format:', phoneNumber)
      console.log('[AUTH][register] Response sent', { status: 400 })
      return NextResponse.json(
        { error: 'Phone number must include country code e.g. +966XXXXXXXXX' },
        { status: 400 }
      )
    }

    let existing
    try {
      existing = await prisma.user.findUnique({ where: { email } })
    } catch (error) {
      logDbError('Database error (find email)', error)
      const err = error instanceof Prisma.PrismaClientKnownRequestError ? error : null
      const isConnectionError = err?.code === 'P1001' || err?.code === 'P1002' || err?.code === 'P1017'
      return NextResponse.json(
        {
          error: isConnectionError
            ? 'Database temporarily unavailable. Please try again in a moment.'
            : 'A server error occurred. Please try again.',
        },
        { status: 500 }
      )
    }
    if (existing && !existing.deletedAt) {
      console.log('[AUTH][register] Response sent', { status: 409 })
      return NextResponse.json(
        { error: 'This email is already registered.' },
        { status: 409 }
      )
    }

    let existingPhone
    try {
      existingPhone = await prisma.user.findUnique({ where: { phone: phoneNumber } })
    } catch (error) {
      logDbError('Database error (find phone)', error)
      const err = error instanceof Prisma.PrismaClientKnownRequestError ? error : null
      const isConnectionError = err?.code === 'P1001' || err?.code === 'P1002' || err?.code === 'P1017'
      return NextResponse.json(
        {
          error: isConnectionError
            ? 'Database temporarily unavailable. Please try again in a moment.'
            : 'A server error occurred. Please try again.',
        },
        { status: 500 }
      )
    }
    if (existingPhone && !existingPhone.deletedAt) {
      console.log('[AUTH][register] Response sent', { status: 409 })
      return NextResponse.json(
        { error: 'This phone number is already registered.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const registrationToken = crypto.randomBytes(32).toString('hex')
    const rawOtp = crypto.randomInt(100000, 999999).toString()
    const otpHash = await bcrypt.hash(rawOtp, 10)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await cacheSet('registration', registrationToken, {
      email,
      passwordHash,
      name: name ?? null,
      phone: phoneNumber,
      otpHash,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
    })

    const smsBody = `Your FlixCam verification code is: ${rawOtp}. It expires in 10 minutes.`
    const delivery = await deliverOtpCode({
      phone: phoneNumber,
      code: rawOtp,
      smsBody,
      logContext: '[AUTH][register]',
    })

    if (!delivery.ok) {
      return NextResponse.json(
        {
          error: delivery.userMessage ?? 'Failed to send OTP. Please try again.',
          ...(process.env.NODE_ENV === 'development' && delivery.error && {
            debug: delivery.error,
          }),
        },
        { status: 500 }
      )
    }

    console.log('[AUTH][register] Response sent', { status: 200, requireOtp: true })
    return NextResponse.json({
      requireOtp: true,
      registrationToken,
      phone: phoneNumber,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('[AUTH][register] Unhandled error', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(
      { error: 'A server error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
