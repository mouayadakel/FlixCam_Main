/**
 * Production readiness verification (env, DB seeds, optional HTTP smoke).
 *
 * Usage:
 *   npx tsx scripts/production-verify.ts
 *   BASE_URL=https://flixcam.rent npx tsx scripts/production-verify.ts --http
 *
 * Exit code 0 = all required checks passed; 1 = one or more failures.
 */

import { execSync } from 'node:child_process'
import { collectProductionEnvChecks, isProductionRuntime } from '../src/lib/env/validate-production-env'
import { prisma } from '../src/lib/db/prisma'

type CheckResult = {
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

const isProduction = isProductionRuntime()
const runHttp = process.argv.includes('--http')
const baseUrl = (
  process.env.BASE_URL ||
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  'http://localhost:3000'
).replace(/\/$/, '')

const results: CheckResult[] = []

function pass(name: string, detail: string) {
  results.push({ name, status: 'pass', detail })
}

function warn(name: string, detail: string) {
  results.push({ name, status: 'warn', detail })
}

function fail(name: string, detail: string) {
  results.push({ name, status: 'fail', detail })
}

function checkEnv() {
  results.push(...collectProductionEnvChecks())
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`
    pass('db:connection', 'ok')
  } catch (err) {
    fail('db:connection', err instanceof Error ? err.message : String(err))
    return
  }

  try {
    const migrateOut = execSync('npx prisma migrate status', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (/Database schema is up to date/i.test(migrateOut)) {
      pass('db:migrations', 'up to date')
    } else if (/following migration/i.test(migrateOut)) {
      fail('db:migrations', 'pending migrations — run: npx prisma migrate deploy')
    } else {
      pass('db:migrations', 'status checked')
    }
  } catch (err) {
    const msg =
      err instanceof Error && 'stdout' in err
        ? String((err as { stdout?: string }).stdout ?? err.message)
        : String(err)
    if (/up to date/i.test(msg)) pass('db:migrations', 'up to date')
    else warn('db:migrations', 'could not confirm status')
  }

  try {
    const footerCount = await prisma.footerSettings.count()
    if (footerCount > 0) pass('db:footer', `${footerCount} FooterSettings row(s)`)
    else warn('db:footer', 'empty — run: npm run db:seed:footer')
  } catch {
    warn('db:footer', 'FooterSettings table check failed')
  }

  try {
    const chatbot = await prisma.chatbotSettings.findFirst()
    if (chatbot) pass('db:chatbot', `ChatbotSettings (${chatbot.companyName})`)
    else warn('db:chatbot', 'missing — run: npx tsx scripts/seed-chatbot-settings.ts')
  } catch {
    warn('db:chatbot', 'ChatbotSettings check failed')
  }

  try {
    const company = await prisma.companySettings.findFirst()
    if (!company) {
      fail('db:company', 'missing — run: npm run db:seed:company')
    } else if (!company.vatNumber?.trim() || !company.crNumber?.trim()) {
      fail('db:company', 'vatNumber and crNumber required for ZATCA invoices')
    } else {
      pass('db:company', `CompanySettings (VAT ${company.vatNumber})`)
    }
  } catch {
    fail('db:company', 'CompanySettings check failed')
  }
}

async function checkHttp() {
  const routes: { path: string; expectStatus: number | 'redirect' }[] = [
    { path: '/api/health', expectStatus: 200 },
    { path: '/', expectStatus: 200 },
    { path: '/api/public/chatbot/settings', expectStatus: 200 },
    { path: '/cart', expectStatus: 200 },
    { path: '/portal/bookings', expectStatus: 'redirect' },
  ]

  for (const { path, expectStatus } of routes) {
    const url = `${baseUrl}${path}`
    try {
      const res = await fetch(url, { redirect: 'manual' })
      const ok =
        expectStatus === 'redirect'
          ? res.status >= 300 && res.status < 400
          : res.status === expectStatus
      if (ok) pass(`http:${path}`, `${res.status}`)
      else fail(`http:${path}`, `expected ${expectStatus}, got ${res.status}`)
    } catch (err) {
      fail(`http:${path}`, err instanceof Error ? err.message : String(err))
    }
  }
}

function printReport() {
  const icons = { pass: '✅', warn: '⚠️ ', fail: '❌' } as const
  console.log('\n── Production verification ──\n')
  for (const r of results) {
    console.log(`${icons[r.status]} ${r.name}: ${r.detail}`)
  }
  const fails = results.filter((r) => r.status === 'fail').length
  const warns = results.filter((r) => r.status === 'warn').length
  console.log(`\nSummary: ${results.length - fails - warns} passed, ${warns} warnings, ${fails} failed`)
  if (isProduction && fails > 0) {
    console.log('\nOwner action: rotate any exposed secrets before go-live (see docs/OWNER_ROTATION_CHECKLIST.md)')
  }
}

async function main() {
  console.log(`Mode: ${isProduction ? 'production' : 'development'}${runHttp ? ` | HTTP smoke @ ${baseUrl}` : ''}`)
  checkEnv()
  await checkDatabase()
  if (runHttp) await checkHttp()
  printReport()

  const fails = results.filter((r) => r.status === 'fail').length
  process.exit(fails > 0 ? 1 : 0)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
