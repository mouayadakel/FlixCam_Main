/**
 * POST /api/auth/otp/send – Send OTP to phone (Phase 3.2 deferred registration).
 * Rate-limited; stores code in cache (dev: logs code when no SMS configured).
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendOtpSchema } from '@/lib/validators/auth.validator'
import { cacheSet } from '@/lib/cache'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { deliverOtpCode } from '@/lib/services/otp-delivery.service'

const OTP_LENGTH = 6

function generateOtp(): string {
  const digits = Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10))
  return digits.join('')
}

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

  const parsed = sendOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors?.phone?.[0] ?? 'Invalid phone' },
      { status: 400 }
    )
  }

  const phone = parsed.data.phone
  const code = generateOtp()

  await cacheSet('otp', phone, { code, at: new Date().toISOString() })

  const delivery = await deliverOtpCode({
    phone,
    code,
    logContext: '[AUTH][otp/send]',
  })

  if (!delivery.ok) {
    return NextResponse.json(
      {
        error: delivery.userMessage ?? 'Failed to send OTP. Please try again.',
        ...(process.env.NODE_ENV === 'development' && delivery.error && { debug: delivery.error }),
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
