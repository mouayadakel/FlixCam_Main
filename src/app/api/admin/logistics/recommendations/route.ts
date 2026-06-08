/**
 * @file route.ts
 * @description API route for logistics balancing and stock shifts
 * @module app/api/admin/logistics/recommendations/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { LogisticsBalancingService } from '@/lib/services/logistics-balancing.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const recommendations = await LogisticsBalancingService.getRecommendations(days)
    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Logistics recommendations error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب التوصيات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()
    const { equipmentId, fromWhId, toWhId, quantity } = body

    await LogisticsBalancingService.executeShift(equipmentId, fromWhId, toWhId, quantity)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logistics shift execution error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء تنفيذ النقل' }, { status: 500 })
  }
}
