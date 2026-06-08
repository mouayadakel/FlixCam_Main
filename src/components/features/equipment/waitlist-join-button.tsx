'use client'

/**
 * Join equipment waitlist when dates are unavailable (FIX-046).
 */

import { useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'

type Props = {
  equipmentId: string
  startDate: string
  endDate: string
  desiredQty?: number
}

export function WaitlistJoinButton({
  equipmentId,
  startDate,
  endDate,
  desiredQty = 1,
}: Props) {
  const { t } = useLocale()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  const joinWaitlist = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId,
          desiredStartDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
          desiredEndDate: new Date(`${endDate}T23:59:59.000Z`).toISOString(),
          desiredQty,
          email: email.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to join waitlist')
      }
      setJoined(true)
      toast({
        title: t('common.success'),
        description: `Position #${data.position ?? '—'}`,
      })
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (joined) {
    return (
      <p className="text-xs font-medium text-emerald-700">
        {t('equipment.waitlistJoined') ?? 'تم تسجيلك في قائمة الانتظار'}
      </p>
    )
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-3">
      <p className="text-xs font-medium text-amber-900">
        {t('equipment.waitlistPrompt') ?? 'انضم لقائمة الانتظار — سنخبرك عند توفر المعدة'}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="waitlist-email" className="text-xs">
          {t('checkout.email') ?? 'البريد الإلكتروني'}
        </Label>
        <Input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-8 text-xs"
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={() => void joinWaitlist()}
      >
        {loading ? (
          <Loader2 className="ms-2 h-4 w-4 animate-spin" />
        ) : (
          <Bell className="ms-2 h-4 w-4" />
        )}
        {t('equipment.joinWaitlist') ?? 'انضم لقائمة الانتظار'}
      </Button>
    </div>
  )
}
