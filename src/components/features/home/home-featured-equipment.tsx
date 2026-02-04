/**
 * Homepage featured equipment grid (Phase 2.1).
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

interface EquipmentItem {
  id: string
  sku: string | null
  model: string | null
  dailyPrice: number
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { url: string; type: string }[]
}

interface HomeFeaturedEquipmentProps {
  items: EquipmentItem[]
}

export function HomeFeaturedEquipment({ items }: HomeFeaturedEquipmentProps) {
  const { t } = useLocale()

  return (
    <section className="py-12 md:py-16 border-t">
      <div className="container px-4">
        <h2 className="text-2xl font-semibold">{t('home.featuredEquipment')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {items.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={`/equipment/${item.id}`}
              className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[4/3] relative bg-muted">
                {item.media[0]?.url ? (
                  <Image
                    src={item.media[0].url}
                    alt={item.model ?? item.sku ?? item.id}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium truncate">{item.model ?? item.sku}</p>
                <p className="text-sm text-muted-foreground">
                  {item.dailyPrice > 0
                    ? `${Number(item.dailyPrice).toLocaleString()} SAR / ${t('common.pricePerDay')}`
                    : '—'}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button variant="link" asChild>
            <Link href="/equipment">{t('common.viewAll')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
