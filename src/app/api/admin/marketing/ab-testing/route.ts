import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { AbTestingService } from '@/lib/services/ab-testing.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    
    // Fix 4: Support listing available experiments from the NEW model
    if (searchParams.get('list') === 'true') {
      const experiments = await (prisma as any).abExperiment.findMany({
        where: { deletedAt: null },
        select: { name: true }
      })
      const names = experiments.map((e: any) => e.name)
      if (names.length === 0) names.push('home_cta_v1')
      return NextResponse.json({ experiments: names })
    }

    const experiment = searchParams.get('experiment') || 'home_cta_v1'
    const stats = await AbTestingService.getExperimentStats(experiment)
    
    return NextResponse.json({ experiment, stats })
  } catch (error: any) {
    console.error('AB Stats GET failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description } = await req.json()
    if (!name) return NextResponse.json({ error: 'Missing Name' }, { status: 400 })

    await (prisma as any).abExperiment.upsert({
      where: { name },
      update: { description, status: 'ACTIVE', deletedAt: null },
      create: { name, description, status: 'ACTIVE' }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
