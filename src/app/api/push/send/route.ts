import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { isPushConfigured } from '@/lib/push/vapid'
import { sendPushToAll, sendPushToUser } from '@/lib/push/send-push'

export const dynamic = 'force-dynamic'

type SendBody = {
  title: string
  body: string
  url?: string
  userId?: string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canSend = await hasPermission(session.user.id, 'dashboard.read' as never)
  if (!canSend) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push not configured on server' }, { status: 503 })
  }

  let body: SendBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body?.title?.trim() || !body?.body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const message = {
    title: body.title.trim(),
    body: body.body.trim(),
    url: body.url?.trim() || '/admin',
    tag: 'flixcam-admin',
  }

  const result = body.userId
    ? await sendPushToUser(body.userId, message)
    : await sendPushToAll(message)

  return NextResponse.json(result)
}
