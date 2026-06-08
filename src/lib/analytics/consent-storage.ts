/**
 * Single source for cookie preference key shared with CookieConsentBanner.
 * When NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT is exactly "true", marketing hits wait for Accept.
 * Otherwise hits always reach the data layer (recommended: enforce Consent Mode in GTM).
 */

export const FLIXCAM_COOKIE_CONSENT_STORAGE_KEY = 'flixcam_cookie_consent'

export function analyticsRequiresCookieAccept(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === 'true'
}

export function hasMarketingMeasurementConsent(): boolean {
  if (typeof window === 'undefined') return false
  if (!analyticsRequiresCookieAccept()) return true
  try {
    return window.localStorage.getItem(FLIXCAM_COOKIE_CONSENT_STORAGE_KEY) === 'accepted'
  } catch {
    return false
  }
}
