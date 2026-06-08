import { mergePaymentGatewayCredentials } from '../payment-gateway-config.service'

describe('mergePaymentGatewayCredentials', () => {
  it('uses env over DB when both define the same key (live .env must beat stale test DB)', () => {
    const merged = mergePaymentGatewayCredentials(
      { publishableKey: 'pk_live_aaa', secretKey: 'sk_live_bbb' },
      { publishableKey: 'pk_test_old', secretKey: 'sk_test_old' }
    )
    expect(merged.publishableKey).toBe('pk_live_aaa')
    expect(merged.secretKey).toBe('sk_live_bbb')
  })

  it('keeps DB-only keys when not set in env', () => {
    const merged = mergePaymentGatewayCredentials(
      { publishableKey: 'pk_live_aaa' },
      { secretKey: 'sk_from_db_only' }
    )
    expect(merged.publishableKey).toBe('pk_live_aaa')
    expect(merged.secretKey).toBe('sk_from_db_only')
  })
})
