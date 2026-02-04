/**
 * POST /api/auth/otp/send – Send OTP to phone (Phase 3.2 deferred registration).
 * Rate-limited; stores code in cache (dev: logs code when no SMS configured).
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendOtpSchema } from '@/lib/validators/auth.validator'
import { cacheSet, cacheGet } from '@/lib/cache'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { logger } from '@/lib/logger'

const OTP_LENGTH = 6

function generateOtp(): string {
  const digits = Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10))
  return digits.join('')
}

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

  // TODO: Phase 5.3 – integrate SMS/WhatsApp provider; for now log in dev
  if (process.env.NODE_ENV !== 'production') {
    logger.info('OTP (dev only)', { phone, code })
  }

  return NextResponse.json({ success: true })
}
