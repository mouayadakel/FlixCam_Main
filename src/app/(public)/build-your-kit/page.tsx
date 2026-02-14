/**
 * Build Your Kit wizard page. Wrapped in PublicContainer; title and subtitle from i18n.
 */

'use client'

import dynamic from 'next/dynamic'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Skeleton } from '@/components/ui/skeleton'

const KitWizard = dynamic(
  () =>
    import('@/components/features/build-your-kit/kit-wizard').then((m) => ({
      default: m.KitWizard,
    })),
  {
    ssr: true,
    loading: () => (
      <div className="min-h-[400px] space-y-6 animate-fade-in">
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

export default function BuildYourKitPage() {
  const { t } = useLocale()
  return (
    <main className="py-8">
      <PublicContainer>
        <h1 className="text-section-title text-text-heading mb-2">
          {t('kit.title')}
        </h1>
        <p className="text-body-main text-text-muted mb-8">
          {t('kit.subtitle')}
        </p>
        <KitWizard />
      </PublicContainer>
    </main>
  )
}
