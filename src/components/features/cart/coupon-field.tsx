/**
 * Coupon apply/remove field (Phase 3.1).
 */

'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CouponFieldProps {
  appliedCode: string | null
  onApply: (code: string) => Promise<void>
  onRemove: () => Promise<void>
  error: string | null
}

export function CouponField({ appliedCode, onApply, onRemove, error }: CouponFieldProps) {
  const { t } = useLocale()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    if (!code.trim()) return
    setLoading(true)
    try {
      await onApply(code.trim())
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          {appliedCode}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove()}>
          {t('cart.removeCoupon')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder={t('cart.couponPlaceholder')}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1"
      />
      <Button type="button" size="sm" onClick={handleApply} disabled={loading || !code.trim()}>
        {t('cart.applyCoupon')}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
