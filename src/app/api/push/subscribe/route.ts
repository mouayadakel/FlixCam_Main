import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isPushConfigured } from '@/lib/push/vapid'
import { PushSubscriptionService } from '@/lib/push/push-subscription.service'

export const dynamic = 'force-dynamic'

type SubscribeBody = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push not configured on server' }, { status: 503 })
  }

  let body: SubscribeBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
  }

  await PushSubscriptionService.upsert(
    session.user.id,
    { endpoint: body.endpoint, keys: body.keys },
    request.headers.get('user-agent') ?? undefined
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let endpoint: string | undefined
  try {
    const body = await request.json()
    endpoint = body?.endpoint
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  }

  await PushSubscriptionService.remove(session.user.id, endpoint)
  return NextResponse.json({ ok: true })
}
