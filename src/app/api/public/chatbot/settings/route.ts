/**
 * GET /api/public/chatbot/settings — public greeting + FAQ for widget init
 */

import { NextResponse } from 'next/server'
import { ChatbotSettingsService } from '@/lib/services/chatbot-settings.service'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function GET() {
  try {
    const settings = await ChatbotSettingsService.get()
    return NextResponse.json({
      greetingAr: settings.greetingAr,
      greetingEn: settings.greetingEn,
      companyName: settings.companyName,
      tone: settings.tone,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
