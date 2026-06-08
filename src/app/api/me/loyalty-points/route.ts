import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ points: 0 })
    }

    return NextResponse.json({ points: 0 })
  } catch (error) {
    console.error('Failed to load loyalty points:', error)
    return NextResponse.json({ error: 'Failed to load loyalty points' }, { status: 500 })
  }
}
