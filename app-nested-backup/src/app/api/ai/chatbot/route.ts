/**
 * @file route.ts
 * @description API route for AI chatbot
 * @module api/ai/chatbot
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIService } from '@/lib/services/ai.service'
import { AIPolicy } from '@/lib/policies/ai.policy'
import { chatbotMessageSchema } from '@/lib/validators/ai.validator'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policy = await AIPolicy.canUseChatbot(session.user.id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason }, { status: 403 })
    }

    const body = await request.json()
    const validated = chatbotMessageSchema.parse(body)

    const response = await AIService.chat({
      message: validated.message,
      conversationId: validated.conversationId,
      context: validated.context,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
