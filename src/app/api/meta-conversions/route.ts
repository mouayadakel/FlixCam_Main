/**
 * Meta Conversions API — server-side backup for pixel events.
 * Requires META_CONVERSIONS_API_TOKEN and pixel ID (env or MarketingSettings).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getMetaCapiCredentials } from '@/lib/services/marketing-settings.service'

const ALLOWED_EVENTS = new Set([
  'Purchase',
  'Lead',
  'CompleteRegistration',
  'Contact',
  'AddToCart',
  'InitiateCheckout',
  'ViewContent',
])

function hashValue(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const routeSecret = process.env.MARKETING_CAPI_ROUTE_SECRET || process.env.CRON_SECRET
    if (!routeSecret || request.headers.get('x-meta-capi-key') !== routeSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pixelId, token, testCode } = await getMetaCapiCredentials()
    if (!pixelId || !token) {
      return NextResponse.json({ error: 'Meta CAPI not configured' }, { status: 503 })
    }

    const body = (await request.json()) as {
      event_name?: string
      event_data?: Record<string, unknown>
      user_data?: { email?: string; phone?: string }
    }
    const eventName = body.event_name
    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ error: 'Invalid event_name' }, { status: 400 })
    }

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
    const ua = request.headers.get('user-agent') || ''

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: typeof body.event_data?.url === 'string' ? body.event_data.url : undefined,
          action_source: 'website',
          user_data: {
            client_ip_address: ip || undefined,
            client_user_agent: ua || undefined,
            em: body.user_data?.email ? [hashValue(body.user_data.email)] : undefined,
            ph: body.user_data?.phone ? [hashValue(body.user_data.phone.replace(/\D/g, ''))] : undefined,
          },
          custom_data: body.event_data,
        },
      ],
    }
    if (testCode) {
      ;(payload as { test_event_code?: string }).test_event_code = testCode
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    const result = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Meta API error', details: result },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      )
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
