/**
 * POST /api/newsletter/subscribe — DB + optional Mailchimp (env or MarketingSettings).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { upsertMailchimpSubscriber } from '@/lib/services/mailchimp.service'

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  source: z.string().max(64).optional(),
  language: z.string().max(8).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const email = parsed.data.email.toLowerCase().trim()
    const name = parsed.data.name?.trim() || null
    const source = parsed.data.source?.trim() || null
    const language = parsed.data.language?.trim() || 'ar'

    const sub = await prisma.newsletterSubscription.upsert({
      where: { email },
      create: { email, source, name: name ?? undefined, language, status: 'active' },
      update: { source: source ?? undefined, name: name ?? undefined, language },
    })

    try {
      await upsertMailchimpSubscriber({
        email,
        name: name ?? undefined,
        source: source ?? undefined,
      })
    } catch {
      /* Mailchimp optional */
    }

    return NextResponse.json({ success: true, id: sub.id })
  } catch {
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
