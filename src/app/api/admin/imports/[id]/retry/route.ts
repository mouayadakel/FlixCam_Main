/**
 * @file route.ts
 * @description API endpoint for retrying failed import rows
 * @module app/api/admin/imports/[id]/retry
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { addImportJob } from '@/lib/queue/import.queue'
import { ImportRowStatus, Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/imports/[id]/retry
 * Retry failed rows only
 */
export async function POST(
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
            status: ImportRowStatus.ERROR,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.rows.length === 0) {
      return NextResponse.json({ error: 'No failed rows to retry' }, { status: 400 })
    }

    // Create new job for retry
    const retryJob = await prisma.importJob.create({
      data: {
        filename: `retry-${job.filename}`,
        mimeType: job.mimeType,
        status: 'PENDING',
        createdBy: session.user.id,
      },
    })

    // Copy failed rows to new job
    const rowsToRetry = job.rows.map((row) => ({
      jobId: retryJob.id,
      rowNumber: row.rowNumber,
      payload: (row.payload != null ? row.payload : Prisma.JsonNull) as Prisma.InputJsonValue,
      status: ImportRowStatus.PENDING,
    }))

    await prisma.importJobRow.createMany({
      data: rowsToRetry,
    })

    await prisma.importJob.update({
      where: { id: retryJob.id },
      data: { totalRows: rowsToRetry.length },
    })

    // Get original file buffer (would need to store this or re-upload)
    // For now, we'll use the existing rows' payload
    await addImportJob(retryJob.id, {
      fileBuffer: Buffer.alloc(0), // Empty - we're using existing rows
      mapping: [], // Will be extracted from row payloads
      selectedSheets: undefined,
      selectedRows: undefined,
    })

    return NextResponse.json({
      jobId: retryJob.id,
      retriedRows: rowsToRetry.length,
      originalJobId: params.id,
    })
  } catch (error: any) {
    console.error('Failed to retry failed rows:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retry failed rows' },
      { status: 500 }
    )
  }
}
