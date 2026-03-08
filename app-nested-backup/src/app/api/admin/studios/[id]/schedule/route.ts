/**
 * GET /api/admin/studios/[id]/schedule - Get weekly schedule
 * PUT /api/admin/studios/[id]/schedule - Save weekly schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { StudioScheduleService } from '@/lib/services/studio-schedule.service'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { z } from 'zod'

const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean(),
})

const saveScheduleSchema = z.array(scheduleEntrySchema).length(7)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rate = rateLimitByTier(request, 'authenticated')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canView = await hasPermission(session.user.id, 'equipment.read' as any)
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const schedule = await StudioScheduleService.getSchedule(id)
    return NextResponse.json({ data: schedule })
  } catch (error: any) {
    console.error('Get schedule error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rate = rateLimitByTier(request, 'authenticated')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canEdit = await hasPermission(session.user.id, 'equipment.update' as any)
  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const entries = saveScheduleSchema.parse(body)
    const schedule = await StudioScheduleService.saveSchedule(id, entries)
    return NextResponse.json({ data: schedule })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Save schedule error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
