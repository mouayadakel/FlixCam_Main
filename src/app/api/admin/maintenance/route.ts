/**
 * @file route.ts
 * @description API routes for equipment maintenance and health tracking
 * @module app/api/admin/maintenance/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MaintenanceService } from '@/lib/services/maintenance.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { equipmentId, description, notes, cost, conditionAfter } = await request.json()

    if (!equipmentId || !description || !conditionAfter) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 })
    }

    const maintenance = await MaintenanceService.recordService(
      equipmentId,
      session.user.id,
      { description, notes, cost, conditionAfter }
    )

    return NextResponse.json({ success: true, maintenance })
  } catch (error) {
    console.error('Maintenance error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الصيانة' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const equipmentId = searchParams.get('equipmentId')

  if (!equipmentId) {
    return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 })
  }

  try {
    const history = await MaintenanceService.getMaintenanceHistory(equipmentId)
    const healthScore = await MaintenanceService.getHealthScore(equipmentId)
    return NextResponse.json({ history, healthScore })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch maintenance data' }, { status: 500 })
  }
}
