/**
 * Dropdown to select a saved receiver or "Add new". Used when "Someone else" receives.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks/use-locale'

export interface SavedReceiver {
  id: string
  name: string
  idNumber: string
  phone: string
  idPhotoUrl: string
  createdAt?: string
}

const ADD_NEW_VALUE = '__add_new__'

interface SavedReceiverSelectorProps {
  value: string | null
  onChange: (receiverId: string | null, receiver: SavedReceiver | null) => void
  label?: string
  className?: string
}

export function SavedReceiverSelector({
  value,
  onChange,
  label,
  className,
}: SavedReceiverSelectorProps) {
  const { t } = useLocale()
  const [list, setList] = useState<SavedReceiver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/receivers')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data: { data?: SavedReceiver[] }) => {
        if (!cancelled) setList(data.data ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelect = (v: string) => {
    if (v === ADD_NEW_VALUE) {
      onChange(null, null)
      return
    }
    const receiver = list.find((r) => r.id === v) ?? null
    onChange(v, receiver)
  }

  const displayValue = value === null || value === '' ? ADD_NEW_VALUE : value

  return (
    <div className={className}>
      {label && (
        <Label className="mb-2 block">
          {label}
        </Label>
      )}
      <Select
        value={displayValue}
        onValueChange={handleSelect}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('checkout.selectReceiver')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ADD_NEW_VALUE}>{t('checkout.addNewReceiver')}</SelectItem>
          {list.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name} – {r.phone}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
