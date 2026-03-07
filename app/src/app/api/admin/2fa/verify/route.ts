/**
 * @file route.ts
 * @description POST /api/admin/2fa/verify - Verify and enable 2FA
 * @module app/api/admin/2fa/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { AuditService } from '@/lib/services/audit.service'

export const dynamic = 'force-dynamic'

const verifySchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits').regex(/^\d{6}$/, 'Token must be 6 digits'),
})

const RATE_LIMIT_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_SEC = 900 // 15 minutes

function generateBackupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-'
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
      return NextResponse.json(
        { error: 'Forbidden - admin role required' },
        { status: 403 }
      )
    }

    const rateLimit = checkRateLimit({
      identifier: `2fa-verify:${session.user.id}`,
      limit: RATE_LIMIT_ATTEMPTS,
      window: RATE_LIMIT_WINDOW_SEC,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parseResult = verifySchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { token } = parseResult.data

    let verify: (opts: { token: string; secret: string }) => Promise<{ valid: boolean }>
    try {
      const otplib = await import('otplib')
      verify = otplib.verify
    } catch {
      logger.warn('otplib not installed')
      return NextResponse.json(
        { error: '2FA verification unavailable' },
        { status: 503 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, twoFactorSecret: true },
    })

    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA setup not initiated. Call /api/admin/2fa/setup first.' },
        { status: 400 }
      )
    }

    const result = await verify({ token, secret: user.twoFactorSecret })
    const isValid = result.valid

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    const backupCodes: string[] = []
    const hashedCodes: string[] = []

    for (let i = 0; i < 8; i++) {
      const code = generateBackupCode()
      backupCodes.push(code)
      hashedCodes.push(await bcrypt.hash(code, 10))
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
        twoFactorBackupCodes: hashedCodes,
      },
    })

    await AuditService.log({
      action: 'user.2fa_enabled',
      userId: session.user.id,
      resourceType: 'user',
      resourceId: user.id,
    })

    return NextResponse.json({
      success: true,
      backupCodes,
    })
  } catch (error) {
    logger.error('2FA verify error', { error })
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    )
  }
}
