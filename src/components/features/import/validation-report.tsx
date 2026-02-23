'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, AlertTriangle, ImageOff, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ValidationResult } from '@/lib/services/import-validation.service'

interface ValidationReportProps {
  result: ValidationResult
  className?: string
}

export function ValidationReport({ result, className }: ValidationReportProps) {
  const { summary, errors, warnings } = result

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{summary.validRows}</p>
            <p className="text-xs text-green-600">صالح</p>
          </CardContent>
        </Card>
        <Card className={cn('border-red-200', summary.errorRows > 0 ? 'bg-red-50' : 'bg-muted/30')}>
          <CardContent className="p-3 text-center">
            <AlertCircle className="mx-auto mb-1 h-5 w-5 text-red-600" />
            <p className="text-2xl font-bold text-red-700">{summary.errorRows}</p>
            <p className="text-xs text-red-600">أخطاء</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'border-yellow-200',
            summary.warningRows > 0 ? 'bg-yellow-50' : 'bg-muted/30'
          )}
        >
          <CardContent className="p-3 text-center">
            <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-700">{summary.warningRows}</p>
            <p className="text-xs text-yellow-600">تحذيرات</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 text-center">
            <Sparkles className="mx-auto mb-1 h-5 w-5 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{summary.smartFillEligible}</p>
            <p className="text-xs text-blue-600">مؤهل للملء الذكي</p>
          </CardContent>
        </Card>
      </div>

      {summary.missingPhotos > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <ImageOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {summary.missingPhotos} منتج بدون صور كافية (أقل من 4)
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              سيقوم الذكاء الاصطناعي بتوليد 4 صور على الأقل لهذه المنتجات أثناء الملء الذكي
            </p>
          </div>
        </div>
      )}

      {summary.duplicateSkusInDb.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              رموز SKU موجودة في قاعدة البيانات:
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {summary.duplicateSkusInDb.map((sku) => (
                <Badge key={sku} variant="outline" className="text-xs">
                  {sku}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {summary.duplicateSkusInFile.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              رموز SKU مكررة داخل الملف: {summary.duplicateSkusInFile.join(', ')}
            </p>
            <p className="mt-0.5 text-xs text-blue-600">
              سيتم توليد SKU فريد تلقائياً للمكررات أثناء الاستيراد
            </p>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              أخطاء ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-1 text-xs text-red-700">
                  <span className="shrink-0 rounded bg-red-100 px-1 font-mono">
                    سطر {err.rowNumber}
                  </span>
                  <span>
                    {err.field}: {err.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              تحذيرات ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {warnings.slice(0, 20).map((warn, i) => (
                <div key={i} className="flex items-start gap-1 text-xs text-yellow-700">
                  <span className="shrink-0 rounded bg-yellow-100 px-1 font-mono">
                    سطر {warn.rowNumber}
                  </span>
                  <span>
                    {warn.field}: {warn.message}
                  </span>
                </div>
              ))}
              {warnings.length > 20 && (
                <p className="text-xs text-yellow-600">+{warnings.length - 20} تحذيرات أخرى</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
