'use client'

import { cn } from '@/lib/utils'
import { ImageIcon, Lock, Unlock } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface PhotoGateIndicatorProps {
  photoCount: number
  required?: number
  className?: string
}

const MIN_PHOTOS = 4

export function PhotoGateIndicator({
  photoCount,
  required = MIN_PHOTOS,
  className,
}: PhotoGateIndicatorProps) {
  const percentage = Math.min(100, Math.round((photoCount / required) * 100))
  const isUnlocked = photoCount >= required
  const remaining = Math.max(0, required - photoCount)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">بوابة الصور</span>
        </div>
        <div className="flex items-center gap-1">
          {isUnlocked ? (
            <Unlock className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span
            className={cn('text-xs font-medium', isUnlocked ? 'text-green-600' : 'text-amber-600')}
          >
            {photoCount}/{required}
          </span>
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
      {!isUnlocked && photoCount === 0 && (
        <p className="text-xs text-muted-foreground">
          أضف {required} صور لتفعيل الملء الذكي. يمكنك الاستيراد الآن وإضافة الصور لاحقاً.
        </p>
      )}
      {!isUnlocked && photoCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {remaining === 1 ? 'صورة واحدة إضافية' : `${remaining} صور إضافية`} مطلوبة لتفعيل الملء
          الذكي
        </p>
      )}
      {isUnlocked && <p className="text-xs text-green-600">الملء الذكي متاح</p>}
    </div>
  )
}
