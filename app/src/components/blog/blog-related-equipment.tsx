/**
 * Blog related equipment section - fetches and displays equipment cards with Add to Cart.
 */

'use client'

import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { BlogEquipmentCard } from './blog-equipment-card'

interface EquipmentItem {
  id: string
  model: string | null
  sku: string | null
  slug: string | null
  dailyPrice: number
  quantityAvailable: number
  imageUrl: string | null
  category?: { name: string; slug: string } | null
  brand?: { name: string; slug: string } | null
}

interface BlogRelatedEquipmentProps {
  equipmentIds: string[]
  locale: string
  titleAr?: string
  titleEn?: string
}

export function BlogRelatedEquipment({
  equipmentIds,
  locale,
  titleAr = 'المعدات ذات الصلة',
  titleEn = 'Related Equipment',
}: BlogRelatedEquipmentProps) {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!equipmentIds.length) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/public/equipment/by-ids?ids=${equipmentIds.join(',')}`)
      .then((res) => res.json())
      .then((json) => {
        const data = Array.isArray(json?.data) ? json.data : []
        setItems(
          data.map((e: { media?: { url: string }[]; imageUrl?: string }) => ({
            ...e,
            imageUrl: e.imageUrl ?? e.media?.[0]?.url ?? null,
          }))
        )
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [equipmentIds.join(',')])

  if (loading || items.length === 0) return null

  const title = locale === 'ar' ? titleAr : titleEn

  return (
    <section className="mt-12 rounded-2xl border border-gray-200 bg-gray-50/50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Camera className="h-5 w-5 text-brand-primary" />
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <BlogEquipmentCard
            key={item.id}
            id={item.id}
            model={item.model}
            sku={item.sku}
            slug={item.slug}
            dailyPrice={item.dailyPrice}
            quantityAvailable={item.quantityAvailable}
            imageUrl={item.imageUrl}
            category={item.category}
            brand={item.brand}
            locale={locale}
          />
        ))}
      </div>
    </section>
  )
}
