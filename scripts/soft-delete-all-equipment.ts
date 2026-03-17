/**
 * Soft-deletes ALL equipment (for clean import).
 * Use before re-importing from Excel to start fresh.
 *
 * Usage:
 *   npx tsx scripts/soft-delete-all-equipment.ts        # Dry run
 *   npx tsx scripts/soft-delete-all-equipment.ts --commit  # Apply
 */

import { prisma } from '../src/lib/db/prisma'

async function main() {
  const args = new Set(process.argv.slice(2))
  const commit = args.has('--commit')

  const count = await prisma.equipment.count({
    where: { deletedAt: null },
  })

  console.log(`Equipment to soft-delete: ${count}`)

  if (count === 0) {
    console.log('Nothing to do. All equipment are already soft-deleted.')
    return
  }

  if (!commit) {
    console.log('\n[DRY RUN] No changes made. To apply, run with --commit:')
    console.log('  npx tsx scripts/soft-delete-all-equipment.ts --commit')
    return
  }

  const result = await prisma.equipment.updateMany({
    where: { deletedAt: null },
    data: { deletedAt: new Date(), deletedBy: 'system' },
  })

  console.log(`\n✅ Soft-deleted ${result.count} equipment.`)
  console.log('   You can now run a clean import from Excel.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
