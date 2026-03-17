/**
 * POST /api/auth/register/resend-otp – Resend OTP for pending registration (cache-based).
 * Updates cached registration and sends new code via SMS.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import crypto from 'crypto'
import { cacheGet, cacheSet } from '@/lib/cache'
import { deliverOtpCode } from '@/lib/services/otp-delivery.service'

interface CachedRegistration {
  email: string
  passwordHash: string
  name: string | null
  phone: string
  otpHash: string
  expiresAt: string
  attempts: number
}

export async function POST(request: NextRequest) {
  const bodyForLog = await request.clone().json().catch(() => 'unreadable')
  console.log('[AUTH][resend-otp] Request received', {
    body: bodyForLog,
    timestamp: new Date().toISOString(),
  })

  const rate = await checkRateLimitUpstash(request, 'auth')
  if (!rate.allowed) {
    console.log('[AUTH][resend-otp] Response sent', { status: 429 })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    console.log('[AUTH][resend-otp] Response sent', { status: 400 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { registrationToken } = body as { registrationToken?: string }
  if (!registrationToken || typeof registrationToken !== 'string') {
    console.log('[AUTH][resend-otp] Response sent', { status: 400 })
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const cached = await cacheGet<CachedRegistration>('registration', registrationToken)
  if (!cached) {
    console.log('[AUTH][resend-otp] Response sent', { status: 404 })
    return NextResponse.json({ error: 'Registration expired or not found. Please start again.' }, { status: 404 })
  }

  const rawOtp = crypto.randomInt(100000, 999999).toString()
  const otpHash = await bcrypt.hash(rawOtp, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await cacheSet('registration', registrationToken, {
    ...cached,
    otpHash,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
  })

  const phoneNumber = cached.phone
  const smsBody = `Your FlixCam verification code is: ${rawOtp}. It expires in 10 minutes.`
  const delivery = await deliverOtpCode({
    phone: phoneNumber,
    code: rawOtp,
    smsBody,
    logContext: '[AUTH][resend-otp]',
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

  console.log('[AUTH][resend-otp] Response sent', { status: 200, success: true })
  return NextResponse.json({ success: true })
}
