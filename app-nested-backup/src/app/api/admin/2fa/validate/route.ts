/**
 * @file route.ts
 * @description POST /api/admin/2fa/validate - Validate 2FA token during login
 * @module app/api/admin/2fa/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

const validateSchema = z.object({
  userId: z.string().cuid(),
  token: z.string().min(1, 'Token is required'),
})

const RATE_LIMIT_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_SEC = 900 // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = validateSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { userId, token } = parseResult.data

    const rateLimit = checkRateLimit({
      identifier: `2fa-validate:${userId}`,
      limit: RATE_LIMIT_ATTEMPTS,
      window: RATE_LIMIT_WINDOW_SEC,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Try again later.' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    })

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: 'Invalid code' },
        { status: 400 }
      )
    }

    let verify: (opts: { token: string; secret: string }) => Promise<{ valid: boolean }>
    try {
      const otplib = await import('otplib')
      verify = otplib.verify
    } catch {
      logger.warn('otplib not installed')
      return NextResponse.json(
        { success: false, error: '2FA validation unavailable' },
        { status: 503 }
      )
    }

    if (user.twoFactorSecret) {
      const result = await verify({ token, secret: user.twoFactorSecret })
      if (result.valid) {
        return NextResponse.json({ success: true })
      }
    }

    const backupCodes = (user.twoFactorBackupCodes as string[] | null) ?? []
    for (let i = 0; i < backupCodes.length; i++) {
      const match = await bcrypt.compare(token, backupCodes[i])
      if (match) {
        const updated = [...backupCodes]
        updated.splice(i, 1)
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: updated },
        })
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid code' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('2FA validate error', { error })
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    )
  }
}
