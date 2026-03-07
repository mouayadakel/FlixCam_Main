/**
 * Deposit & Insurance Summary – shown in checkout order summary sidebar.
 * Displays deposit amount, selected insurance tier, and total breakdown.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { Shield, Banknote } from 'lucide-react'

interface DepositInsuranceSummaryProps {
  depositAmount: number | null
  insuranceTier?: string | null
  insuranceFee?: number
}

const INSURANCE_TIERS: Record<string, { labelKey: string; color: string }> = {
  basic: { labelKey: 'checkout.insuranceBasic', color: 'text-blue-600' },
  standard: { labelKey: 'checkout.insuranceStandard', color: 'text-emerald-600' },
  premium: { labelKey: 'checkout.insurancePremium', color: 'text-amber-600' },
}

export function DepositInsuranceSummary({
  depositAmount,
  insuranceTier,
  insuranceFee = 0,
}: DepositInsuranceSummaryProps) {
  const { t } = useLocale()

  if (!depositAmount && !insuranceTier) return null

  const tier = insuranceTier ? INSURANCE_TIERS[insuranceTier] : null

  return (
    <div className="space-y-3 border-t border-border-light/60 pt-3">
      {depositAmount != null && depositAmount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-text-muted">
            <Banknote className="h-4 w-4 text-amber-500" />
            {t('checkout.depositLabel')}
          </span>
          <span className="font-semibold text-text-heading">
            {depositAmount.toLocaleString()} SAR
          </span>
        </div>
      )}

      {tier && (
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-text-muted">
            <Shield className="h-4 w-4 text-emerald-500" />
            {t(tier.labelKey)}
          </span>
          <span className={`font-semibold ${tier.color}`}>
            {insuranceFee > 0 ? `${insuranceFee.toLocaleString()} SAR` : t('checkout.included')}
          </span>
        </div>
      )}

      {depositAmount != null && depositAmount > 0 && (
        <p className="text-xs text-text-muted">{t('checkout.depositNote')}</p>
      )}
    </div>
  )
}
