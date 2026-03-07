/**
 * Minimal seed for E2E: enable_studios flag + one studio so /studios has links.
 * Run after migrate in CI: tsx scripts/seed-e2e.ts
 * Idempotent.
 */

import { PrismaClient, FeatureFlagScope } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.featureFlag.upsert({
    where: { name: 'enable_studios' },
    create: {
      name: 'enable_studios',
      description: 'Show /studios page and nav links',
      enabled: true,
      scope: FeatureFlagScope.MODULE,
    },
    update: { enabled: true },
  })

  const existing = await prisma.studio.findFirst({
    where: { slug: 'e2e-studio', deletedAt: null },
  })
  if (!existing) {
    await prisma.studio.create({
      data: {
        name: 'E2E Test Studio',
        slug: 'e2e-studio',
        description: 'Studio for E2E tests',
        hourlyRate: 200,
        isActive: true,
      },
    })
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
