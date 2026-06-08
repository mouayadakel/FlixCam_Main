/**
 * Seed default ChatbotSettings row (idempotent).
 *
 * Usage: npx tsx scripts/seed-chatbot-settings.ts
 */

import { ChatbotSettingsService } from '../src/lib/services/chatbot-settings.service'
import { prisma } from '../src/lib/db/prisma'

async function main() {
  const settings = await ChatbotSettingsService.upsert({}, 'system')
  console.log('ChatbotSettings ready:', {
    companyName: settings.companyName,
    tone: settings.tone,
    faqCount: settings.faqEntries.length,
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
