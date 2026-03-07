/**
 * Build Your Kit page (client). Wrapped in PublicContainer; title and subtitle from i18n.
 * Renders KitBuilderFlow (single-page continuous flow).
 */

'use client'

import dynamic from 'next/dynamic'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Skeleton } from '@/components/ui/skeleton'

const KitBuilderFlow = dynamic(
  () =>
    import('@/components/features/build-your-kit/kit-builder-flow').then((m) => ({
      default: m.KitBuilderFlow,
    })),
  {
    ssr: true,
    loading: () => (
      <div className="min-h-[400px] animate-fade-in space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-lg" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    ),
  }
)

export function BuildYourKitClient() {
  const { t } = useLocale()
  return (
    <main className="py-8">
      <PublicContainer>
        <h1 className="mb-2 text-section-title text-text-heading">{t('kit.title')}</h1>
        <p className="mb-8 text-body-main text-text-muted">{t('kit.subtitle')}</p>
        <KitBuilderFlow />
      </PublicContainer>
    </main>
  )
}
