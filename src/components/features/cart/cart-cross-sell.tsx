'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Plus, Loader2 } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { useCartStore } from '@/lib/stores/cart.store'
import { formatSar } from '@/lib/utils/format.utils'
import { Button } from '@/components/ui/button'

interface RecommendedItem {
  id: string
  model: string
  sku: string
  dailyPrice: number
  imageUrl: string | null
}

export function CartCrossSell() {
  const { t, locale, isRtl } = useLocale()
  const { items, addItem } = useCartStore()
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if cart has items
    if (items.length === 0) {
      setRecommendations([])
      setLoading(false)
      return
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true)
        // Pass current equipment IDs to exclude them or base recommendations on them
        const equipmentIds = items
          .filter((i) => i.itemType === 'EQUIPMENT' && i.equipmentId)
          .map((i) => i.equipmentId)
          .join(',')

        const res = await fetch(`/api/recommendations/cart?exclude=${equipmentIds}`)
        if (res.ok) {
          const data = await res.json()
          setRecommendations(data.recommendations || [])
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [items])

  if (loading) {
    return (
      <div className="mt-6 flex h-32 items-center justify-center rounded-2xl border border-dashed border-[#EDF2F7] bg-gray-50/50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (recommendations.length === 0) return null

  const handleAdd = async (item: RecommendedItem) => {
    try {
      setAddingId(item.id)
      
      // Calculate dates - use first item's dates or today
      const today = new Date().toISOString().slice(0, 10)
      const firstCartItem = items[0]
      const startDate = firstCartItem?.startDate ? new Date(firstCartItem.startDate).toISOString().slice(0, 10) : today
      const endDate = firstCartItem?.endDate ? new Date(firstCartItem.endDate).toISOString().slice(0, 10) : today

      await addItem({
        itemType: 'EQUIPMENT',
        equipmentId: item.id,
        quantity: 1,
        startDate,
        endDate,
      })
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="mt-8 rounded-2xl bg-[#F8FAFC] p-5 shadow-sm border border-[#EDF2F7]">
      <h3 className="mb-4 text-lg font-bold text-[#1A202C]">
        {isRtl ? 'قد تحتاج أيضاً إلى' : 'Frequently Added Together'}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {recommendations.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#EDF2F7]">
              <Image
                src={item.imageUrl || '/images/equipment-placeholder.svg'}
                alt={item.model || item.sku}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="flex flex-1 flex-col justify-center min-w-0">
              <p className="truncate text-sm font-semibold text-[#1A202C]">
                {item.model || item.sku}
              </p>
              <p className="text-xs font-medium text-brand-primary mt-0.5">
                {formatSar(item.dailyPrice, locale === 'ar' ? 'ar-SA' : 'en-SA')} {isRtl ? '/ يوم' : '/ day'}
              </p>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
              onClick={() => handleAdd(item)}
              disabled={addingId === item.id}
            >
              {addingId === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
