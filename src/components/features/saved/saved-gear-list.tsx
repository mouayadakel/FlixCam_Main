/**
 * List of saved equipment with remove action and link to detail.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/use-locale'

const EQUIPMENT_PLACEHOLDER = '/images/placeholder.jpg'

interface SavedItem {
  id: string
  savedAt: string
  equipment: {
    id: string
    sku: string
    model: string | null
    dailyPrice: number
    quantityAvailable: number
    category?: { id: string; name: string; slug: string }
    brand?: { id: string; name: string; slug: string } | null
    media: Array<{ id: string; url: string; type: string }>
  }
}

interface SavedGearListProps {
  items: SavedItem[]
  onRemove: (equipmentId: string) => void
  removingId: string | null
}

export function SavedGearList({ items, onRemove, removingId }: SavedGearListProps) {
  const { t } = useLocale()

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border-light bg-surface-light p-12 text-center">
        <Heart className="mx-auto h-12 w-12 text-text-muted" />
        <p className="mt-4 font-medium text-text-heading">No saved gear</p>
        <p className="mt-1 text-sm text-text-muted">Save equipment from the catalog to see it here.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/equipment">Browse equipment</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const eq = item.equipment
        const imgUrl = eq.media[0]?.url || EQUIPMENT_PLACEHOLDER
        const href = `/equipment/${eq.id}`
        return (
          <li key={item.id} className="rounded-lg border border-border-light bg-white overflow-hidden shadow-sm">
            <Link href={href} className="block aspect-[4/3] relative bg-muted">
              <Image
                src={imgUrl}
                alt={eq.model ?? eq.sku}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </Link>
            <div className="p-4">
              <Link href={href} className="font-medium text-brand-primary hover:underline">
                {eq.model ?? eq.sku}
              </Link>
              <p className="text-sm text-text-muted">{eq.sku}</p>
              <p className="mt-1 font-medium">{Number(eq.dailyPrice).toLocaleString('en-SA')} SAR / {t('common.pricePerDay')}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive hover:text-destructive"
                disabled={removingId === eq.id}
                onClick={() => onRemove(eq.id)}
              >
                <Trash2 className="h-4 w-4 ml-1" />
                Remove
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
