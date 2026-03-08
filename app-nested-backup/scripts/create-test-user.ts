/**
 * Creates a test account for development/login testing.
 * Run: npx tsx scripts/create-test-user.ts
 * Requires: DATABASE_URL in .env and schema applied (npx prisma db push or migrate).
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const TEST_EMAIL = 'test@flixcam.rent'
const TEST_PASSWORD = 'test123'
const TEST_NAME = 'Test User'

async function main() {
  const prisma = new PrismaClient()
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10)

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: { passwordHash, name: TEST_NAME, status: 'active', role: 'ADMIN' },
    create: {
      email: TEST_EMAIL,
      passwordHash,
      name: TEST_NAME,
      role: 'ADMIN',
      status: 'active',
      createdBy: 'system',
    },
  })

  console.log('Test account ready:')
  console.log('  Email:   ', TEST_EMAIL)
  console.log('  Password:', TEST_PASSWORD)
  console.log('  Role:    ', user.role)
  console.log('  ID:      ', user.id)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
