/**
 * POST /api/newsletter/subscribe – Public newsletter signup (no auth).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const subscribeSchema = z.object({
  email: z.string().email(),
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
    const { email } = parsed.data
    await prisma.newsletterSubscription.upsert({
      where: { email: email.toLowerCase().trim() },
      create: { email: email.toLowerCase().trim() },
      update: {},
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/newsletter/subscribe]', error)
    }
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}
