/**
 * Add Crew category, subcategories (roles), and invalidate public categories cache.
 * Run: npx tsx scripts/seed-crew-subcategories.ts
 */

import { PrismaClient } from '@prisma/client'
import { cacheDelete } from '../src/lib/cache'

const prisma = new PrismaClient()

const CREW_PARENT = {
  name: 'Crew',
  slug: 'crew',
  description: 'Professional film crew — DOP, camera, grip, lighting, and sound',
  nameAr: 'طاقم عمل',
}

const CREW_SUBCATEGORIES = [
  {
    name: 'Director of Photography',
    slug: 'crew-dop',
    description: 'Cinematography and lighting direction',
    nameAr: 'مدير تصوير',
  },
  {
    name: 'Camera Operator',
    slug: 'crew-camera-operator',
    description: 'Camera operation for film and video',
    nameAr: 'مشغل كاميرا',
  },
  {
    name: 'Focus Puller (1st AC)',
    slug: 'crew-focus-puller',
    description: '1st assistant camera / focus pulling',
    nameAr: 'مساعد كاميرا أول',
  },
  {
    name: '2nd AC',
    slug: 'crew-2nd-ac',
    description: '2nd assistant camera',
    nameAr: 'مساعد كاميرا ثاني',
  },
  { name: 'DIT', slug: 'crew-dit', description: 'Digital imaging technician', nameAr: 'فني صورة رقمية' },
  { name: 'Gaffer', slug: 'crew-gaffer', description: 'Chief lighting technician', nameAr: 'رئيس إضاءة' },
  {
    name: 'Best Boy Electric',
    slug: 'crew-best-boy-electric',
    description: 'Assistant to the gaffer',
    nameAr: 'مساعد رئيس إضاءة',
  },
  { name: 'Key Grip', slug: 'crew-key-grip', description: 'Head of grip department', nameAr: 'رئيس جريب' },
  { name: 'Grip', slug: 'crew-grip', description: 'Grip department crew', nameAr: 'جريب' },
  {
    name: 'Production Sound Mixer',
    slug: 'crew-sound-mixer',
    description: 'Production sound mixing',
    nameAr: 'مهندس صوت',
  },
  {
    name: 'Boom Operator',
    slug: 'crew-boom-operator',
    description: 'Boom microphone operation',
    nameAr: 'مشغل بوم',
  },
  {
    name: 'Dolly Grip',
    slug: 'crew-dolly-grip',
    description: 'Dolly and track operation',
    nameAr: 'جريب دولي',
  },
  {
    name: 'Script Supervisor',
    slug: 'crew-script-supervisor',
    description: 'Continuity and script supervision',
    nameAr: 'مشرف سيناريو',
  },
]

async function main() {
  const createdBy = (await prisma.user.findFirst({ select: { id: true } }))?.id ?? null

  const crew = await prisma.category.upsert({
    where: { slug: CREW_PARENT.slug },
    update: {
      name: CREW_PARENT.name,
      description: CREW_PARENT.description,
      nameAr: CREW_PARENT.nameAr,
      parentId: null,
      updatedBy: createdBy,
    },
    create: {
      ...CREW_PARENT,
      createdBy: createdBy,
    },
    select: { id: true, name: true },
  })
  console.log(`  ✓ ${crew.name} (${CREW_PARENT.slug})`)

  for (const sub of CREW_SUBCATEGORIES) {
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {
        name: sub.name,
        description: sub.description ?? null,
        nameAr: sub.nameAr ?? null,
        parentId: crew.id,
        updatedBy: createdBy,
      },
      create: {
        name: sub.name,
        slug: sub.slug,
        description: sub.description ?? null,
        nameAr: sub.nameAr ?? null,
        parentId: crew.id,
        createdBy: createdBy,
      },
    })
    console.log(`  ✓ ${sub.name} (${sub.slug})`)
  }

  try {
    await cacheDelete('websiteContent', 'categories')
  } catch {
    // Cache may be in another process
  }
  console.log('✅ Crew category and subcategories created/updated.')
  console.log('   Run full seed or add crew equipment SKUs separately if needed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
