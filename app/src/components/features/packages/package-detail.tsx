/**
 * Package detail: items, pricing, add to cart (Phase 2.5).
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

interface PackageDetailProps {
  pkg: {
    id: string
    name: string
    slug: string
    description: string | null
    discountPercent: number
    subtotal: number
    total: number
    items: {
      equipmentId: string
      quantity: number
      equipment: {
        id: string
        sku: string
        model: string | null
        dailyPrice: number
        media: { url: string; type: string }[]
      }
    }[]
  }
}

export function PackageDetail({ pkg }: PackageDetailProps) {
  const { t } = useLocale()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{pkg.name}</h1>
      {pkg.description && <p className="text-muted-foreground">{pkg.description}</p>}
      {pkg.discountPercent > 0 && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          {pkg.discountPercent}% discount applied
        </p>
      )}

      <section>
        <h2 className="mb-4 font-semibold">Includes</h2>
        <ul className="space-y-3">
          {pkg.items.map((item) => (
            <li key={item.equipmentId} className="flex items-center gap-4 rounded border p-3">
              {item.equipment.media[0]?.url && (
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-muted">
                  <Image
                    src={item.equipment.media[0].url}
                    alt={item.equipment.model ?? item.equipment.sku}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/equipment/${item.equipmentId}`}
                  className="font-medium hover:underline"
                >
                  {item.equipment.model ?? item.equipment.sku}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {item.equipment.dailyPrice.toLocaleString()} SAR
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-2 rounded-lg border bg-card p-4">
        {pkg.discountPercent > 0 && (
          <p className="text-sm text-muted-foreground">
            Subtotal: {pkg.subtotal.toLocaleString()} SAR
          </p>
        )}
        <p className="text-xl font-semibold">
          Total: {pkg.total.toLocaleString()} SAR / {t('common.pricePerDay')}
        </p>
        <Button asChild size="lg">
          <Link href={`/cart?kit=${pkg.slug}`}>{t('common.addToCart')}</Link>
        </Button>
      </div>
    </div>
  )
}
