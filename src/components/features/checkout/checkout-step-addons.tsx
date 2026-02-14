/**
 * Checkout Step 3: Add-ons – insurance tier, technician, delivery fee, accessories.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useCheckoutStore } from '@/lib/stores/checkout.store'

interface CheckoutStepAddonsProps {
  onSuccess: () => void
}

export function CheckoutStepAddons({ onSuccess }: CheckoutStepAddonsProps) {
  const { t } = useLocale()
  const addons = useCheckoutStore((s) => s.addons)
  const setAddons = useCheckoutStore((s) => s.setAddons)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSuccess()
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="addon-technician"
            checked={addons.technician ?? false}
            onCheckedChange={(v) => setAddons({ ...addons, technician: v === true })}
          />
          <Label htmlFor="addon-technician" className="cursor-pointer font-normal">
            Add technician (optional)
          </Label>
        </div>
        <p className="text-sm text-text-muted">
          Insurance and optional accessories can be added at payment.
        </p>
        <Button type="submit" size="lg" className="w-full">
          {t('common.next')}
        </Button>
      </form>
    </div>
  )
}
