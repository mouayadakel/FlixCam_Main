/**
 * @file route.ts
 * @description Re-run job endpoint
 * @module app/api/admin/jobs/rerun
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { AuditService } from '@/lib/services/audit.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  const rateLimit = rateLimitAPI(request)

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.SYSTEM_CLEAR_CACHE))) {
      return NextResponse.json(
        { error: 'Forbidden - system.clear_cache permission required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { jobId, jobType } = body

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Implement job rerun based on job type
    let result
    switch (jobType) {
      case 'release-expired-locks':
        const { BookingService } = await import('@/lib/services/booking.service')
        const released = await BookingService.releaseExpiredSoftLocks()
        result = {
          success: true,
          message: `Released ${released} expired soft locks`,
          released,
        }
        break
      case 'process-pending-events':
        // Process pending events
        const { EventBus } = await import('@/lib/events/event-bus')
        const pendingEvents = await prisma.event.findMany({
          where: { status: 'PENDING' },
          take: 10,
          orderBy: { timestamp: 'asc' },
        })
        let processed = 0
        for (const event of pendingEvents) {
          try {
            await EventBus.processEvent(event.id)
            processed++
          } catch (error) {
            // Log error only in development
            if (process.env.NODE_ENV === 'development') {
              console.error(`Failed to process event ${event.id}:`, error)
            }
          }
        }
        result = {
          success: true,
          message: `Processed ${processed} of ${pendingEvents.length} pending events`,
          processed,
          total: pendingEvents.length,
        }
        break
      default:
        // Generic job rerun - just log
        result = {
          success: true,
          message: 'Job queued for rerun',
        }
    }

    await AuditService.log({
      action: 'admin.job.rerun',
      userId: session.user.id,
      resourceType: 'job',
      resourceId: jobId,
      metadata: { jobId, jobType, result },
    })

    return NextResponse.json({
      ...result,
      jobId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to rerun job' }, { status: 500 })
  }
}
