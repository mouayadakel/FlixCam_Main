/**
 * Ensure admin@flixcam.rent exists and can log in (password: admin123, status: ACTIVE).
 * Creates the user if missing; resets password and status if existing.
 * Uses DATABASE_URL from .env (current directory) or ENV_FILE.
 *
 * Run from app directory:
 *   cd /path/to/app && npx tsx scripts/reset-admin-password.ts
 *
 * On VPS (after deploy):
 *   cd /home/flixcam.rent && npx tsx scripts/reset-admin-password.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const ADMIN_EMAIL = 'admin@flixcam.rent'
const ADMIN_PASSWORD = 'admin123'

function loadEnv(envPath: string): void {
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const raw = trimmed.slice(eq + 1).trim()
    const value = raw.startsWith('"') && raw.endsWith('"')
      ? raw.slice(1, -1).replace(/\\"/g, '"')
      : raw.startsWith("'") && raw.endsWith("'")
        ? raw.slice(1, -1).replace(/\\'/g, "'")
        : raw
    if (key && !process.env[key]) process.env[key] = value
  }
}

async function main() {
  const envFile = process.env.ENV_FILE || path.join(process.cwd(), '.env')
  loadEnv(envFile)
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Set ENV_FILE to your app .env or run from app directory.')
    process.exit(1)
  }

  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  try {
    const user = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        email: ADMIN_EMAIL,
        passwordHash,
        name: 'Admin',
        phone: '+966501234567',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdBy: 'reset-admin-password',
      },
    })

    console.log('Admin login is ready.')
    console.log('  Email:    ', user.email)
    console.log('  Password: ', ADMIN_PASSWORD)
    console.log('  Status:   ', user.status)
    console.log('  (DB:      ', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') + ')')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
