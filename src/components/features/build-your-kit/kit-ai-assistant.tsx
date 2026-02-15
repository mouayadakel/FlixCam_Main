/**
 * Floating AI assistant: "Ask our kit expert" – opens a panel with suggestions and Add to kit actions.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/hooks/use-locale'
import {
  useKitWizardStore,
  type EquipmentRecommendationItem,
} from '@/lib/stores/kit-wizard.store'
import { useCartStore } from '@/lib/stores/cart.store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MessageCircle, Loader2, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function KitAiAssistant() {
  const { t } = useLocale()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<EquipmentRecommendationItem[] | null>(null)

  const shootTypeId = useKitWizardStore((s) => s.shootTypeId)
  const shootTypeSlug = useKitWizardStore((s) => s.shootTypeSlug)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const answers = useKitWizardStore((s) => s.answers)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const addEquipment = useKitWizardStore((s) => s.addEquipment)
  const setAiSuggestions = useKitWizardStore((s) => s.setAiSuggestions)

  const fetchSuggestions = useCallback(async () => {
    const ids = Object.keys(selectedEquipment)
    setLoading(true)
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
      const list = (data.suggestions ?? []).map((s: { equipmentId: string; equipmentName: string; sku: string; quantity: number; dailyPrice: number; role: string; reason: string }) => ({
        equipmentId: s.equipmentId,
        equipmentName: s.equipmentName,
        sku: s.sku,
        quantity: s.quantity,
        dailyPrice: s.dailyPrice,
        role: s.role,
        reason: s.reason,
      }))
      setSuggestions(list)
      setAiSuggestions(list)
    } finally {
      setLoading(false)
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
    if (open && Object.keys(selectedEquipment).length >= 0) {
      fetchSuggestions()
    }
  }, [open, fetchSuggestions, selectedEquipment])

  const handleAddSuggestion = (s: EquipmentRecommendationItem) => {
    addEquipment(s.equipmentId, s.quantity, s.dailyPrice, {
      model: s.equipmentName,
      categoryId: undefined,
      isRecommended: true,
    })
    setSuggestions((prev) => prev?.filter((x) => x.equipmentId !== s.equipmentId) ?? null)
    toast({
      title: t('kit.addSuggestion'),
      description: `${s.equipmentName} added to your kit.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className="fixed bottom-6 end-6 z-50 gap-2 rounded-full bg-brand-primary px-5 shadow-lg hover:bg-brand-primary-hover"
          aria-label={t('kit.askExpert')}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">{t('kit.askExpert')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-primary" />
            {t('kit.aiAssistant')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <ul className="space-y-3">
              {suggestions.map((s) => (
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
  )
}
