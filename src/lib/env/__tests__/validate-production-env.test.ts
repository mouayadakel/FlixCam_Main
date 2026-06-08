import {
  assertProductionEnvReady,
  collectProductionEnvChecks,
  isProductionRuntime,
} from '@/lib/env/validate-production-env'

describe('validate-production-env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('detects production runtime from NODE_ENV', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' }
    expect(isProductionRuntime()).toBe(true)
  })

  it('fails when ENCRYPTION_KEY missing in production', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production', APP_ENV: 'production' }
    process.env.DATABASE_URL = 'postgresql://localhost/test'
    process.env.AUTH_SECRET = 'secret'
    process.env.NEXTAUTH_URL = 'https://example.com'
    process.env.CRON_SECRET = 'cron'
    delete process.env.ENCRYPTION_KEY

    const failed = collectProductionEnvChecks().filter((c) => c.status === 'fail')
    expect(failed.some((c) => c.name === 'env:ENCRYPTION_KEY')).toBe(true)
    expect(() => assertProductionEnvReady()).toThrow(/ENCRYPTION_KEY/)
  })

  it('passes when required production vars are set', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost/test',
      AUTH_SECRET: 'secret',
      NEXTAUTH_URL: 'https://example.com',
      CRON_SECRET: 'cron',
      ENCRYPTION_KEY: 'a'.repeat(32),
    }

    expect(() => assertProductionEnvReady()).not.toThrow()
  })
})
