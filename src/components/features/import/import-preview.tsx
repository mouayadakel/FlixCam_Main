'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ColumnMapping {
  sourceHeader: string
  mappedField: string | null
  confidence: number
  method: string
}

interface PreviewRow {
  excelRowNumber: number
  rawData: Record<string, unknown>
  resolvedFields: Record<string, unknown>
  missingRequired: string[]
  willAiFill: string[]
}

interface SheetPreview {
  sheetName: string
  totalRows: number
  headers: string[]
  columnMappings: ColumnMapping[]
  unmappedHeaders: string[]
  previewRows: PreviewRow[]
}

interface PreviewData {
  filename: string
  sheets: SheetPreview[]
  summary: {
    totalSheets: number
    totalRows: number
    mappedFieldsRatio: string
    previewRowCount: number
  }
}

interface ImportPreviewProps {
  onConfirm: () => void
  onCancel: () => void
  disabled?: boolean
}

const FIELD_LABELS: Record<string, string> = {
  name: 'الاسم',
  brand: 'العلامة التجارية',
  model: 'الموديل',
  sku: 'SKU',
  daily_price: 'السعر اليومي',
  weekly_price: 'السعر الأسبوعي',
  monthly_price: 'السعر الشهري',
  quantity: 'الكمية',
  condition: 'الحالة',
  short_description: 'وصف مختصر',
  long_description: 'وصف طويل',
  specifications: 'المواصفات',
  box_contents: 'محتوى الصندوق',
  tags: 'الوسوم',
  featured_image: 'الصورة',
}

const DISPLAY_FIELDS = ['name', 'brand', 'model', 'sku', 'daily_price', 'quantity', 'condition']

export function ImportPreview({ onConfirm, onCancel, disabled }: ImportPreviewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState(0)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setPreview(null)
      setError(null)
    }
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/imports/preview', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Preview failed')
        return
      }

      const data = await res.json()
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const currentSheet = preview?.sheets[activeSheet]

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            معاينة الاستيراد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              onChange={handleFileSelect}
              aria-label="اختر ملف Excel للمعاينة"
              className="text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            <Button onClick={handlePreview} disabled={!file || loading} size="sm">
              {loading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="ml-2 h-4 w-4" />
              )}
              معاينة
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Results */}
      {preview && (
        <>
          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{preview.summary.totalRows}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{preview.summary.totalSheets}</p>
                  <p className="text-xs text-muted-foreground">عدد الأوراق</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {preview.summary.mappedFieldsRatio}
                  </p>
                  <p className="text-xs text-muted-foreground">الأعمدة المطابقة</p>
                </div>
                <div className="text-center">
                  <Sparkles className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium text-blue-700">
                    سيتم ملء الحقول الفارغة بالذكاء الاصطناعي
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sheet Tabs */}
          {preview.sheets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {preview.sheets.map((sheet, i) => (
                <Button
                  key={sheet.sheetName}
                  variant={i === activeSheet ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSheet(i)}
                >
                  {sheet.sheetName} ({sheet.totalRows})
                </Button>
              ))}
            </div>
          )}

          {/* Column Mapping */}
          {currentSheet && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  تعيين الأعمدة — {currentSheet.sheetName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  {currentSheet.columnMappings.map((m) => (
                    <Badge
                      key={m.sourceHeader}
                      variant={m.mappedField && m.confidence >= 50 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {m.sourceHeader} → {m.mappedField || '❌ غير معروف'}
                      {m.mappedField && <span className="mr-1 opacity-70">({m.confidence}%)</span>}
                    </Badge>
                  ))}
                </div>

                {currentSheet.unmappedHeaders.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    أعمدة غير مطابقة: {currentSheet.unmappedHeaders.join(', ')}
                  </div>
                )}

                {/* Data Preview Table */}
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        {DISPLAY_FIELDS.map((f) => (
                          <TableHead key={f} className="min-w-[120px]">
                            {FIELD_LABELS[f] || f}
                          </TableHead>
                        ))}
                        <TableHead className="min-w-[150px]">سيملأها AI</TableHead>
                        <TableHead className="min-w-[100px]">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentSheet.previewRows.map((row) => (
                        <TableRow key={row.excelRowNumber}>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {row.excelRowNumber}
                          </TableCell>
                          {DISPLAY_FIELDS.map((f) => (
                            <TableCell key={f} className="max-w-[200px] truncate text-sm">
                              {row.resolvedFields[f] != null ? (
                                String(row.resolvedFields[f])
                              ) : (
                                <span className="italic text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {row.willAiFill.slice(0, 3).map((f) => (
                                <Badge key={f} variant="secondary" className="text-[10px]">
                                  <Sparkles className="ml-0.5 h-2.5 w-2.5" />
                                  {FIELD_LABELS[f] || f}
                                </Badge>
                              ))}
                              {row.willAiFill.length > 3 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  +{row.willAiFill.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.missingRequired.length === 0 ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs">{row.missingRequired.join(', ')}</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {currentSheet.totalRows > preview.summary.previewRowCount && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    يتم عرض أول {preview.summary.previewRowCount} صفوف من أصل{' '}
                    {currentSheet.totalRows}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={disabled}>
              إلغاء
            </Button>
            <Button onClick={onConfirm} disabled={disabled}>
              {disabled && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تأكيد واستيراد
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
