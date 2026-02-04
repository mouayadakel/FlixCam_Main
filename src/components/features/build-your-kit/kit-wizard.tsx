/**
 * Build Your Kit wizard (Phase 2.6). Steps: Category → Equipment → Duration → Summary.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

const STEPS = 4

interface Category {
  id: string
  name: string
  slug: string
}

interface EquipmentItem {
  id: string
  model: string | null
  sku: string
  dailyPrice: number
}

export function KitWizard() {
  const { t } = useLocale()
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedEquipment, setSelectedEquipment] = useState<{ id: string; qty: number }[]>([])
  const [durationDays, setDurationDays] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/public/categories')
      .then((r) => r.json())
      .then((res) => setCategories(Array.isArray(res?.data) ? res.data : []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCategoryId) {
      setEquipment([])
      return
    }
    fetch(`/api/public/equipment?categoryId=${selectedCategoryId}&take=50`)
      .then((r) => r.json())
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : []
        setEquipment(data.map((e: { id: string; model: string | null; sku: string; dailyPrice: number }) => ({
          id: e.id,
          model: e.model,
          sku: e.sku,
          dailyPrice: e.dailyPrice ?? 0,
        })))
      })
  }, [selectedCategoryId])

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) => {
      const i = prev.findIndex((e) => e.id === id)
      if (i >= 0) {
        const next = [...prev]
        next.splice(i, 1)
        return next
      }
      return [...prev, { id, qty: 1 }]
    })
  }

  const setQty = (id: string, qty: number) => {
    if (qty < 1) {
      setSelectedEquipment((prev) => prev.filter((e) => e.id !== id))
      return
    }
    setSelectedEquipment((prev) =>
      prev.map((e) => (e.id === id ? { ...e, qty } : e))
    )
  }

  const totalDaily = selectedEquipment.reduce((sum, se) => {
    const eq = equipment.find((e) => e.id === se.id)
    return sum + (eq?.dailyPrice ?? 0) * se.qty
  }, 0)
  const total = totalDaily * durationDays

  const canNextStep1 = selectedCategoryId
  const canNextStep2 = selectedEquipment.length > 0
  const canNextStep3 = durationDays >= 1

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex gap-2">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded ${
              i + 1 <= step ? 'bg-primary' : 'bg-muted'
            }`}
            aria-hidden
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose category</h2>
          {loading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={selectedCategoryId === c.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategoryId(c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          )}
          <Button onClick={() => setStep(2)} disabled={!canNextStep1}>
            {t('common.next')}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose equipment</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {equipment.map((eq) => {
              const sel = selectedEquipment.find((e) => e.id === eq.id)
              return (
                <div
                  key={eq.id}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="font-medium">{eq.model ?? eq.sku}</p>
                    <p className="text-sm text-muted-foreground">
                      {eq.dailyPrice.toLocaleString()} SAR / {t('common.pricePerDay')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sel ? (
                      <>
                        <input
                          type="number"
                          min={1}
                          value={sel.qty}
                          onChange={(e) => setQty(eq.id, parseInt(e.target.value, 10) || 1)}
                          className="w-14 rounded border px-2 py-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEquipment(eq.id)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => toggleEquipment(eq.id)}
                      >
                        {t('common.addToCart')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              {t('common.back')}
            </Button>
            <Button onClick={() => setStep(3)} disabled={!canNextStep2}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Rental duration (days)</h2>
          <input
            type="number"
            min={1}
            max={365}
            value={durationDays}
            onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded border px-3 py-2"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              {t('common.back')}
            </Button>
            <Button onClick={() => setStep(4)} disabled={!canNextStep3}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="text-muted-foreground">
            {selectedEquipment.length} item(s) × {durationDays} days
          </p>
          <p className="text-xl font-semibold">
            Total: {total.toLocaleString()} SAR
          </p>
          <Button asChild size="lg">
            <Link
              href={`/cart?kitCustom=1&items=${selectedEquipment.map((e) => `${e.id}:${e.qty}`).join(',')}&days=${durationDays}`}
            >
              {t('common.addToCart')}
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setStep(3)}>
            {t('common.back')}
          </Button>
        </div>
      )}
    </div>
  )
}
