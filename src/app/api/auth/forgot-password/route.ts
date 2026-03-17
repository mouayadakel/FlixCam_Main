/**
 * POST /api/auth/forgot-password – Request password reset (email or phone).
 * Email: sends reset link. Phone: sends 6-digit OTP via WhatsApp (same as sign-in OTP).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { EmailService } from '@/lib/services/email.service'
import { deliverOtpCode } from '@/lib/services/otp-delivery.service'
import { cacheSet } from '@/lib/cache'
import { randomBytes } from 'crypto'
import { NotificationChannel } from '@prisma/client'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { forgotPasswordRequestSchema } from '@/lib/validators/auth.validator'

const RESET_EXPIRY_HOURS = 1
const OTP_LENGTH = 6

const baseUrl =
  process.env.NEXTAUTH_URL ??
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://localhost:3000'

function generateOtp(): string {
  const digits = Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10))
  return digits.join('')
}

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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ForgotPassword] Request body:', JSON.stringify(body))
    }
    const parsed = forgotPasswordRequestSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors
      const msg =
        firstError.email?.[0] ?? firstError.phone?.[0] ?? 'Invalid request. Provide email or phone.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const data = parsed.data

    if ('email' in data && data.email) {
      const { email } = data
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
          emailEnabled
            ? await EmailService.sendPasswordReset(email, token)
            : { ok: false, error: 'Email channel disabled' }
        if (!result.ok && result.error) {
          // Intentionally silent — avoid email enumeration
        }
      }

      return NextResponse.json({
        message: 'If an account exists for this email you will receive a reset link.',
      })
    }

    if ('phone' in data && data.phone) {
      const phone = data.phone
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ForgotPassword] Phone received (E.164 normalized):', phone)
      }
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ phone }, { phone: `+${phone}` }],
          deletedAt: null,
        },
        select: { id: true },
      })

      if (user) {
        const code = generateOtp()
        await cacheSet('otp', `password_reset:${phone}`, { code, at: new Date().toISOString() })

        const delivery = await deliverOtpCode({
          phone,
          code,
          logContext: '[AUTH][forgot-password]',
          whatsappOnly: true,
        })
        if (!delivery.ok) {
          console.error('[AUTH][forgot-password] WhatsApp OTP delivery failed', {
            phone,
            error: delivery.error,
            userMessage: delivery.userMessage,
            timestamp: new Date().toISOString(),
          })
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[ForgotPassword] OTP for testing:', code)
          }
          const errorMsg =
            delivery.userMessage ??
            'Unable to send code. Please try again or contact support.'
          return NextResponse.json(
            {
              error:
                process.env.NODE_ENV !== 'production'
                  ? `${errorMsg} [Dev: OTP in server logs]`
                  : errorMsg,
              code: 'DELIVERY_FAILED',
              ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
            },
            { status: 503 }
          )
        }
      }

      return NextResponse.json({
        message: 'If an account exists for this phone number you will receive a code via WhatsApp.',
        requireOtp: true,
      })
    }

    return NextResponse.json({ error: 'Provide email or phone' }, { status: 400 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
