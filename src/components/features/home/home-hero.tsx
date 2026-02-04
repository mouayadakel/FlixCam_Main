/**
 * Homepage hero section (Phase 2.1).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

export function HomeHero() {
  const { t } = useLocale()

  return (
    <section className="relative py-16 md:py-24 lg:py-32">
      <div className="container px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl max-w-3xl mx-auto">
          {t('home.heroTitle')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('home.heroSubtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/equipment">{t('common.bookNow')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/studios">{t('home.exploreStudios')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/packages">{t('nav.packages')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
