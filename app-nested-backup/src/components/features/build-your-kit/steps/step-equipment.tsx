/**
 * Kit wizard step 2: Choose equipment. Grid of equipment cards, quantity controls.
 */

'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore, getKitWizardTotalDaily } from '@/lib/stores/kit-wizard.store'
import { KitEquipmentCard } from '../kit-equipment-card'
import type { KitEquipmentItem } from '../kit-equipment-card'
import { EquipmentSkeleton } from '../kit-skeleton'
import { cn } from '@/lib/utils'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function StepEquipment() {
  const { t } = useLocale()
  const selectedCategoryId = useKitWizardStore((s) => s.selectedCategoryId)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const addEquipment = useKitWizardStore((s) => s.addEquipment)
  const removeEquipment = useKitWizardStore((s) => s.removeEquipment)
  const setQty = useKitWizardStore((s) => s.setQty)

  const [equipment, setEquipment] = useState<KitEquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const selectedCount = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)

  useEffect(() => {
    if (!selectedCategoryId) {
      setEquipment([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/public/equipment?categoryId=${selectedCategoryId}&take=50`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((json) => {
        const data = Array.isArray(json?.data) ? json.data : []
        setEquipment(
          data.map(
            (e: {
              id: string
              model: string | null
              sku: string
              dailyPrice: number
              category: { name: string; slug: string } | null
              brand: { name: string; slug: string } | null
              media: { url: string; type: string }[]
            }) => ({
              id: e.id,
              model: e.model,
              sku: e.sku,
              dailyPrice: e.dailyPrice ?? 0,
              category: e.category ?? null,
              brand: e.brand ?? null,
              media: e.media ?? [],
            })
          )
        )
      })
      .catch(() => setError(t('kit.errorLoading')))
      .finally(() => setLoading(false))
  }, [selectedCategoryId, t])

  const handleToggle = (item: KitEquipmentItem) => {
    const current = selectedEquipment[item.id]
    if (current) {
      removeEquipment(item.id)
    } else {
      addEquipment(item.id, 1, item.dailyPrice, {
        model: item.model ?? item.sku,
        imageUrl: item.media[0]?.url,
      })
    }
  }

  const handleQtyChange = (item: KitEquipmentItem, qty: number) => {
    if (qty < 1) {
      removeEquipment(item.id)
      return
    }
    setQty(item.id, qty)
  }

  if (!selectedCategoryId) {
    return (
      <div className="animate-fade-in">
        <h2 className="mb-1 text-section-title text-text-heading">{t('kit.chooseEquipment')}</h2>
        <p className="text-body-main text-text-muted">{t('kit.chooseCategoryDesc')}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h2 className="mb-1 text-section-title text-text-heading">{t('kit.chooseEquipment')}</h2>
        <p className="mb-6 text-body-main text-text-muted">{t('kit.chooseEquipmentDesc')}</p>
        <EquipmentSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <h2 className="mb-1 text-section-title text-text-heading">{t('kit.chooseEquipment')}</h2>
        <p className="mb-6 text-body-main text-text-muted">{t('kit.chooseEquipmentDesc')}</p>
        <div className="rounded-xl border border-border-light bg-surface-light p-8 text-center">
          <p className="mb-4 text-destructive text-text-body">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (equipment.length === 0) {
    return (
      <div className="animate-fade-in">
        <h2 className="mb-1 text-section-title text-text-heading">{t('kit.chooseEquipment')}</h2>
        <p className="mb-6 text-body-main text-text-muted">{t('kit.chooseEquipmentDesc')}</p>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border-light bg-surface-light p-12">
          <Package className="mb-4 h-12 w-12 text-text-muted" />
          <p className="text-text-body text-text-muted">{t('kit.noEquipment')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h2 className="mb-1 text-section-title text-text-heading">{t('kit.chooseEquipment')}</h2>
      <p className="mb-6 text-body-main text-text-muted">{t('kit.chooseEquipmentDesc')}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {equipment.map((item) => (
          <KitEquipmentCard
            key={item.id}
            item={item}
            selectedQty={selectedEquipment[item.id]?.qty}
            onToggle={() => handleToggle(item)}
            onQtyChange={(qty) => handleQtyChange(item, qty)}
          />
        ))}
      </div>

      {selectedCount > 0 && (
        <div
          className={cn(
            'mt-6 rounded-xl border border-border-light bg-surface-light px-4 py-3',
            'flex flex-wrap items-center justify-between gap-2'
          )}
        >
          <span className="text-sm font-medium text-text-heading">
            {t('kit.itemsSelected').replace('{count}', String(selectedCount))} —{' '}
            {formatSar(totalDaily)} / {t('kit.perDay')}
          </span>
        </div>
      )}
    </div>
  )
}
