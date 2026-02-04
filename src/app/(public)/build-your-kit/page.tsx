/**
 * Build Your Kit wizard page (Phase 2.6).
 */

'use client'

import dynamic from 'next/dynamic'
import { useLocale } from '@/hooks/use-locale'

const KitWizard = dynamic(
  () => import('@/components/features/build-your-kit/kit-wizard').then((m) => ({ default: m.KitWizard })),
  { ssr: false, loading: () => <div className="min-h-[400px] flex items-center justify-center">جاري التحميل...</div> }
)

export default function BuildYourKitPage() {
  const { t } = useLocale()
  return (
    <main className="container py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('nav.buildKit')}</h1>
      <KitWizard />
    </main>
  )
}
