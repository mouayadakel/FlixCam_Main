/**
 * @file migrate-equipment-specs-to-structured.ts
 * @description One-time migration: convert all equipment with flat specifications
 * to the new structured format (groups, optional highlights/quickSpecs) using category template.
 *
 * Run: npx tsx scripts/migrate-equipment-specs-to-structured.ts
 */

import { prisma } from '../src/lib/db/prisma'
import { convertFlatToStructured } from '../src/lib/utils/specifications.utils'
import { isStructuredSpecifications } from '../src/lib/types/specifications.types'

async function migrate() {
  console.log('Fetching all equipment with specifications...\n')

  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      specifications: { not: null },
    },
    select: {
      id: true,
      sku: true,
      model: true,
      specifications: true,
      category: { select: { name: true, slug: true } },
    },
  })

  console.log(`Found ${equipment.length} equipment item(s) with specifications.\n`)

  let updated = 0
  let skippedStructured = 0
  let skippedEmpty = 0
  let errors = 0

  for (const eq of equipment) {
    const specs = eq.specifications as Record<string, unknown> | null
    if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) {
      skippedEmpty++
      continue
    }

    if (isStructuredSpecifications(specs)) {
      skippedStructured++
      continue
    }

    const categoryHint = eq.category?.slug ?? eq.category?.name ?? undefined
    try {
      const structured = convertFlatToStructured(specs as Record<string, unknown>, categoryHint)
      await prisma.equipment.update({
        where: { id: eq.id },
        data: { specifications: structured as object },
      })
      updated++
      console.log(
        `  ✓ ${eq.sku} (${eq.model ?? eq.id}) → structured (${structured.groups.length} groups)`
      )
    } catch (e) {
      errors++
      console.error(`  ✗ ${eq.sku}:`, e instanceof Error ? e.message : e)
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Updated (flat → structured): ${updated}`)
  console.log(`Skipped (already structured): ${skippedStructured}`)
  console.log(`Skipped (empty specs): ${skippedEmpty}`)
  if (errors > 0) console.log(`Errors: ${errors}`)
  console.log('Done.')
}

migrate()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
