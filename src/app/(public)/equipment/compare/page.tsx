/**
 * Equipment comparison page – side-by-side spec comparison for up to 4 items.
 * Reads ?ids=id1,id2,... from URL params.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, X } from 'lucide-react'
import type { StructuredSpecifications } from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'

const PLACEHOLDER = '/images/placeholder.jpg'

interface CompareItem {
  id: string
  sku: string
  model: string | null
  dailyPrice: number
  weeklyPrice: number | null
  monthlyPrice: number | null
  quantityAvailable: number
  specifications: unknown
  category: string | null
  brand: string | null
  image: string | null
}

export default function EquipmentComparePage() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<CompareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failedImgs, setFailedImgs] = useState<Set<string>>(() => new Set())
  const handleImgErr = useCallback((id: string) => {
    setFailedImgs((p) => new Set(p).add(id))
  }, [])

  useEffect(() => {
    const ids = searchParams?.get('ids')
    if (!ids) {
      setLoading(false)
      return
    }
    fetch(`/api/public/equipment/compare?ids=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((json) => setItems(Array.isArray(json?.data) ? json.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchParams])

  // Collect all spec keys from all items
  const allSpecKeys = new Map<string, string>() // key -> label
  for (const item of items) {
    if (isStructuredSpecifications(item.specifications)) {
      const ss = item.specifications as StructuredSpecifications
      for (const group of ss.groups) {
        for (const spec of group.specs) {
          if (!allSpecKeys.has(spec.key)) {
            allSpecKeys.set(spec.key, spec.label)
          }
        }
      }
    } else if (item.specifications && typeof item.specifications === 'object') {
      for (const key of Object.keys(item.specifications as Record<string, unknown>)) {
        if (!allSpecKeys.has(key)) allSpecKeys.set(key, key)
      }
    }
  }

  const getSpecValue = (item: CompareItem, key: string): string => {
    if (isStructuredSpecifications(item.specifications)) {
      const ss = item.specifications as StructuredSpecifications
      for (const group of ss.groups) {
        const found = group.specs.find((s) => s.key === key)
        if (found) return found.value
      }
    } else if (item.specifications && typeof item.specifications === 'object') {
      const flat = item.specifications as Record<string, unknown>
      if (key in flat) return String(flat[key])
    }
    return '—'
  }

  if (loading) {
    return (
      <main className="py-12">
        <PublicContainer>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-border-light/60" />
            <div className="h-64 rounded-xl bg-border-light/40" />
          </div>
        </PublicContainer>
      </main>
    )
  }

  if (items.length < 2) {
    return (
      <main className="py-12">
        <PublicContainer className="text-center">
          <h1 className="text-2xl font-bold text-text-heading">{t('equipment.compareTitle')}</h1>
          <p className="mt-4 text-text-muted">{t('equipment.compareEmpty')}</p>
          <Button asChild className="mt-6">
            <Link href="/equipment">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t('common.viewAll')}
            </Link>
          </Button>
        </PublicContainer>
      </main>
    )
  }

  return (
    <main className="py-8 md:py-12">
      <PublicContainer>
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/equipment">
              <ArrowLeft className="me-1 h-4 w-4" />
              {t('nav.equipment')}
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-text-heading">{t('equipment.compareTitle')}</h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            {/* Header row: images + names */}
            <thead>
              <tr>
                <th className="w-40 p-3 text-start text-xs font-medium uppercase text-text-muted" />
                {items.map((item) => {
                  const imgUrl = item.image || PLACEHOLDER
                  return (
                    <th key={item.id} className="p-3 text-center">
                      <Link href={`/equipment/${item.id}`} className="group block">
                        <div className="relative mx-auto mb-2 h-28 w-28 overflow-hidden rounded-xl bg-surface-light">
                          {failedImgs.has(item.id) ? (
                            <div className="h-full w-full bg-surface-light" />
                          ) : (
                            <Image
                              src={imgUrl}
                              alt={item.model ?? item.sku}
                              fill
                              className="object-cover"
                              sizes="112px"
                              unoptimized={isExternalImageUrl(imgUrl)}
                              onError={() => handleImgErr(item.id)}
                            />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-text-heading group-hover:text-brand-primary">
                          {item.model ?? item.sku}
                        </p>
                        <p className="text-xs text-text-muted">
                          {item.brand ?? item.category ?? ''}
                        </p>
                      </Link>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {/* Price row */}
              <tr className="border-t border-border-light/50 bg-surface-light/30">
                <td className="p-3 font-medium text-text-heading">{t('common.pricePerDay')}</td>
                {items.map((item) => (
                  <td key={item.id} className="p-3 text-center font-semibold text-brand-primary">
                    {item.dailyPrice > 0 ? `${item.dailyPrice.toLocaleString()} SAR` : '—'}
                  </td>
                ))}
              </tr>

              {/* Availability row */}
              <tr className="border-t border-border-light/50">
                <td className="p-3 font-medium text-text-heading">{t('common.available')}</td>
                {items.map((item) => (
                  <td key={item.id} className="p-3 text-center">
                    {item.quantityAvailable > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <Check className="h-4 w-4" /> {item.quantityAvailable}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <X className="h-4 w-4" /> {t('common.unavailable')}
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Spec rows */}
              {[...allSpecKeys.entries()].map(([key, label], i) => {
                const values = items.map((item) => getSpecValue(item, key))
                // Highlight differences
                const allSame = new Set(values).size === 1
                return (
                  <tr
                    key={key}
                    className={`border-t border-border-light/50 ${i % 2 === 0 ? 'bg-surface-light/30' : ''}`}
                  >
                    <td className="p-3 font-medium text-text-heading">{label}</td>
                    {values.map((val, j) => (
                      <td
                        key={items[j].id}
                        className={`p-3 text-center ${!allSame && val !== '—' ? 'font-semibold text-brand-primary' : 'text-text-body'}`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </PublicContainer>
    </main>
  )
}
