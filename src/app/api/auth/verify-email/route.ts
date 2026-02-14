/**
 * GET /api/auth/verify-email?token=... – Verify email from link.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const authToken = await prisma.authToken.findFirst({
    where: { token, type: 'email_verification', expiresAt: { gt: new Date() } },
    include: { user: true },
  })

  if (!authToken) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: authToken.userId },
      data: { verificationStatus: 'VERIFIED' },
    }),
    prisma.authToken.delete({ where: { id: authToken.id } }),
  ])

  return NextResponse.json({ verified: true })
}
