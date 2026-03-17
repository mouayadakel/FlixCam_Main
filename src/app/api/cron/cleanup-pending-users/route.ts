import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
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
