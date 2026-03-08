/**
 * Blog equipment card - compact card with Add to Cart for blog post related equipment.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'

const PLACEHOLDER = '/images/placeholder.jpg'

interface BlogEquipmentCardProps {
  id: string
  model: string | null
  sku: string | null
  slug: string | null
  dailyPrice: number
  quantityAvailable: number
  imageUrl: string | null
  category?: { name: string; slug: string } | null
  brand?: { name: string; slug: string } | null
  locale: string
}

export function BlogEquipmentCard({
  id,
  model,
  sku,
  slug,
  dailyPrice,
  quantityAvailable,
  imageUrl,
  category,
  brand,
  locale,
}: BlogEquipmentCardProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const addItem = useCartStore((s) => s.addItem)
  const [isAdding, setIsAdding] = useState(false)

  const displayName = model ?? sku ?? id
  const href = slug ? `/equipment/${slug}` : `/equipment/${id}`
  const soldOut = quantityAvailable <= 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (soldOut) return
    setIsAdding(true)
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const end = new Date(tomorrow)
      end.setDate(end.getDate() + 6)
      const startDate = tomorrow.toISOString().slice(0, 10)
      const endDate = end.toISOString().slice(0, 10)
      await addItem({
        itemType: 'EQUIPMENT',
        equipmentId: id,
        startDate,
        endDate,
        quantity: 1,
        dailyRate: dailyPrice,
      })
      toast({
        title: t('common.addToCart'),
        description: locale === 'ar' ? 'تمت الإضافة للسلة' : 'Added to cart',
      })
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.error'),
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={imageUrl || PLACEHOLDER}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={imageUrl ? isExternalImageUrl(imageUrl) : false}
          />
          {soldOut && (
            <span className="absolute end-2 top-2 rounded-md bg-red-600/90 px-2 py-0.5 text-xs text-white">
              {t('common.unavailable')}
            </span>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500">
            {brand?.name ?? category?.name ?? ''}
          </p>
          <p className="mt-0.5 font-semibold text-gray-900 group-hover:text-brand-primary">
            {displayName}
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-primary">
            {dailyPrice > 0
              ? `${dailyPrice.toLocaleString()} SAR / ${t('common.pricePerDay')}`
              : '—'}
          </p>
        </div>
      </Link>
      <div className="border-t border-gray-100 px-4 pb-4 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-lg border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
          disabled={soldOut || isAdding}
          onClick={handleAddToCart}
        >
          {isAdding ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="me-2 h-4 w-4" />
          )}
          {t('common.addToCart')}
        </Button>
      </div>
    </div>
  )
}
