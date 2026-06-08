/**
 * Resolve locale from request cookies for server components (portal, SSR pages).
 * Launch scope: Arabic + English only.
 */

import { cookies } from 'next/headers'
import { getDir, parseLocale, LAUNCH_LOCALES, type LaunchLocale } from '@/lib/i18n/locales'

export { LAUNCH_LOCALES, type LaunchLocale }

export function coerceLaunchLocale(value: string | null | undefined): LaunchLocale {
  const parsed = parseLocale(value)
  return parsed === 'ar' ? 'ar' : 'en'
}

export async function getRequestLocale(): Promise<{
  locale: LaunchLocale
  dir: 'rtl' | 'ltr'
}> {
  const cookieStore = await cookies()
  const locale = coerceLaunchLocale(cookieStore.get('locale')?.value)
  return { locale, dir: getDir(locale) }
}
