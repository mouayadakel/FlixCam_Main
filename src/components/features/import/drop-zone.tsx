'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { UploadCloud, FileSpreadsheet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DropZoneProps {
  onFileSelect: (file: File) => void
  file: File | null
  onClear: () => void
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
}

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/tab-separated-values',
  'application/csv', // Safari and some browsers use this for .csv
]
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.tsv']

export function DropZone({ onFileSelect, file, onClear, maxSizeMB = 50, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback(
    (f: File): string | null => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) {
        return `نوع الملف غير مدعوم. الأنواع المقبولة: ${ACCEPTED_EXTENSIONS.join(', ')}`
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        return `الملف كبير جداً. الحد الأقصى: ${maxSizeMB}MB`
      }
      return null
    },
    [maxSizeMB]
  )

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f)
      if (err) {
        setError(err)
        return
      }
      setError(null)
      onFileSelect(f)
    },
    [validateFile, onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [disabled, handleFile]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
      e.target.value = ''
    },
    [handleFile]
  )

  if (file) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          disabled={disabled}
          title="اختر ملف Excel أو CSV"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <UploadCloud
          className={cn('mb-3 h-10 w-10', isDragging ? 'text-primary' : 'text-muted-foreground')}
        />
        <p className="text-sm font-medium">اسحب ملف Excel أو CSV هنا</p>
        <p className="mt-1 text-xs text-muted-foreground">أو اضغط للاختيار</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {ACCEPTED_EXTENSIONS.join(', ')} — حد أقصى {maxSizeMB}MB
        </p>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
