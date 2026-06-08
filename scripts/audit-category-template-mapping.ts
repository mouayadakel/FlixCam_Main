#!/usr/bin/env tsx
import { prisma } from '../src/lib/db/prisma'
import { CATEGORY_SPEC_TEMPLATES, resolveTemplateName } from '../src/lib/ai/spec-templates'

async function main() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })

  const rows = categories.map((category) => {
    const resolvedTemplate = resolveTemplateName(category.slug || category.name)
    const known = !!CATEGORY_SPEC_TEMPLATES[resolvedTemplate]
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      resolvedTemplate,
      known,
    }
  })

  const unresolved = rows.filter((row) => !row.known)
  console.log('Category template hint audit')
  console.log('============================')
  console.log(`Total categories: ${rows.length}`)
  console.log(`Mapped to known templates: ${rows.length - unresolved.length}`)
  console.log(`Unresolved: ${unresolved.length}`)
  if (unresolved.length > 0) {
    console.log('\nUnresolved categories:')
    for (const row of unresolved) {
      console.log(`- ${row.name} (${row.slug}) -> ${row.resolvedTemplate}`)
    }
    process.exitCode = 2
  }
}

void main().finally(async () => {
  await prisma.$disconnect()
})

