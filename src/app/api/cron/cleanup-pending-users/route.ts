import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    console.log(`[Cron] Cleaning up expired PENDING users older than ${expiredTime.toISOString()}`)

    const result = await prisma.user.deleteMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: expiredTime,
        },
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    })
  } catch (error) {
    console.error('[Cron] Cleanup error:', error)
    return NextResponse.json({ error: 'Failed to cleanup pending users' }, { status: 500 })
  }
}
