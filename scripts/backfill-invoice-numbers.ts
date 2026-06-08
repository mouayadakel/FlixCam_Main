/**
 * Backfill invoice numbers that do not match configured prefix-YYYY-NNNNNN pattern.
 *
 * Run from project root:
 *   npx tsx scripts/backfill-invoice-numbers.ts
 *
 * Uses DATABASE_URL from .env in cwd.
 */

import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../src/lib/db/prisma'
import { invoiceNumberService } from '../src/lib/services/invoice-number.service'

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function main(): Promise<void> {
  const root = path.resolve(__dirname, '..')
  loadEnv(path.join(root, '.env'))

  const settings = await prisma.companySettings.findFirst({
    select: { invoicePrefix: true },
  })
  const prefix = settings?.invoicePrefix || 'INV'
  const pattern = new RegExp(`^${escapeRegex(prefix)}-\\d{4}-\\d{6}$`)

  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null },
    select: { id: true, invoiceNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const needsFix = invoices.filter((inv) => !pattern.test(inv.invoiceNumber))

  console.log(`Invoices scanned: ${invoices.length}; need numbering fix: ${needsFix.length}`)
  if (needsFix.length === 0) {
    await prisma.$disconnect()
    return
  }

  for (const inv of needsFix) {
    try {
      const next = await invoiceNumberService.nextConfiguredInvoiceNumber()
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { invoiceNumber: next },
      })
      console.log(`Updated ${inv.id}: ${inv.invoiceNumber} -> ${next}`)
    } catch (e) {
      console.error(`Failed ${inv.id} (${inv.invoiceNumber})`, e)
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
