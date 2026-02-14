/**
 * Kit wizard step 4: Summary. Line items, pricing breakdown, add to cart.
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore, getKitWizardTotalDaily, getKitWizardTotalAmount } from '@/lib/stores/kit-wizard.store'
import { useCartStore } from '@/lib/stores/cart.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const VAT_RATE = 0.15
const EQUIPMENT_PLACEHOLDER = '/images/placeholder.jpg'

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function StepSummary() {
  const { t } = useLocale()
  const router = useRouter()
  const { toast } = useToast()

  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const setQty = useKitWizardStore((s) => s.setQty)
  const removeEquipment = useKitWizardStore((s) => s.removeEquipment)

  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const subtotal = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + vatAmount

  const addItem = useCartStore((s) => s.addItem)
  const [adding, setAdding] = useState(false)

  const entries = Object.entries(selectedEquipment)
  const isEmpty = entries.length === 0

  const handleAddToCart = async () => {
    if (isEmpty) return
    setAdding(true)
    try {
      for (const [equipmentId, { qty, dailyPrice }] of entries) {
        await addItem({
          itemType: 'EQUIPMENT',
          equipmentId,
          quantity: qty,
          dailyRate: dailyPrice,
        })
      }
      toast({
        title: t('kit.addedToCart'),
        description: t('kit.itemsSelected').replace('{count}', String(entries.length)),
      })
      router.push('/cart')
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('kit.errorLoading'),
        variant: 'destructive',
      })
    } finally {
      setAdding(false)
    }
  }

  if (isEmpty) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-section-title text-text-heading mb-1">
          {t('kit.summaryTitle')}
        </h2>
        <p className="text-body-main text-text-muted mb-6">{t('kit.summaryDesc')}</p>
        <div className="rounded-xl border border-border-light bg-surface-light p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-text-muted mb-4" />
          <p className="text-text-body text-text-muted mb-4">{t('kit.emptyKit')}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/build-your-kit')}
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-section-title text-text-heading mb-1">
        {t('kit.summaryTitle')}
      </h2>
      <p className="text-body-main text-text-muted mb-6">{t('kit.summaryDesc')}</p>

      <ul className="space-y-4 mb-6">
        {entries.map(([id, item]) => {
          const lineTotal = item.qty * item.dailyPrice
          return (
            <li
              key={id}
              className="flex gap-4 rounded-xl border border-border-light bg-white p-4 shadow-sm"
            >
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-light">
                <Image
                  src={item.imageUrl || EQUIPMENT_PLACEHOLDER}
                  alt={item.model ?? id}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized={!item.imageUrl}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-heading truncate">
                  {item.model ?? id}
                </p>
                <p className="text-sm text-text-muted">
                  {formatSar(item.dailyPrice)} / {t('kit.perDay')} × {item.qty}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center rounded-lg border border-border-light bg-surface-light">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={() =>
                      item.qty <= 1 ? removeEquipment(id) : setQty(id, item.qty - 1)
                    }
                    aria-label={t('kit.remove')}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!Number.isNaN(v)) setQty(id, v)
                    }}
                    className="h-8 w-12 border-0 text-center text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={() => setQty(id, item.qty + 1)}
                    aria-label={t('kit.add')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="font-semibold w-20 text-end">{formatSar(lineTotal)}</span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="rounded-xl border border-border-light bg-surface-light p-4 space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">{t('kit.subtotal')}</span>
          <span>{formatSar(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">{t('kit.vat')}</span>
          <span>{formatSar(vatAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-border-light pt-3 font-semibold">
          <span>{t('kit.total')}</span>
          <span>{formatSar(total)}</span>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full bg-brand-primary hover:bg-brand-primary-hover"
        onClick={handleAddToCart}
        disabled={adding}
      >
        {adding ? (
          t('kit.addingToCart')
        ) : (
          <>
            <ShoppingCart className="me-2 h-5 w-5" />
            {t('kit.addAllToCart')}
          </>
        )}
      </Button>
    </div>
  )
}
