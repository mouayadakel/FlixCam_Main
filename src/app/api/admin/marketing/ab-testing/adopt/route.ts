import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { experimentName, winningVariant } = await req.json()
    if (!experimentName || !winningVariant) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 1. Mark experiment as finished in the NEW model
    await (prisma as any).abExperiment.update({
      where: { name: experimentName },
      data: { winningVariant, status: 'COMPLETED' }
    })

    // 2. Log the decision for traceability
    await prisma.marketingEvent.create({
      data: {
        sessionId: `ab_adopt_${Date.now()}`,
        eventType: 'AbExperimentDecision',
        source: 'admin',
        metadata: {
          experimentName,
          winningVariant,
          decidedBy: session.user.id,
          date: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({ success: true, message: `Adopted variant ${winningVariant} for ${experimentName}` })
  } catch (error: any) {
    console.error('AB Adopt failed:', error)
    return NextResponse.json({ error: 'Failed to adopt winner' }, { status: 500 })
  }
}
