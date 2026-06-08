import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const key = 'business_logo'
  const value = '/images/flixcam-logo.avif'

  await prisma.marketingSettings.upsert({
    where: { key },
    update: { value },
    create: {
      key,
      value,
      label: 'Logo URL',
      category: 'business',
      type: 'url'
    }
  })

  console.log(`Successfully updated ${key} to ${value}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
