'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Copy } from 'lucide-react'

type Locale = 'ar' | 'en' | 'zh'

interface TranslationData {
  name?: string
  shortDescription?: string
  description?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
}

interface TranslationTabSwitcherProps {
  activeLocale: Locale
  onLocaleChange: (locale: Locale) => void
  translations: Record<Locale, TranslationData>
  onCopyLocale?: (from: Locale, to: Locale) => void
  className?: string
}

const LOCALE_LABELS: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
}

function calculateCompletion(data: TranslationData): number {
  const fields = [
    'name',
    'shortDescription',
    'description',
    'seoTitle',
    'seoDescription',
    'seoKeywords',
  ] as const
  const filled = fields.filter((f) => {
    const val = data[f]
    return val && String(val).trim().length > 0
  }).length
  return Math.round((filled / fields.length) * 100)
}

export function TranslationTabSwitcher({
  activeLocale,
  onLocaleChange,
  translations,
  onCopyLocale,
  className,
}: TranslationTabSwitcherProps) {
  const locales: Locale[] = ['ar', 'en', 'zh']

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        {locales.map((locale) => {
          const completion = calculateCompletion(translations[locale] || {})
          const isActive = activeLocale === locale

          return (
            <button
              key={locale}
              type="button"
              onClick={() => onLocaleChange(locale)}
              className={cn(
                'flex-1 rounded-lg border p-2 text-center transition-colors',
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {LOCALE_LABELS[locale]}
              </span>
              <Progress value={completion} className="mt-1.5 h-1" />
              <span
                className={cn(
                  'mt-0.5 block text-xs',
                  completion === 100 ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {completion}%
              </span>
            </button>
          )
        })}
      </div>

      {onCopyLocale && activeLocale !== 'ar' && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onCopyLocale('ar', activeLocale)}
          >
            <Copy className="ms-1 h-3 w-3" />
            نسخ من العربية → {LOCALE_LABELS[activeLocale]}
          </Button>
        </div>
      )}
    </div>
  )
}

export { calculateCompletion, LOCALE_LABELS }
export type { Locale, TranslationData }
