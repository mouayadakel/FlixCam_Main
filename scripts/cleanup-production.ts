/**
 * Production data cleanup (FIX-053). Requires ALLOW_PRODUCTION_CLEANUP=true.
 *
 * Usage: ALLOW_PRODUCTION_CLEANUP=true npx tsx scripts/cleanup-production.ts
 */

import { prisma } from '@/lib/db/prisma'

async function main() {
  if (process.env.ALLOW_PRODUCTION_CLEANUP !== 'true') {
    console.error('Set ALLOW_PRODUCTION_CLEANUP=true to run this script.')
    process.exit(1)
  }

  const testEmailLike = ['%@test.%', '%@example.com', '%+test@%']

  const deletedBookings = await prisma.booking.deleteMany({
    where: {
      OR: testEmailLike.map((pattern) => ({
        customer: { email: { contains: pattern.replace(/%/g, '') } },
      })),
    },
  })

  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: testEmailLike.flatMap((pattern) => [
        { email: { contains: pattern.replace(/%/g, '') } },
        { email: { endsWith: '@example.com' } },
      ]),
      role: 'CUSTOMER',
    },
  })

  console.log('Cleanup complete', {
    deletedBookings: deletedBookings.count,
    deletedUsers: deletedUsers.count,
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
