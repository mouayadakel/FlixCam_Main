/**
 * Test component to verify language switching works correctly
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

export function LanguageSwitchTest() {
  const { locale, t } = useLocale()

  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <h3 className="mb-2 text-lg font-semibold">Language Switch Test</h3>
      <div className="space-y-2">
        <p>
          <strong>Current Locale:</strong> {locale}
        </p>
        <p>
          <strong>Test Translation:</strong> {t('common.loading')}
        </p>
        <p>
          <strong>Nav Equipment:</strong> {t('nav.equipment')}
        </p>
        <p>
          <strong>Hero Title:</strong> {t('hero.title')}
        </p>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        If you see translation keys instead of translated text, the language switching needs to be
        fixed.
      </div>
    </div>
  )
}
