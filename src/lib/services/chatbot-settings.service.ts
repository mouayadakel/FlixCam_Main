/**
 * Public chatbot configuration (FIX-041).
 */

import { prisma } from '@/lib/db/prisma'

export type ChatbotFaqEntry = { question: string; answer: string }

export type ChatbotSettingsData = {
  greetingAr: string | null
  greetingEn: string | null
  tone: string
  companyName: string | null
  faqEntries: ChatbotFaqEntry[]
}

const DEFAULTS: ChatbotSettingsData = {
  greetingAr: 'مرحباً! كيف يمكنني مساعدتك في استئجار المعدات؟',
  greetingEn: 'Hello! How can I help you with equipment rental?',
  tone: 'professional',
  companyName: 'FlixCam',
  faqEntries: [],
}

export class ChatbotSettingsService {
  static async get(): Promise<ChatbotSettingsData> {
    const row = await prisma.chatbotSettings.findUnique({ where: { id: 'global' } })
    if (!row) return DEFAULTS

    return {
      greetingAr: row.greetingAr ?? DEFAULTS.greetingAr,
      greetingEn: row.greetingEn ?? DEFAULTS.greetingEn,
      tone: row.tone ?? DEFAULTS.tone,
      companyName: row.companyName ?? DEFAULTS.companyName,
      faqEntries: Array.isArray(row.faqEntries)
        ? (row.faqEntries as ChatbotFaqEntry[])
        : DEFAULTS.faqEntries,
    }
  }

  static async upsert(
    input: Partial<ChatbotSettingsData>,
    updatedBy: string
  ): Promise<ChatbotSettingsData> {
    const current = await this.get()
    const merged: ChatbotSettingsData = {
      greetingAr: input.greetingAr ?? current.greetingAr,
      greetingEn: input.greetingEn ?? current.greetingEn,
      tone: input.tone ?? current.tone,
      companyName: input.companyName ?? current.companyName,
      faqEntries: input.faqEntries ?? current.faqEntries,
    }

    await prisma.chatbotSettings.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        ...merged,
        faqEntries: merged.faqEntries as object,
        updatedBy,
      },
      update: {
        ...merged,
        faqEntries: merged.faqEntries as object,
        updatedBy,
      },
    })

    return merged
  }

  static matchFaq(message: string, faqEntries: ChatbotFaqEntry[]): string | null {
    const normalized = message.trim().toLowerCase()
    for (const entry of faqEntries) {
      if (entry.question.trim().toLowerCase() === normalized) {
        return entry.answer
      }
    }
    return null
  }
}
