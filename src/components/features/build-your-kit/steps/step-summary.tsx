/**
 * Kit wizard summary step: per-category breakdown, editable quantities,
 * prebuilt kit comparison, and AI assistant panel.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import {
  useKitWizardStore,
  getKitWizardTotalDaily,
  getKitWizardTotalAmount,
  type EquipmentRecommendationItem,
} from '@/lib/stores/kit-wizard.store'
import { useCartStore } from '@/lib/stores/cart.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Minus, Plus, ShoppingCart, Sparkles, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { KitPrebuiltComparison, type PrebuiltKitMatch } from '@/components/features/build-your-kit/kit-prebuilt-comparison'

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
  const shootTypeId = useKitWizardStore((s) => s.shootTypeId)
  const shootTypeSlug = useKitWizardStore((s) => s.shootTypeSlug)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const answers = useKitWizardStore((s) => s.answers)
  const categorySteps = useKitWizardStore((s) => s.categorySteps)
  const setQty = useKitWizardStore((s) => s.setQty)
  const removeEquipment = useKitWizardStore((s) => s.removeEquipment)
  const addEquipment = useKitWizardStore((s) => s.addEquipment)
  const setAiSuggestions = useKitWizardStore((s) => s.setAiSuggestions)
  const aiSuggestions = useKitWizardStore((s) => s.aiSuggestions)

  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const subtotal = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + vatAmount

  const [matchingKits, setMatchingKits] = useState<PrebuiltKitMatch[]>([])
  const [loadingKits, setLoadingKits] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [loadingAi, setLoadingAi] = useState(false)
  const [adding, setAdding] = useState(false)

  const categoryIdToName = new Map(
    categorySteps.map((s) => [s.categoryId, s.stepTitle || s.categoryName])
  )
  const byCategory = new Map<
    string,
    { name: string; entries: [string, { qty: number; dailyPrice: number; model?: string; imageUrl?: string }][] }
  >()
  for (const [id, item] of Object.entries(selectedEquipment)) {
    const catId = item.categoryId ?? 'other'
    const name = categoryIdToName.get(catId) ?? 'Other'
    if (!byCategory.has(catId)) byCategory.set(catId, { name, entries: [] })
    byCategory.get(catId)!.entries.push([id, item])
  }
  const entries = Object.entries(selectedEquipment)
  const isEmpty = entries.length === 0

  const fetchPrebuiltAndAi = useCallback(async () => {
    const ids = Object.keys(selectedEquipment)
    if (ids.length === 0) {
      setMatchingKits([])
      return
    }
    setLoadingKits(true)
    try {
      const res = await fetch('/api/public/kit-ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shootTypeId: shootTypeId ?? undefined,
          shootTypeSlug: shootTypeSlug ?? undefined,
          budgetTier: budgetTier ?? undefined,
          questionnaireAnswers: Object.keys(answers).length ? answers : undefined,
          currentSelections: ids,
          duration: durationDays,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setMatchingKits(data.matchingPrebuiltKits ?? [])
      if (aiOpen) setAiSuggestions(data.suggestions ?? null)
    } finally {
      setLoadingKits(false)
    }
  }, [
    selectedEquipment,
    durationDays,
    shootTypeId,
    shootTypeSlug,
    budgetTier,
    answers,
    aiOpen,
    setAiSuggestions,
  ])

  useEffect(() => {
    if (isEmpty) return
    fetchPrebuiltAndAi()
  }, [isEmpty, fetchPrebuiltAndAi])

  const fetchAiSuggestions = useCallback(async () => {
    const ids = Object.keys(selectedEquipment)
    setLoadingAi(true)
    try {
      const res = await fetch('/api/public/kit-ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shootTypeId: shootTypeId ?? undefined,
          shootTypeSlug: shootTypeSlug ?? undefined,
          budgetTier: budgetTier ?? undefined,
          questionnaireAnswers: Object.keys(answers).length ? answers : undefined,
          currentSelections: ids,
          duration: durationDays,
        }),
      })
      if (!res.ok) {
        setAiSuggestions(null)
        return
      }
      const data = await res.json()
      setAiSuggestions(data.suggestions ?? null)
    } finally {
      setLoadingAi(false)
    }
  }, [
    selectedEquipment,
    durationDays,
    shootTypeId,
    shootTypeSlug,
    budgetTier,
    answers,
    setAiSuggestions,
  ])

  useEffect(() => {
    if (aiOpen && entries.length > 0) fetchAiSuggestions()
  }, [aiOpen, entries.length, fetchAiSuggestions])

  const handleAddSuggestion = (s: EquipmentRecommendationItem) => {
    addEquipment(
      s.equipmentId,
      s.quantity,
      s.dailyPrice,
      {
        model: s.equipmentName,
        categoryId: undefined,
        isRecommended: true,
      }
    )
    setAiSuggestions(aiSuggestions?.filter((x) => x.equipmentId !== s.equipmentId) ?? null)
    toast({
      title: t('kit.addSuggestion'),
      description: `${s.equipmentName} added to your kit.`,
    })
  }

  const addItem = useCartStore((s) => s.addItem)
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
        <h2 className="text-section-title text-text-heading mb-1">{t('kit.summaryTitle')}</h2>
        <p className="text-body-main text-text-muted mb-6">{t('kit.summaryDesc')}</p>
        <div className="rounded-xl border border-border-light bg-surface-light p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-text-muted mb-4" />
          <p className="text-text-body text-text-muted mb-4">{t('kit.emptyKit')}</p>
          <Button variant="outline" onClick={() => router.push('/build-your-kit')}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-section-title text-text-heading mb-1">{t('kit.summaryTitle')}</h2>
      <p className="text-body-main text-text-muted mb-6">{t('kit.summaryDesc')}</p>

      {/* Per-category breakdown */}
      <ul className="space-y-6 mb-6">
        {Array.from(byCategory.entries()).map(([catId, { name, entries: catEntries }]) => {
          const catSubtotal = catEntries.reduce(
            (sum, [, item]) => sum + item.qty * item.dailyPrice,
            0
          )
          return (
            <li key={catId}>
              <h3 className="text-lg font-semibold text-text-heading mb-3">{name}</h3>
              <ul className="space-y-4">
                {catEntries.map(([id, item]) => {
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
                        <p className="font-medium text-text-heading truncate">{item.model ?? id}</p>
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
              <p className="mt-2 text-sm text-text-muted text-right">
                {name} subtotal: {formatSar(catSubtotal)}/day
              </p>
            </li>
          )
        })}
      </ul>

      {/* Pricing */}
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

      {/* Prebuilt kit comparison */}
      <div className="mb-6">
        <KitPrebuiltComparison
          matchingKits={matchingKits}
          customKitDaily={totalDaily}
          durationDays={durationDays}
          loading={loadingKits}
        />
      </div>

      {/* Add to cart + AI assistant */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <Button
          size="lg"
          className="flex-1 bg-brand-primary hover:bg-brand-primary-hover"
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

        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="lg" className="shrink-0">
              <Sparkles className="me-2 h-5 w-5" />
              {t('kit.aiAssistant')}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full sm:max-w-md max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('kit.aiAssistant')}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {loadingAi ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
                </div>
              ) : aiSuggestions && aiSuggestions.length > 0 ? (
                <ul className="space-y-3">
                  {aiSuggestions.map((s) => (
                    <li
                      key={s.equipmentId}
                      className={cn(
                        'rounded-lg border border-border-light p-3',
                        selectedEquipment[s.equipmentId] && 'opacity-60'
                      )}
                    >
                      <p className="font-medium text-text-heading">{s.equipmentName}</p>
                      <p className="text-sm text-text-muted mb-2">{s.reason}</p>
                      <p className="text-sm text-text-muted mb-2">
                        {formatSar(s.dailyPrice)}/day · Qty {s.quantity}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!selectedEquipment[s.equipmentId]}
                        onClick={() => handleAddSuggestion(s)}
                      >
                        {selectedEquipment[s.equipmentId]
                          ? t('kit.selected')
                          : t('kit.addSuggestion')}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">{t('kit.questionnaireEmpty')}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
