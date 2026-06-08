import { siteConfig } from '@/config/site.config'

const SAUDI_COUNTRY_CODE = '966'
const DEFAULT_PHONE_INPUT = '0500000000'

function toSaudiLocalPhone(rawValue: string): string | null {
  const digits = rawValue.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith(SAUDI_COUNTRY_CODE) && digits.length >= 12) {
    return `0${digits.slice(3, 12)}`
  }

  if (digits.startsWith('05') && digits.length >= 10) {
    return digits.slice(0, 10)
  }

  if (digits.startsWith('5') && digits.length >= 9) {
    return `0${digits.slice(0, 9)}`
  }

  return null
}

export function getConfiguredContactPhone(): string {
  return siteConfig.contact.phone.trim()
}

export function getConfiguredPhonePlaceholder(): string {
  return (
    toSaudiLocalPhone(siteConfig.contact.phone) ??
    toSaudiLocalPhone(siteConfig.contact.whatsappNumber) ??
    DEFAULT_PHONE_INPUT
  )
}
