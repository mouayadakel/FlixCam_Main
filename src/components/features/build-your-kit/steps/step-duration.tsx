/**
 * Kit wizard step 3: Rental duration. Presets + custom input, live price preview.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore, getKitWizardTotalDaily } from '@/lib/stores/kit-wizard.store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const DURATION_PRESETS = [
  { days: 1, savePercent: null, popular: false },
  { days: 3, savePercent: null, popular: true },
  { days: 7, savePercent: 15, popular: false },
  { days: 14, savePercent: 22, popular: false },
  { days: 30, savePercent: 33, popular: false },
] as const

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function StepDuration() {
  const { t } = useLocale()
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const setDuration = useKitWizardStore((s) => s.setDuration)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)

  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const subtotal = totalDaily * durationDays

  return (
    <div className="animate-fade-in">
      <h2 className="text-section-title text-text-heading mb-1">
        {t('kit.duration')}
      </h2>
      <p className="text-body-main text-text-muted mb-6">{t('kit.durationDesc')}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {DURATION_PRESETS.map(({ days, savePercent, popular }) => (
          <button
            key={days}
            type="button"
            onClick={() => setDuration(days)}
            className={cn(
              'relative flex flex-col items-start rounded-xl border bg-white p-4 text-start shadow-card transition-all duration-300',
              'hover:shadow-card-hover hover:border-brand-primary/20',
              durationDays === days
                ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2 bg-brand-primary/5'
                : 'border-border-light/60'
            )}
          >
            {popular && (
              <span className="absolute top-2 end-2 rounded-full bg-brand-primary/15 px-2 py-0.5 text-xs font-medium text-brand-primary">
                {t('kit.mostPopular')}
              </span>
            )}
            <span className="font-semibold text-text-heading">
              {days} {days === 1 ? t('kit.day') : t('kit.days')}
            </span>
            <span className="mt-1 text-sm text-text-muted">
              {formatSar(totalDaily * days)}
            </span>
            {savePercent != null && (
              <span className="mt-1 text-xs text-green-600 font-medium">
                {t('kit.savePercent').replace('{percent}', String(savePercent))}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="kit-duration-custom">{t('kit.customDuration')}</Label>
        <Input
          id="kit-duration-custom"
          type="number"
          min={1}
          max={365}
          value={durationDays}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!Number.isNaN(v)) setDuration(v)
          }}
          className="max-w-[8rem]"
        />
      </div>

      <div className="mt-8 rounded-xl border border-border-light bg-surface-light p-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">{t('kit.dailyRate')}</span>
          <span className="font-medium">{formatSar(totalDaily)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-text-muted">
            × {durationDays} {t('kit.days')}
          </span>
          <span className="font-medium">{formatSar(subtotal)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-border-light pt-3 font-semibold">
          <span>{t('kit.subtotal')}</span>
          <span>{formatSar(subtotal)}</span>
        </div>
      </div>
    </div>
  )
}
