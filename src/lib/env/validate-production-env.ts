/**
 * Production environment validation — shared by instrumentation and verify scripts.
 */

export type EnvCheck = {
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

function envSet(key: string): boolean {
  const value = process.env[key]
  return typeof value === 'string' && value.trim().length > 0
}

export function isProductionRuntime(): boolean {
  return (
    process.env.APP_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  )
}

export function collectProductionEnvChecks(): EnvCheck[] {
  const checks: EnvCheck[] = []
  const production = isProductionRuntime()

  const pass = (name: string, detail: string) => checks.push({ name, status: 'pass', detail })
  const warn = (name: string, detail: string) => checks.push({ name, status: 'warn', detail })
  const fail = (name: string, detail: string) => checks.push({ name, status: 'fail', detail })

  if (envSet('DATABASE_URL')) pass('env:DATABASE_URL', 'set')
  else fail('env:DATABASE_URL', 'missing')

  const authSecret = envSet('AUTH_SECRET') || envSet('NEXTAUTH_SECRET')
  if (authSecret) pass('env:AUTH_SECRET', 'set (AUTH_SECRET or NEXTAUTH_SECRET)')
  else if (production) fail('env:AUTH_SECRET', 'missing in production')
  else warn('env:AUTH_SECRET', 'missing (ok for local dev)')

  const appUrl = envSet('NEXTAUTH_URL') || envSet('APP_URL')
  if (appUrl) pass('env:APP_URL', 'set (NEXTAUTH_URL or APP_URL)')
  else if (production) fail('env:APP_URL', 'missing in production')
  else warn('env:APP_URL', 'missing')

  if (production) {
    if (envSet('CRON_SECRET')) pass('env:CRON_SECRET', 'set')
    else fail('env:CRON_SECRET', 'missing in production')

    const enc = process.env.ENCRYPTION_KEY?.trim() ?? ''
    if (enc.length >= 32) pass('env:ENCRYPTION_KEY', 'set (>= 32 chars)')
    else fail('env:ENCRYPTION_KEY', 'missing or too short in production')
  } else if (envSet('ENCRYPTION_KEY')) {
    pass('env:ENCRYPTION_KEY', 'set')
  } else {
    warn('env:ENCRYPTION_KEY', 'not set (dev fallback used)')
  }

  if (envSet('REACTIONS_SALT') && envSet('VIEWS_SALT')) {
    pass('env:blog_salts', 'REACTIONS_SALT and VIEWS_SALT set')
  } else {
    warn('env:blog_salts', 'REACTIONS_SALT or VIEWS_SALT missing (blog analytics fingerprints)')
  }

  if (envSet('NEXT_PUBLIC_CONTACT_EMAIL') || envSet('NEXT_PUBLIC_CONTACT_PHONE')) {
    pass('env:public_contact', 'public contact info configured')
  } else {
    warn('env:public_contact', 'NEXT_PUBLIC_CONTACT_EMAIL/PHONE not set')
  }

  if (process.env.NEXT_PUBLIC_PUBLIC_CHAT_ENABLED === 'true') {
    pass('env:public_chat', 'enabled')
  } else {
    warn('env:public_chat', 'NEXT_PUBLIC_PUBLIC_CHAT_ENABLED is not "true"')
  }

  if (envSet('REDIS_URL')) pass('env:REDIS_URL', 'set')
  else warn('env:REDIS_URL', 'not set (rate limiting / queues may be degraded)')

  if (production) {
    if (envSet('UPSTASH_REDIS_REST_URL') && envSet('UPSTASH_REDIS_REST_TOKEN')) {
      pass('env:UPSTASH_REDIS', 'set (Upstash REST distributed rate limiting)')
    } else if (envSet('REDIS_URL')) {
      pass('env:UPSTASH_REDIS', 'REDIS_URL set (distributed rate limiting via Redis)')
    } else {
      warn(
        'env:UPSTASH_REDIS',
        'not set — auth rate limiting uses in-memory fallback (not shared across instances)'
      )
    }
  }

  if (process.env.ENABLE_PAYMENTS === 'true') {
    const hasMoyasar = envSet('MOYASAR_SECRET_KEY') && envSet('MOYASAR_PUBLISHABLE_KEY')
    const hasTap = envSet('TAP_SECRET_KEY') || envSet('TAP_API_KEY')
    if (hasMoyasar || hasTap) pass('env:payments', 'payment gateway keys present')
    else warn('env:payments', 'ENABLE_PAYMENTS=true but no Moyasar/Tap keys in env')
  }

  return checks
}

/** Throws if any required production env checks fail (used at server startup). */
export function assertProductionEnvReady(): void {
  if (!isProductionRuntime()) return

  const failed = collectProductionEnvChecks().filter((c) => c.status === 'fail')
  if (failed.length === 0) return

  const msg = `[Env] FATAL: Missing or invalid production environment: ${failed.map((f) => f.name).join(', ')}`
  throw new Error(msg)
}
