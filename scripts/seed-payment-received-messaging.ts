import { PrismaClient } from '@prisma/client'
import { seedPaymentReceivedMessaging } from '../prisma/seed-payment-received-notifications'

const prisma = new PrismaClient()

async function main() {
  const result = await seedPaymentReceivedMessaging(prisma)

  console.log('✅ Payment received messaging defaults ensured')
  console.log(
    JSON.stringify(
      {
        templates: result.templates,
        rules: result.rules,
        recipients: result.recipients,
        channelConfigs: result.channelConfigs,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error('❌ Failed to seed payment received messaging defaults')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
