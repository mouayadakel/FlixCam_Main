import {
  parseSmsConfirmationOptIn,
  parseWhatsAppConfirmationOptIn,
  customerAllowsWhatsApp,
} from '@/lib/checkout/notification-opt-in'

describe('notification opt-in parsing', () => {
  it('parses SMS opt-in', () => {
    expect(parseSmsConfirmationOptIn({ sms_confirmation_opt_in: true })).toBe(true)
    expect(parseSmsConfirmationOptIn({ sms_confirmation_opt_in: 'true' })).toBe(true)
    expect(parseSmsConfirmationOptIn(null)).toBe(false)
  })

  it('parses WhatsApp opt-in', () => {
    expect(parseWhatsAppConfirmationOptIn({ whatsapp_confirmation_opt_in: true })).toBe(true)
    expect(parseWhatsAppConfirmationOptIn({ whatsapp_confirmation_opt_in: 'true' })).toBe(true)
    expect(parseWhatsAppConfirmationOptIn(null)).toBe(false)
  })

  it('allows WhatsApp when profile or checkout opt-in is set', () => {
    expect(
      customerAllowsWhatsApp({
        checkoutFormData: { whatsapp_confirmation_opt_in: true },
        whatsappOptIn: false,
      })
    ).toBe(true)
    expect(
      customerAllowsWhatsApp({
        checkoutFormData: null,
        whatsappOptIn: true,
      })
    ).toBe(true)
    expect(
      customerAllowsWhatsApp({
        checkoutFormData: null,
        whatsappOptIn: false,
      })
    ).toBe(false)
  })
})
