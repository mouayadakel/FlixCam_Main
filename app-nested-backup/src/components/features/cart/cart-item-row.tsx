/**
 * Single cart item row (Phase 3.1).
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/lib/stores/cart.store'

const PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

interface CartItemRowProps {
  item: CartItem
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onUpdateDates?: (itemId: string, startDate: string, endDate: string) => void
  onRemove: (itemId: string) => void
}

function getItemTypeLabel(itemType: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    EQUIPMENT: t('common.typeEquipment'),
    STUDIO: t('common.typeStudio'),
    PACKAGE: t('common.typePackage'),
    KIT: t('common.typeKit'),
  }
  return map[itemType] ?? itemType
}

function formatStudioSlot(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '—'
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—'
  const dateStr = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  return `${dateStr} • ${timeStr}`
}

function getDisplayTitle(item: {
  itemType: string
  equipmentName?: string | null
  kitName?: string | null
  studioName?: string | null
}, t: (key: string) => string): string {
  if (item.itemType === 'STUDIO' && item.studioName) return item.studioName
  if (item.itemType === 'EQUIPMENT' && item.equipmentName) return item.equipmentName
  if ((item.itemType === 'KIT' || item.itemType === 'PACKAGE') && item.kitName) return item.kitName
  return getItemTypeLabel(item.itemType, t)
}

function toDateStr(d: Date | string | null): string {
  if (!d) return ''
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toISOString().slice(0, 10)
}

export function CartItemRow({ item, onUpdateQuantity, onUpdateDates, onRemove }: CartItemRowProps) {
  const { t } = useLocale()
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const displayTitle = getDisplayTitle(item, t)
  const canEditQty = item.itemType === 'EQUIPMENT' || item.itemType === 'KIT'
  const isStudio = item.itemType === 'STUDIO'
  const studioName = isStudio ? (item.studioName ?? 'Studio') : null
  const studioSlot = isStudio ? formatStudioSlot(item.startDate, item.endDate) : null
  const days = item.days ?? (item.startDate && item.endDate
    ? Math.max(1, Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (24 * 60 * 60 * 1000)))
    : 1)
  const editStudioUrl =
    isStudio && item.studioSlug && item.startDate && item.endDate
      ? (() => {
          const start = new Date(item.startDate)
          const end = new Date(item.endDate)
          const dateStr = start.toISOString().slice(0, 10)
          const durationHours = Math.max(
            1,
            Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000))
          )
          return `/studios/${item.studioSlug}?date=${dateStr}&start=${item.startDate}&duration=${durationHours}`
        })()
      : null
  const equipmentDetailUrl =
    item.itemType === 'EQUIPMENT' && item.equipmentSlug
      ? `/equipment/${item.equipmentSlug}`
      : null

  const canEditDates = item.itemType === 'EQUIPMENT' || item.itemType === 'KIT'
  const todayStr = new Date().toISOString().slice(0, 10)
  const startDateStr = toDateStr(item.startDate) || todayStr
  const endDateStr = toDateStr(item.endDate) || (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const imageUrl = item.imageUrl || PLACEHOLDER_IMAGE

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border-light">
          <Image
            src={imageUrl}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized={imageUrl.startsWith('http')}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              if (target.src !== PLACEHOLDER_IMAGE) target.src = PLACEHOLDER_IMAGE
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
        <p className="font-medium">
          {equipmentDetailUrl ? (
            <Link href={equipmentDetailUrl} className="hover:underline">
              {displayTitle}
            </Link>
          ) : (
            displayTitle
          )}
        </p>
        {isStudio && studioSlot && <p className="text-sm text-muted-foreground">{studioSlot}</p>}
        {!isStudio && (
          <>
            <p className="text-sm text-muted-foreground">
              {item.quantity} × {days} {days === 1 ? t('cart.day') : t('cart.days')} ×{' '}
              {item.dailyRate != null ? `${item.dailyRate.toLocaleString()} SAR` : '—'}
            </p>
            {canEditDates && onUpdateDates && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t('cart.startDate')}</label>
                  <Input
                    type="date"
                    value={startDateStr}
                    min={todayStr}
                    onChange={(e) => {
                      const start = e.target.value
                      const end = endDateStr && start >= endDateStr ? start : endDateStr
                      onUpdateDates(item.id, start, end || start)
                    }}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t('cart.endDate')}</label>
                  <Input
                    type="date"
                    value={endDateStr}
                    min={startDateStr || todayStr}
                    onChange={(e) => {
                      const end = e.target.value
                      const start = startDateStr || todayStr
                      onUpdateDates(item.id, start, end)
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}
          </>
        )}
        {isStudio && (
          <p className="text-sm text-muted-foreground">
            {item.quantity} × {item.subtotal.toLocaleString()} SAR
          </p>
        )}
        {!item.isAvailable && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{t('common.unavailable')}</p>
        )}
        {editStudioUrl && (
          <Link
            href={editStudioUrl}
            className="text-sm text-primary underline underline-offset-2 hover:no-underline"
          >
            {t('common.viewDetails')}
          </Link>
        )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light pt-4">
        {canEditQty && (
          <div className="flex items-center gap-1 rounded-lg border border-border-light bg-background">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              aria-label={t('cart.quantity')}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[2rem] text-center text-sm font-medium" aria-live="polite">
              {item.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              aria-label={t('cart.quantity')}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <span className="font-medium">{item.subtotal.toLocaleString()} SAR</span>
        <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRemoveConfirm(true)}
            aria-label={t('cart.remove')}
            className="border-red-500/60 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950/70 dark:hover:text-red-300"
          >
            <Trash2 className="me-1.5 h-4 w-4" />
            {t('cart.remove')}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('cart.removeConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('cart.removeConfirmMessage')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onRemove(item.id)
                  setShowRemoveConfirm(false)
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {t('cart.remove')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
