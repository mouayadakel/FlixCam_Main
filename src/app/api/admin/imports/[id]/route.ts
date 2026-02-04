import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { ImportService } from '@/lib/services/import.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Skip rate limiting for polling endpoints
  // const rateLimit = rateLimitAPI(request)
  // if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const job = await ImportService.getJob(params.id)
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(job)
  } catch (error: any) {
    console.error('Import status failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
