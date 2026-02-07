/**
 * Homepage featured equipment grid – design cards.product:
 * image, vendor_label, title, price; sold_out badge; hover lift.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
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
    <section className="py-12 md:py-16 lg:py-20 border-t border-border-light">
      <PublicContainer>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-section-title text-text-heading">
            {t('home.featuredEquipment')}
          </h2>
          <Button variant="link" className="text-text-body" asChild>
            <Link href="/equipment">{t('common.viewAll')} »</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 4).map((item) => {
            const soldOut = false
            return (
              <Link
                key={item.id}
                href={`/equipment/${item.id}`}
                className="group flex flex-col overflow-hidden rounded-public-card border border-border-light bg-white transition-[box-shadow,transform] hover:shadow-card-hover motion-reduce:transition-none [@media(pointer:fine)]:hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] shrink-0 bg-surface-light">
                  {item.media[0]?.url ? (
                    <Image
                      src={item.media[0].url}
                      alt={item.model ?? item.sku ?? item.id}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-muted text-sm">
                      No image
                    </div>
                  )}
                  {soldOut && (
                    <span className="absolute top-2 end-2 rounded bg-sold-out px-2 py-1 text-label-small uppercase text-white">
                      {t('common.unavailable')}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <p className="text-label-small uppercase tracking-wide text-text-muted">
                    {item.brand?.name ?? item.category?.name ?? '—'}
                  </p>
                  <p className="mt-1 truncate text-card-title text-text-heading">
                    {item.model ?? item.sku ?? item.id}
                  </p>
                  <p className="mt-1 text-price-tag text-text-heading">
                    {item.dailyPrice > 0
                      ? `${Number(item.dailyPrice).toLocaleString()} SAR / ${t('common.pricePerDay')}`
                      : '—'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </PublicContainer>
    </section>
  )
}
