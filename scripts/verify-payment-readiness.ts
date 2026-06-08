/**
 * Verifies payment-related runtime readiness for deployment.
 * Fails with exit code 1 when required keys are missing or malformed.
 */
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

interface EnvCheckResult {
  key: string
  ok: boolean
  message?: string
}

function checkRequiredKey(key: string, value: string | undefined): EnvCheckResult {
  if (!value || value.trim().length === 0) {
    return { key, ok: false, message: 'missing' }
  }

  return { key, ok: true }
}

function checkPrefix(
  key: string,
  value: string | undefined,
  expectedPrefix: string
): EnvCheckResult {
  if (!value || value.trim().length === 0) {
    return { key, ok: false, message: 'missing' }
  }

  if (!value.startsWith(expectedPrefix)) {
    return {
      key,
      ok: false,
      message: `must start with "${expectedPrefix}"`,
    }
  }

  return { key, ok: true }
}

function run(): number {
  const requireMoyasar = process.argv.includes('--require-moyasar')
  const results: EnvCheckResult[] = []

  results.push(checkRequiredKey('CRON_SECRET', process.env.CRON_SECRET))

  if (requireMoyasar) {
    results.push(checkPrefix('MOYASAR_PUBLISHABLE_KEY', process.env.MOYASAR_PUBLISHABLE_KEY, 'pk_'))
    results.push(checkPrefix('MOYASAR_SECRET_KEY', process.env.MOYASAR_SECRET_KEY, 'sk_'))
    results.push(checkRequiredKey('MOYASAR_WEBHOOK_SECRET', process.env.MOYASAR_WEBHOOK_SECRET))
    results.push(checkRequiredKey('MOYASAR_ROLLOUT_ENABLED', process.env.MOYASAR_ROLLOUT_ENABLED))
    results.push(checkRequiredKey('MOYASAR_ROLLOUT_PERCENT', process.env.MOYASAR_ROLLOUT_PERCENT))
    results.push(checkRequiredKey('PAYMENT_DEFAULT_GATEWAY', process.env.PAYMENT_DEFAULT_GATEWAY))
  }

  const rolloutPercent = Number(process.env.MOYASAR_ROLLOUT_PERCENT)
  if (
    process.env.MOYASAR_ROLLOUT_PERCENT &&
    (!Number.isFinite(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100)
  ) {
    results.push({
      key: 'MOYASAR_ROLLOUT_PERCENT',
      ok: false,
      message: 'must be a number between 0 and 100',
    })
  }

  const failed = results.filter((result) => !result.ok)
  if (failed.length > 0) {
    console.error('Payment readiness check failed:')
    for (const result of failed) {
      console.error(`- ${result.key}: ${result.message || 'invalid'}`)
    }
    return 1
  }

  console.log('Payment readiness check passed.')
  return 0
}

process.exit(run())
