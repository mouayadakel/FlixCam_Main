/**
 * Backfill CREDIT REVENUE ledger rows for SUCCESS payments missing them (idempotent).
 *
 * Run:
 *   npx tsx scripts/backfill-ledger.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { Decimal } from '@prisma/client/runtime/library'
import { PaymentStatus } from '@prisma/client'
import { prisma } from '../src/lib/db/prisma'

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
    const value =
      raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1).replace(/\\"/g, '"')
        : raw.startsWith("'") && raw.endsWith("'")
          ? raw.slice(1, -1).replace(/\\'/g, "'")
          : raw
    if (!process.env[key]) process.env[key] = value
  }
}

async function main(): Promise<void> {
  const root = path.resolve(__dirname, '..')
  loadEnv(path.join(root, '.env'))

  const payments = await prisma.payment.findMany({
    where: {
      deletedAt: null,
      status: PaymentStatus.SUCCESS,
    },
    select: {
      id: true,
      amount: true,
      bookingId: true,
      externalId: true,
      tapChargeId: true,
      tapTransactionId: true,
      gateway: true,
    },
    take: 5000,
  })

  let created = 0
  for (const p of payments) {
    const existing = await prisma.ledgerEntry.findFirst({
      where: { paymentId: p.id, account: 'REVENUE', type: 'CREDIT' },
      select: { id: true },
    })
    if (existing) continue

    const slug = p.gateway ?? 'Legacy'
    await prisma.ledgerEntry.create({
      data: {
        type: 'CREDIT',
        amount: new Decimal(p.amount.toString()),
        account: 'REVENUE',
        bookingId: p.bookingId,
        paymentId: p.id,
        description: `${slug} payment received (backfill)`,
        reference:
          p.externalId ?? p.tapChargeId ?? p.tapTransactionId ?? p.id,
      },
    })
    created += 1
  }

  console.log(`Payments checked: ${payments.length}; ledger rows created: ${created}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
