/**
 * i18n public API (Phase 1.4).
 */

export {
  LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_LABELS,
  LOCALE_NATIVE_LABELS,
  getDir,
  isRtl,
  parseLocale,
} from './locales'
export type { Locale } from './locales'

export { getMessages, t } from './translate'

export {
  LOCALE_COOKIE_NAME,
  getLocaleFromCookie,
  setLocaleCookie,
  LOCALE_INIT_SCRIPT,
} from './cookie'
