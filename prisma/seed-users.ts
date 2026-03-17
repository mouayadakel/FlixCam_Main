/**
 * Seed admin and non-admin users. Idempotent (upsert).
 * Run: npm run db:seed:users
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
  console.error('❌ Seed is disabled in production. Set ALLOW_SEED_IN_PRODUCTION=true to override.')
  process.exit(1)
}

const DEFAULT_PASSWORD = 'password123'

const USERS = [
  {
    email: 'admin@flixcam.rent',
    password: 'admin123',
    name: 'Admin User',
    phone: '+966501234567',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    description: 'Full admin (password: admin123)',
  },
  {
    email: 'test@flixcam.rent',
    password: 'test123',
    name: 'Test Admin',
    phone: '+966500000001',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    description: 'Test admin (password: test123)',
  },
  {
    email: 'support@flixcam.rent',
    password: DEFAULT_PASSWORD,
    name: 'Customer Support',
    phone: '+966500000002',
    role: 'CUSTOMER_SERVICE' as const,
    status: 'ACTIVE' as const,
    description: `Customer service (password: ${DEFAULT_PASSWORD})`,
  },
  {
    email: 'dataentry@flixcam.rent',
    password: DEFAULT_PASSWORD,
    name: 'Data Entry',
    phone: '+966500000003',
    role: 'DATA_ENTRY' as const,
    status: 'ACTIVE' as const,
    description: `Data entry (password: ${DEFAULT_PASSWORD})`,
  },
  {
    email: 'vendor@flixcam.rent',
    password: DEFAULT_PASSWORD,
    name: 'Vendor User',
    phone: '+966500000004',
    role: 'VENDOR' as const,
    status: 'ACTIVE' as const,
    description: `Vendor portal (password: ${DEFAULT_PASSWORD})`,
  },
  {
    email: 'customer@flixcam.rent',
    password: DEFAULT_PASSWORD,
    name: 'Demo Customer',
    phone: '+966500000005',
    role: 'DATA_ENTRY' as const,
    status: 'ACTIVE' as const,
    description: `Customer-like user for bookings (password: ${DEFAULT_PASSWORD})`,
  },
]

async function main() {
  console.log('🌱 Seeding admin and user accounts...')

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10)
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: u.status,
      },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: u.status,
        createdBy: 'system',
      },
    })
    console.log(`✅ ${u.email} (${u.role}) – ${u.description}`)
  }

  console.log(`\n🎉 Seeded ${USERS.length} users.`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
