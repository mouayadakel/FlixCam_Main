/**
 * Persist public/admin chatbot messages for support review.
 */

import { prisma } from '@/lib/db/prisma'

export class ChatLogService {
  static async appendMessage(input: {
    sessionId: string
    channel: 'public' | 'admin'
    role: 'user' | 'assistant'
    content: string
    userId?: string
  }): Promise<void> {
    const sessionId = input.sessionId.trim()
    if (!sessionId || !input.content.trim()) return

    let conversation = await prisma.chatConversation.findFirst({
      where: { sessionId, channel: input.channel },
      orderBy: { createdAt: 'desc' },
    })

    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          sessionId,
          channel: input.channel,
          userId: input.userId ?? null,
        },
      })
    }

    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: input.role,
        content: input.content.trim().slice(0, 8000),
      },
    })
  }

  static async markHandover(sessionId: string, channel: 'public' | 'admin'): Promise<void> {
    await prisma.chatConversation.updateMany({
      where: { sessionId, channel },
      data: { handoverAt: new Date() },
    })
  }
}
