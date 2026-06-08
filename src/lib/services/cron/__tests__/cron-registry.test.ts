import { CRON_JOB_REGISTRY, CRON_JOB_SLUGS } from '../index'

describe('CRON_JOB_REGISTRY', () => {
  it('includes all expected job slugs', () => {
    expect(CRON_JOB_SLUGS.length).toBeGreaterThanOrEqual(30)
    expect(CRON_JOB_REGISTRY['payment-retry']).toBeDefined()
    expect(CRON_JOB_REGISTRY['rental-status-updates']).toBeDefined()
    expect(CRON_JOB_REGISTRY['health-check']).toBeDefined()
  })
})
