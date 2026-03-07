/**
 * @file route.ts
 * @description POST /api/admin/2fa/setup - Initiate 2FA setup for admin users
 * @module app/api/admin/2fa/setup
 *
 * NOTE: Install otplib if not present: npm install otplib
 * qrcode is already installed in the project.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export async function POST() {
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

    let generateSecret: () => string
    let generateURI: (opts: { issuer: string; label: string; secret: string }) => string
    try {
      const otplib = await import('otplib')
      generateSecret = otplib.generateSecret
      generateURI = otplib.generateURI
    } catch {
      logger.warn('otplib not installed. Run: npm install otplib')
      return NextResponse.json(
        { error: '2FA setup unavailable - otplib not installed. Run: npm install otplib' },
        { status: 503 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const secret = generateSecret()
    const qrCodeUrl = generateURI({
      issuer: 'FlixCam',
      label: user.email ?? user.id,
      secret,
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    })

    return NextResponse.json({
      secret,
      qrCodeUrl,
    })
  } catch (error) {
    logger.error('2FA setup error', { error })
    return NextResponse.json(
      { error: 'Failed to initiate 2FA setup' },
      { status: 500 }
    )
  }
}
