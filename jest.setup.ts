/**
 * Global Jest setup — keep unit tests isolated from live .env credentials
 * and provide stable defaults for shared dependencies.
 */

import { Decimal } from '@prisma/client/runtime/library'

const EXTERNAL_ENV_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_SMS_PHONE_NUMBER',
  'TWILIO_WHATSAPP_PHONE_NUMBER',
  'TWILIO_WHATSAPP_NUMBER',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'ENABLE_WHATSAPP',
  'ENABLE_SMS',
] as const

const savedExternalEnv: Partial<Record<(typeof EXTERNAL_ENV_KEYS)[number], string>> = {}

for (const key of EXTERNAL_ENV_KEYS) {
  const value = process.env[key]
  if (value !== undefined && value !== '') {
    savedExternalEnv[key] = value
  }
  // Empty string prevents Prisma/dotenv from repopulating from .env on import
  process.env[key] = ''
}

afterAll(() => {
  for (const key of EXTERNAL_ENV_KEYS) {
    const value = savedExternalEnv[key]
    if (value !== undefined) {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }
})

jest.mock('@/lib/vat', () => {
  const actual = jest.requireActual<typeof import('@/lib/vat')>('@/lib/vat')
  return {
    ...actual,
    getVATRate: jest.fn().mockResolvedValue(new Decimal('0.15')),
  }
})
