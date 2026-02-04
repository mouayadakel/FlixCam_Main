'use client'

import { useLocale } from '@/hooks/use-locale'
import { StudioCard } from '@/components/features/studio/studio-card'

interface StudioItem {
  id: string
  name: string
  slug: string
  description: string | null
  capacity: number | null
  hourlyRate: number
  media: { url: string; type: string }[]
}

export function StudiosListClient({ studios }: { studios: StudioItem[] }) {
  const { t } = useLocale()

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{t('nav.studios')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {studios.map((studio) => (
          <StudioCard key={studio.id} studio={studio} />
        ))}
      </div>
      {studios.length === 0 && (
        <p className="text-muted-foreground">{t('common.noResults')}</p>
      )}
    </>
  )
}
