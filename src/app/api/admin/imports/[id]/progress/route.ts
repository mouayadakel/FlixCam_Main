/**
 * @file route.ts
 * @description API endpoint for detailed import progress tracking
 * @module app/api/admin/imports/[id]/progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/imports/[id]/progress
 * Return detailed progress breakdown
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Skip rate limiting for polling endpoints
  // const rateLimit = rateLimitAPI(request)
  // if (!rateLimit.allowed) {
  //   return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  // }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const job = await prisma.importJob.findUnique({
      where: { id: params.id },
      include: {
        rows: {
          select: {
            status: true,
            productId: true,
          },
        },
        aiProcessingJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Calculate progress breakdown
    const totalRows = job.totalRows
    const processedRows = job.processedRows
    const successRows = job.successRows
    const errorRows = job.errorRows

    // AI processing progress
    const aiJob = job.aiProcessingJobs[0]
    const aiProgress = aiJob
      ? {
          status: aiJob.status,
          total: aiJob.totalItems,
          processed: aiJob.processedItems,
          failed: aiJob.failedItems,
          cost: aiJob.cost ? Number(aiJob.cost) : 0,
        }
      : null

    // Image processing progress (estimate based on successful products)
    const imageProgress = {
      status: job.imageProcessingStatus || 'pending',
      total: successRows,
      processed: 0, // Would need separate tracking
      failed: 0,
    }

    // Calculate ETA (rough estimate)
    const now = new Date()
    const createdAt = job.createdAt
    const elapsed = now.getTime() - createdAt.getTime()
    const rate = processedRows > 0 ? elapsed / processedRows : 0
    const remaining = totalRows - processedRows
    const eta = remaining * rate

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: {
        products: {
          total: totalRows,
          processed: processedRows,
          success: successRows,
          errors: errorRows,
          percentage: totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0,
        },
        ai: aiProgress,
        images: imageProgress,
      },
      timestamps: {
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        estimatedCompletion: eta > 0 ? new Date(now.getTime() + eta) : null,
      },
    })
  } catch (error: any) {
    console.error('Failed to get progress:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get progress' },
      { status: 500 }
    )
  }
}
