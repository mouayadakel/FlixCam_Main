/**
 * Fixed bottom bar on mobile: collapsed summary + expandable Sheet with
 * compact item list, pricing, and checkout CTA.
 */

'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import {
  useKitWizardStore,
  getKitWizardTotalAmount,
  getKitWizardSelectedCount,
} from '@/lib/stores/kit-wizard.store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ChevronUp } from 'lucide-react'

const VAT_RATE = 0.15

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function MobileKitBar() {
  const { t } = useLocale()
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const setView = useKitWizardStore((s) => s.setView)

  const selectedCount = getKitWizardSelectedCount({ selectedEquipment })
  const totalAmount = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(totalAmount * VAT_RATE * 100) / 100
  const totalWithVat = totalAmount + vatAmount
  const totalUnits = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)

  const scrollToReview = () => {
    setView('review')
    document.getElementById('review')?.scrollIntoView({ behavior: 'smooth' })
  }

  const [open, setOpen] = useState(false)

  if (selectedCount === 0) return null

  const handleReviewKit = () => {
    setOpen(false)
    scrollToReview()
  }

  return (
    <div className="fixed bottom-0 start-0 end-0 z-40 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 border-t border-border-light bg-white/95 p-4 shadow-card-elevated backdrop-blur-sm safe-area-pb"
            aria-expanded={open}
            aria-label={t('kit.reviewKit')}
          >
            <div className="text-start">
              <p className="text-sm font-medium text-text-heading">
                {totalUnits} {t('kit.items')} · {formatSar(totalWithVat)}
              </p>
              <p className="text-xs text-text-muted">
                {t('kit.duration')}: {durationDays} {durationDays === 1 ? t('kit.day') : t('kit.days')}
              </p>
            </div>
            <ChevronUp className="h-5 w-5 shrink-0 text-text-muted" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] rounded-t-2xl border-t"
        >
          <SheetHeader>
            <SheetTitle>{t('kit.summaryTitle')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto pb-safe">
            <ul className="space-y-2">
              {Object.entries(selectedEquipment).map(([id, item]) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate text-text-heading">
                    {item.model ?? id}
                  </span>
                  <span className="shrink-0 text-text-muted">
                    {item.qty} × {formatSar(item.dailyPrice)}/day
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-border-light pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">{t('kit.subtotal')}</span>
                <span>{formatSar(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t('kit.vat')}</span>
                <span>{formatSar(vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border-light pt-2 font-semibold">
                <span>{t('kit.total')}</span>
                <span>{formatSar(totalWithVat)}</span>
              </div>
            </div>
            <Button
              className="w-full bg-brand-primary hover:bg-brand-primary-hover"
              onClick={handleReviewKit}
            >
              {t('kit.reviewKit')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <div className="h-20 lg:hidden" aria-hidden />
    </div>
  )
}
