import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import * as bcrypt from 'bcryptjs'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { cacheSet, cacheGet, cacheDelete } from '@/lib/cache'

function logDbError(context: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  console.error(`[AUTH][verify-phone] ${context}`, {
    message: err.message,
    stack: err.stack,
    prismaCode,
    timestamp: new Date().toISOString(),
  })
}

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
  console.log('[AUTH][verify-phone] Request received', {
    body: bodyForLog,
    timestamp: new Date().toISOString(),
  })

  const rate = await checkRateLimitUpstash(request, 'auth')
  if (!rate.allowed) {
    console.log('[AUTH][verify-phone] Response sent', { status: 429 })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    console.log('[AUTH][verify-phone] Response sent', { status: 400 })
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { registrationToken, otpCode } = body as { registrationToken?: string; otpCode?: string }
  if (!registrationToken || !otpCode || otpCode.length !== 6) {
    console.log('[AUTH][verify-phone] Response sent', { status: 400 })
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const cached = await cacheGet<CachedRegistration>('registration', registrationToken)
  if (!cached) {
    console.log('[AUTH][verify-phone] Response sent', { status: 404 })
    return NextResponse.json({ error: 'Registration expired or not found. Please start again.' }, { status: 404 })
  }

  if (new Date() > new Date(cached.expiresAt)) {
    await cacheDelete('registration', registrationToken)
    console.log('[AUTH][verify-phone] Response sent', { status: 400 })
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }

  if (cached.attempts >= 5) {
    await cacheDelete('registration', registrationToken)
    console.log('[AUTH][verify-phone] Response sent', { status: 400 })
    return NextResponse.json({ error: 'Too many failed attempts. Registration has been cancelled.' }, { status: 400 })
  }

  const isValid = await bcrypt.compare(otpCode, cached.otpHash)

  if (!isValid) {
    await cacheSet('registration', registrationToken, {
      ...cached,
      attempts: cached.attempts + 1,
    })
    console.log('[AUTH][verify-phone] Response sent', { status: 400 })
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  let user
  try {
    user = await prisma.user.create({
      data: {
        email: cached.email,
        passwordHash: cached.passwordHash,
        name: cached.name,
        phone: cached.phone,
        phoneVerified: true,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    })
  } catch (error) {
    logDbError('Database error (create user)', error)
    const err = error instanceof Prisma.PrismaClientKnownRequestError ? error : null
    if (err?.code === 'P2002') {
      await cacheDelete('registration', registrationToken)
      return NextResponse.json(
        { error: err.meta?.target?.[0] === 'phone' ? 'This phone number is already registered.' : 'This email is already registered.' },
        { status: 409 }
      )
    }
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

  await cacheDelete('registration', registrationToken)

  const oneTimeToken = randomBytes(32).toString('hex')
  await cacheSet('authToken', oneTimeToken, user.id)

  console.log('[AUTH][verify-phone] Response sent', { status: 200, success: true })
  return NextResponse.json({ success: true, oneTimeToken })
}
