import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { RetentionService } from '@/lib/services/retention.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const segments = await RetentionService.getCustomerSegments()
    return NextResponse.json({ segments })
  } catch (error: any) {
    console.error('Retention GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch retention stats' }, { status: 500 })
  }
}
