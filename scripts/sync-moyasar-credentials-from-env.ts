/**
 * One-off / deploy helper: copy MOYASAR_* from environment into PaymentGatewayConfig (encrypted).
 * Runtime merge is .env-over-DB per key; this script still updates DB so admin UI and backups match production keys.
 *
 * Usage (paste real keys from Moyasar dashboard → Live).
 * Shell vars win over .env (same as Next.js), so you can sync live keys without editing .env:
 *   MOYASAR_PUBLISHABLE_KEY=pk_live_... MOYASAR_SECRET_KEY=sk_live_... npm run payment:sync-moyasar -- --require-live
 *
 * Dry run (prints key mode only, no DB write):
 *   npx tsx scripts/sync-moyasar-credentials-from-env.ts --dry-run
 */

import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { encrypt, decrypt, isEncrypted } from '../src/lib/utils/encryption'

// Match Next: development loads .env*.local with higher priority than .env when NODE_ENV is not production.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

const prisma = new PrismaClient()

function keyMode(pk: string | undefined): 'live' | 'test' | 'missing' | 'unknown' {
  if (!pk?.trim()) return 'missing'
  if (pk.startsWith('pk_live')) return 'live'
  if (pk.startsWith('pk_test')) return 'test'
  return 'unknown'
}

async function main() {
  const argv = new Set(process.argv.slice(2))
  const dryRun = argv.has('--dry-run')
  const requireLive = argv.has('--require-live')

  const publishableKey = process.env.MOYASAR_PUBLISHABLE_KEY?.trim()
  const secretKey = process.env.MOYASAR_SECRET_KEY?.trim()
  const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET?.trim()

  function secretMode(sk: string | undefined): 'live' | 'test' | 'missing' | 'unknown' {
    if (!sk?.trim()) return 'missing'
    if (sk.startsWith('sk_live')) return 'live'
    if (sk.startsWith('sk_test')) return 'test'
    return 'unknown'
  }

  console.info('[sync-moyasar] publishable key mode:', keyMode(publishableKey))
  console.info('[sync-moyasar] secret key mode:', secretMode(secretKey))

  if (!publishableKey || !secretKey) {
    console.error('[sync-moyasar] MOYASAR_PUBLISHABLE_KEY and MOYASAR_SECRET_KEY must be set.')
    process.exitCode = 1
    return
  }

  if (requireLive) {
    if (!publishableKey.startsWith('pk_live') || !secretKey.startsWith('sk_live')) {
      console.error('[sync-moyasar] --require-live: keys must be pk_live_* and sk_live_*')
      process.exitCode = 1
      return
    }
  }

  if (dryRun) {
    console.info('[sync-moyasar] --dry-run: no database changes.')
    return
  }

  const existing = await prisma.paymentGatewayConfig.findFirst({
    where: { slug: 'moyasar', deletedAt: null },
    select: { id: true, credentialsEnc: true, enabled: true },
  })

  let prior: Record<string, string> = {}
  if (existing?.credentialsEnc && isEncrypted(existing.credentialsEnc)) {
    try {
      prior = JSON.parse(decrypt(existing.credentialsEnc)) as Record<string, string>
    } catch {
      prior = {}
    }
  }

  const credentials: Record<string, string> = {
    ...prior,
    publishableKey,
    secretKey,
  }
  const webhookPlaceholder =
    !webhookSecret || /replace_with_real|your_|changeme|example|\.\.\./i.test(webhookSecret)
  if (!webhookPlaceholder) {
    credentials.webhookSecret = webhookSecret!
  } else if (prior.webhookSecret) {
    credentials.webhookSecret = prior.webhookSecret
  }

  const credentialsEnc = encrypt(JSON.stringify(credentials))
  const now = new Date()

  if (existing) {
    await prisma.paymentGatewayConfig.update({
      where: { id: existing.id },
      data: {
        enabled: true,
        credentialsEnc,
        updatedAt: now,
        updatedBy: 'script:sync-moyasar-credentials-from-env',
      },
    })
    console.info('[sync-moyasar] Updated existing moyasar PaymentGatewayConfig row.')
  } else {
    await prisma.paymentGatewayConfig.create({
      data: {
        slug: 'moyasar',
        enabled: true,
        credentialsEnc,
        sortOrder: 0,
        createdBy: 'script:sync-moyasar-credentials-from-env',
        updatedBy: 'script:sync-moyasar-credentials-from-env',
      },
    })
    console.info('[sync-moyasar] Created moyasar PaymentGatewayConfig row.')
  }

  console.info('[sync-moyasar] Done. Restart the app (e.g. pm2 restart) if needed.')
}

main()
  .catch((e) => {
    console.error('[sync-moyasar]', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
