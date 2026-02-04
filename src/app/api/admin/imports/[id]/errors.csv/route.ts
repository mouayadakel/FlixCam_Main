/**
 * @file route.ts
 * @description API endpoint for downloading error report as CSV
 * @module app/api/admin/imports/[id]/errors.csv
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/imports/[id]/errors.csv
 * Download CSV error report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const job = await prisma.importJob.findUnique({
      where: { id: params.id },
      include: {
        rows: {
          where: {
            status: 'ERROR',
          },
          orderBy: { rowNumber: 'asc' },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Generate CSV
    const headers = ['Row Number', 'Error Message', 'Payload']
    const rows = job.rows.map((row) => {
      const payload = row.payload as any
      return [
        row.rowNumber.toString(),
        row.error || 'Unknown error',
        JSON.stringify(payload.row || {}),
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="import-errors-${params.id}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Failed to generate error report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate error report' },
      { status: 500 }
    )
  }
}
