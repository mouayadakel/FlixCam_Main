/**
 * POST /api/public/contact – Contact form submission.
 * Sends email to admin via EmailService; no auth required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { EmailService } from '@/lib/services/email.service'
import { siteConfig } from '@/config/site.config'
import { getWhatsAppUrl } from '@/lib/utils/whatsapp-context'

const SUBJECT_LABELS: Record<string, string> = {
  general: 'استفسار عام',
  booking: 'استفسار عن حجز',
  technical: 'دعم فني',
  partnership: 'شراكة / تعاون',
  other: 'أخرى',
}

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email'),
  phone: z.string().max(50).optional(),
  subject: z.string().min(1).max(100),
  message: z.string().min(1, 'Message is required').max(5000),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Validation failed'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { name, email, phone, subject: subjectKey, message } = parsed.data
    const subjectLabel = SUBJECT_LABELS[subjectKey] ?? subjectKey

    const result = await EmailService.sendContactFormNotification({
      name,
      email,
      phone,
      subject: subjectLabel,
      message,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Failed to send message' }, { status: 500 })
    }

    const whatsappUrl = getWhatsAppUrl({
      number: siteConfig.contact.whatsappNumber,
      message: `مرحباً، أرسلت رسالة من نموذج التواصل. الاسم: ${name}`,
    })

    return NextResponse.json({
      ok: true,
      whatsappUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
