import { parseSmsConfirmationOptIn } from '@/lib/checkout/sms-opt-in'

describe('parseSmsConfirmationOptIn', () => {
  it('returns true when flag is boolean true', () => {
    expect(parseSmsConfirmationOptIn({ sms_confirmation_opt_in: true })).toBe(true)
  })

  it('returns true when flag is string "true"', () => {
    expect(parseSmsConfirmationOptIn({ sms_confirmation_opt_in: 'true' })).toBe(true)
  })

  it('returns false when missing or false', () => {
    expect(parseSmsConfirmationOptIn(null)).toBe(false)
    expect(parseSmsConfirmationOptIn({ sms_confirmation_opt_in: false })).toBe(false)
  })
})
