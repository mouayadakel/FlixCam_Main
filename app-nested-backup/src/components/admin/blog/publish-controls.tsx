/**
 * Publish controls: status select, publishedAt date picker, featured/trending toggles.
 */

'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const

interface PublishControlsProps {
  status: string
  publishedAt: string
  featured: boolean
  trending: boolean
  onStatusChange: (status: string) => void
  onPublishedAtChange: (value: string) => void
  onFeaturedChange: (value: boolean) => void
  onTrendingChange: (value: boolean) => void
  className?: string
}

export function PublishControls({
  status,
  publishedAt,
  featured,
  trending,
  onStatusChange,
  onPublishedAtChange,
  onFeaturedChange,
  onTrendingChange,
  className,
}: PublishControlsProps) {
  const formatDateForInput = (d: Date | string | null) => {
    if (!d) return ''
    const date = typeof d === 'string' ? new Date(d) : d
    return date.toISOString().slice(0, 16)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Publish date & time</Label>
        <Input
          type="datetime-local"
          value={formatDateForInput(publishedAt)}
          onChange={(e) => onPublishedAtChange(e.target.value || '')}
          placeholder="Leave empty for immediate"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Featured</Label>
          <p className="text-xs text-muted-foreground">Show in hero/carousel</p>
        </div>
        <Switch checked={featured} onCheckedChange={onFeaturedChange} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Trending</Label>
          <p className="text-xs text-muted-foreground">Highlight in trending section</p>
        </div>
        <Switch checked={trending} onCheckedChange={onTrendingChange} />
      </div>
    </div>
  )
}
