/**
 * Checkout Step 2: Add-ons – technician, insurance, accessories.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { Plus, Minus } from 'lucide-react'

const TECHNICIAN_HOURLY_RATE = 150
const INSURANCE_PERCENT = 5
const DEFAULT_ACCESSORIES: { id: string; name: string; price: number }[] = [
  { id: 'battery', name: 'Extra battery', price: 25 },
  { id: 'memory-card', name: 'Memory card 64GB', price: 80 },
  { id: 'bag', name: 'Equipment bag', price: 120 },
]

interface CheckoutStepAddonsProps {
  onBack?: () => void
  onSuccess: () => void
}

export function CheckoutStepAddons({ onBack, onSuccess }: CheckoutStepAddonsProps) {
  const { t } = useLocale()
  const addons = useCheckoutStore((s) => s.addons)
  const setAddons = useCheckoutStore((s) => s.setAddons)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSuccess()
  }

  const addAccessory = (item: { id: string; name: string; price: number }) => {
    const existing = addons.accessories ?? []
    const found = existing.find((a) => a.id === item.id)
    if (found) {
      setAddons({
        ...addons,
        accessories: existing.map((a) =>
          a.id === item.id ? { ...a, quantity: a.quantity + 1 } : a
        ),
      })
    } else {
      setAddons({
        ...addons,
        accessories: [...existing, { ...item, quantity: 1 }],
      })
    }
  }

  const removeAccessory = (id: string) => {
    const existing = addons.accessories ?? []
    const found = existing.find((a) => a.id === id)
    if (!found) return
    if (found.quantity <= 1) {
      setAddons({
        ...addons,
        accessories: existing.filter((a) => a.id !== id),
      })
    } else {
      setAddons({
        ...addons,
        accessories: existing.map((a) =>
          a.id === id ? { ...a, quantity: a.quantity - 1 } : a
        ),
      })
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 pb-24 lg:pb-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="addon-technician"
              checked={addons.technician ?? false}
              onCheckedChange={(v) =>
                setAddons({
                  ...addons,
                  technician: v === true,
                  technicianHours: v === true ? addons.technicianHours ?? 1 : undefined,
                })
              }
            />
            <Label htmlFor="addon-technician" className="cursor-pointer font-normal">
              {t('checkout.addTechnician')} – {TECHNICIAN_HOURLY_RATE} SAR
              {t('checkout.perHour')}
            </Label>
          </div>
          {addons.technician && (
            <div className="ms-6 flex items-center gap-2">
              <Label htmlFor="technician-hours" className="text-sm text-muted-foreground">
                {t('checkout.technicianHours')}:
              </Label>
              <Input
                id="technician-hours"
                type="number"
                min={1}
                max={8}
                value={addons.technicianHours ?? 1}
                onChange={(e) => {
                  const v = Math.min(8, Math.max(1, parseInt(e.target.value, 10) || 1))
                  setAddons({ ...addons, technicianHours: v })
                }}
                className="w-20"
              />
            </div>
          )}
          <p className="text-sm text-text-muted">{t('checkout.addonsTechNote')}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="addon-insurance"
              checked={!!addons.insuranceTier}
              onCheckedChange={(v) =>
                setAddons({
                  ...addons,
                  insuranceTier: v === true ? 'full' : undefined,
                })
              }
            />
            <Label htmlFor="addon-insurance" className="cursor-pointer font-normal">
              {t('checkout.insurance')} – {INSURANCE_PERCENT}% {t('checkout.ofOrder')}
            </Label>
          </div>
          <p className="text-sm text-text-muted">{t('checkout.insuranceNote')}</p>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">{t('checkout.accessories')}</Label>
          <div className="space-y-2">
            {DEFAULT_ACCESSORIES.map((item) => {
              const inCart = addons.accessories?.find((a) => a.id === item.id)
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm">
                    {item.name} – {item.price} SAR
                  </span>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeAccessory(item.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center text-sm">{inCart.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => addAccessory(item)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addAccessory(item)}
                    >
                      {t('checkout.add')}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="fixed bottom-0 start-0 end-0 z-20 flex gap-3 border-t bg-background p-4 lg:static lg:border-0 lg:p-0">
          {onBack && (
            <Button type="button" variant="outline" size="lg" onClick={onBack} className="flex-1">
              {t('common.back')}
            </Button>
          )}
          <Button type="submit" size="lg" className={onBack ? 'flex-1' : 'w-full'}>
            {t('common.next')}
          </Button>
        </div>
      </form>
    </div>
  )
}
