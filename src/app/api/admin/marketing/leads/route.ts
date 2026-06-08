import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { PredictiveScoringService } from '@/lib/services/predictive-scoring.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || undefined
    const status = searchParams.get('status') || undefined

    const leads = await prisma.marketingEvent.findMany({
      where: {
        eventType: type ? { equals: type } : { in: ['Lead', 'AddToCart', 'Purchase', 'Contact'] },
        ...(status ? {
          metadata: {
            path: ['status'],
            equals: status
          }
        } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    })

    // Attach predictive scores
    const leadsWithScores = await Promise.all(leads.map(async (lead) => {
      let score = 0
      if (lead.sessionId) {
        score = await PredictiveScoringService.calculateScore(lead.sessionId)
      }
      return { ...lead, score }
    }))

    return NextResponse.json(leadsWithScores)
  } catch (error: any) {
    console.error('Leads GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, status, notes } = body

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const existing = await prisma.marketingEvent.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const metadata = (existing.metadata as any) || {}
    
    const updatedMetadata = {
      ...metadata,
      status: status || metadata.status || 'New',
      notes: notes !== undefined ? notes : metadata.notes,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.id
    }

    const updated = await prisma.marketingEvent.update({
      where: { id },
      data: { metadata: updatedMetadata }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Leads PATCH failed:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
