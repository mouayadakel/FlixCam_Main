/**
 * @file route.ts
 * @description POST /api/profile/export-data - GDPR data export
 * @module app/api/profile/export-data
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { AuditService } from '@/lib/services/audit.service'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_ATTEMPTS = 1
const RATE_LIMIT_WINDOW_SEC = 86400 // 24 hours

function serialize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'object' && obj !== null && 'toNumber' in obj) {
    return (obj as { toNumber: () => number }).toNumber()
  }
  if (Array.isArray(obj)) return obj.map(serialize)
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serialize(v)
    }
    return out
  }
  return obj
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const rateLimit = checkRateLimit({
      identifier: `export-data:${userId}`,
      limit: RATE_LIMIT_ATTEMPTS,
      window: RATE_LIMIT_WINDOW_SEC,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Data export is limited to once per 24 hours' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        taxId: true,
        companyName: true,
        billingAddress: true,
        role: true,
        status: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [bookings, invoices, quotes] = await Promise.all([
      prisma.booking.findMany({
        where: { customerId: userId, deletedAt: null },
        include: {
          contracts: { where: { deletedAt: null } },
          payments: { where: { deletedAt: null } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { customerId: userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quote.findMany({
        where: { customerId: userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: serialize(user),
      bookings: serialize(bookings),
      invoices: serialize(invoices),
      quotes: serialize(quotes),
    }

    await AuditService.log({
      action: 'user.data_export',
      userId,
      resourceType: 'user',
      resourceId: userId,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    const json = JSON.stringify(exportData, null, 2)
    const filename = `flixcam-data-export-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error('Data export error', { error })
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
