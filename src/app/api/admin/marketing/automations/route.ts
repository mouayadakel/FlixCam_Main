import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AutomationService } from '@/lib/services/automation.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    
    if (searchParams.get('logs') === 'true') {
      const logs = await AutomationService.getExecutionLog()
      return NextResponse.json({ logs })
    }

    const rules = await AutomationService.getRules()
    return NextResponse.json({ rules })
  } catch (error: any) {
    console.error('Automations GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const body = await req.json()

    if (searchParams.get('test') === 'true') {
      const { ruleId, testData } = body
      const result = await AutomationService.testExecution(ruleId, testData)
      return NextResponse.json(result)
    }

    const rule = await AutomationService.createRule(body)
    return NextResponse.json({ rule })
  } catch (error: any) {
    console.error('Automations POST failed:', error)
    return NextResponse.json({ error: 'Failed to process automation request' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing rule ID' }, { status: 400 })

    const result = await AutomationService.updateRule(id, updates)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Automations PATCH failed:', error)
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 })
  }
}
