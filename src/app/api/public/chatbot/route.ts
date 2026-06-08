/**
 * POST /api/public/chatbot — public site assistant (rate-limited, no auth)
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai.service'
import { ChatLogService } from '@/lib/services/chat-log.service'
import { ChatbotSettingsService } from '@/lib/services/chatbot-settings.service'
import { chatbotMessageSchema } from '@/lib/validators/ai.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const handoverSchema = z.object({
  handover: z.literal(true),
  conversationId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimitUpstash(request, 'public')
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()

    const handoverParsed = handoverSchema.safeParse(body)
    if (handoverParsed.success) {
      const sessionId = handoverParsed.data.conversationId
      await ChatLogService.markHandover(sessionId, 'public')
      const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? ''
      const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('مرحباً، أحتاج مساعدة من فريق FlixCam')}`
        : null
      return NextResponse.json({ handover: true, whatsappUrl })
    }

    const validated = chatbotMessageSchema.parse(body)
    const sessionId = validated.conversationId?.trim() || crypto.randomUUID()

    await ChatLogService.appendMessage({
      sessionId,
      channel: 'public',
      role: 'user',
      content: validated.message,
    })

    const [equipmentCount, studioCount, chatbotSettings] = await Promise.all([
      prisma.equipment.count({ where: { isActive: true, deletedAt: null } }),
      prisma.studio.count({ where: { deletedAt: null, isActive: true } }),
      ChatbotSettingsService.get(),
    ])

    const response = await AIService.chat({
      message: validated.message,
      conversationId: sessionId,
      context: {
        ...validated.context,
        public: true,
        equipmentCount,
        studioCount,
        siteName: chatbotSettings.companyName || process.env.NEXT_PUBLIC_SITE_NAME || 'FlixCam',
        chatbotTone: chatbotSettings.tone,
      },
    })

    const reply =
      (response as { message?: string; reply?: string; text?: string }).message ??
      (response as { reply?: string }).reply ??
      (response as { text?: string }).text ??
      ''

    if (reply) {
      await ChatLogService.appendMessage({
        sessionId,
        channel: 'public',
        role: 'assistant',
        content: reply,
      })
    }

    return NextResponse.json({ ...response, conversationId: sessionId })
  } catch (error) {
    return handleApiError(error)
  }
}
