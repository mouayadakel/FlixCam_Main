/**
 * Add Lighting subcategories (LED Panels, COB Lights, Softboxes & Modifiers)
 * and invalidate the public categories cache so /equipment shows them.
 * Run: npx tsx scripts/seed-lighting-subcategories.ts
 */

import { PrismaClient } from '@prisma/client'
import { cacheDelete } from '../src/lib/cache'

const prisma = new PrismaClient()

const LIGHTING_SUBCATEGORIES = [
  { name: 'LED Panels', slug: 'led-panels', description: 'LED panels and mat lights' },
  { name: 'COB Lights', slug: 'cob-lights', description: 'COB and fresnel-style lights' },
  {
    name: 'Softboxes & Modifiers',
    slug: 'lighting-modifiers',
    description: 'Softboxes, diffusers, and modifiers for lighting',
  },
]

async function main() {
  const lighting = await prisma.category.findFirst({
    where: { slug: 'lighting', deletedAt: null },
    select: { id: true, name: true },
  })

  if (!lighting) {
    console.error(
      '❌ Category "Lighting" (slug: lighting) not found. Run the main seed first: npm run db:seed'
    )
    process.exit(1)
  }

  const createdBy = (await prisma.user.findFirst({ select: { id: true } }))?.id ?? null

  for (const sub of LIGHTING_SUBCATEGORIES) {
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {
        name: sub.name,
        description: sub.description ?? null,
        parentId: lighting.id,
        updatedBy: createdBy,
      },
      create: {
        name: sub.name,
        slug: sub.slug,
        description: sub.description ?? null,
        parentId: lighting.id,
        createdBy: createdBy,
      },
    })
    console.log(`  ✓ ${sub.name} (${sub.slug})`)
  }

  try {
    await cacheDelete('websiteContent', 'categories')
  } catch {
    // Cache may be in another process (e.g. Next.js in-memory)
  }
  console.log('✅ Lighting subcategories created/updated.')
  console.log(
    "   If you still don't see them: restart the Next.js dev server (npm run dev), then open"
  )
  console.log('   http://localhost:3000/equipment and click "Lighting" to see the second row.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
