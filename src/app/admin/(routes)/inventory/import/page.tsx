'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AlertCircle, UploadCloud, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ProgressTracker } from '@/components/features/import/progress-tracker'
import { AIPreviewDialog } from '@/components/features/import/ai-preview-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { DropZone } from '@/components/features/import/drop-zone'
import { ColumnMapper, type MappedColumn } from '@/components/features/import/column-mapper'
import { ValidationReport } from '@/components/features/import/validation-report'
import { ImportSummary } from '@/components/features/import/import-summary'
import { StatusBadge } from '@/components/shared/status-badge'
import type { ValidationResult } from '@/lib/services/import-validation.service'
import {
  type ImportMode,
  IMPORT_MODE_LABELS,
  shouldSendApprovedSuggestions,
  shouldTriggerBackfillAfterImport,
} from './import-mode.utils'

interface Lookup {
  categories: { id: string; name: string; parentId: string | null }[]
}

interface SheetMapping {
  sheetName: string
  categoryId: string
  subCategoryId: string | null
  selected: boolean
  selectedRows: number[] // Array of row numbers to import (empty = all rows)
}

interface SheetMetadata {
  name: string
  rowCount: number
  columns: string[]
  previewRows: Array<Record<string, any> & { rowNumber?: number }>
  exceedsMaxRows: boolean
  maxRows?: number
}

type ValidationWarning = {
  rowNumber: number
  sheetName?: string
  excelRowNumber?: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

type SheetSkipMap = Record<string, number[]>

const NAME_KEYS = ['Name', 'name', 'Product Name', 'Product', 'اسم', '*']

const getRowNameValue = (row: Record<string, any>) => {
  for (const key of NAME_KEYS) {
    const value = row[key]
    if (value !== undefined && value !== null) {
      const normalized = String(value).trim()
      if (normalized) return normalized
    }
  }
  return ''
}

/** Normalize a string for matching: lowercase, trim, collapse spaces, remove common punctuation */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[-_./()[\]']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MIN_MATCH_LENGTH = 3

/**
 * Auto-match sheet name to a category and optional subcategory.
 * Uses strict matching to avoid wrong links: exact match first, then prefix-only (no loose "includes").
 * Prefers root category when sheet name exactly matches a root; otherwise best prefix match.
 */
function matchSheetToCategory(
  sheetName: string,
  categories: { id: string; name: string; parentId: string | null }[]
): { categoryId: string; subCategoryId: string | null } {
  if (!categories.length || !sheetName.trim()) return { categoryId: '', subCategoryId: null }
  const sheetNorm = normalizeForMatch(sheetName)
  if (!sheetNorm || sheetNorm.length < MIN_MATCH_LENGTH)
    return { categoryId: '', subCategoryId: null }

  const roots = categories.filter((c) => !c.parentId)
  const children = categories.filter((c) => c.parentId)

  // 1) Exact match: prefer root so "Cameras" sheet -> root Cameras, not a sub named "Cameras"
  for (const root of roots) {
    const nameNorm = normalizeForMatch(root.name)
    if (nameNorm && sheetNorm === nameNorm) return { categoryId: root.id, subCategoryId: null }
  }
  for (const sub of children) {
    const nameNorm = normalizeForMatch(sub.name)
    if (nameNorm && sheetNorm === nameNorm) {
      return { categoryId: sub.parentId!, subCategoryId: sub.id }
    }
  }

  // 2) Prefix match only (no loose includes): e.g. sheet "DSLR" -> category "DSLR Cameras"
  // Require shorter part >= MIN_MATCH_LENGTH; pick best fit (closest name length)
  type Candidate = { categoryId: string; subCategoryId: string | null; score: number }
  const candidates: Candidate[] = []

  for (const root of roots) {
    const nameNorm = normalizeForMatch(root.name)
    if (!nameNorm || nameNorm.length < MIN_MATCH_LENGTH) continue
    if (sheetNorm.startsWith(nameNorm) || nameNorm.startsWith(sheetNorm)) {
      const lenDiff = Math.abs(sheetNorm.length - nameNorm.length)
      candidates.push({ categoryId: root.id, subCategoryId: null, score: -lenDiff })
    }
  }
  for (const sub of children) {
    const nameNorm = normalizeForMatch(sub.name)
    if (!nameNorm || nameNorm.length < MIN_MATCH_LENGTH) continue
    if (sheetNorm.startsWith(nameNorm) || nameNorm.startsWith(sheetNorm)) {
      const lenDiff = Math.abs(sheetNorm.length - nameNorm.length)
      candidates.push({ categoryId: sub.parentId!, subCategoryId: sub.id, score: -lenDiff })
    }
  }

  if (candidates.length === 0) return { categoryId: '', subCategoryId: null }
  // Best score = smallest length difference (prefer closest name length)
  const best = candidates.reduce((a, b) => (a.score >= b.score ? a : b))
  return { categoryId: best.categoryId, subCategoryId: best.subCategoryId }
}

export default function ImportPage() {
  const [lookups, setLookups] = useState<Lookup | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sheetsMetadata, setSheetsMetadata] = useState<SheetMetadata[]>([])
  const [mapping, setMapping] = useState<SheetMapping[]>([])
  const [validationResults, setValidationResults] = useState<Record<string, ValidationWarning[]>>(
    {}
  )
  const [jobId, setJobId] = useState<string>('')
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [skippedNameRows, setSkippedNameRows] = useState<SheetSkipMap>({})
  const [showAIPreview, setShowAIPreview] = useState(false)
  const [aiPreviewRows, setAIPreviewRows] = useState<any[]>([])
  const [approvedSuggestions, setApprovedSuggestions] = useState<
    Array<{ sheetName: string; excelRowNumber: number; aiSuggestions: any }>
  >([])
  const [importMode, setImportMode] = useState<ImportMode>('preview_edit')
  const [columnMappings, setColumnMappings] = useState<Record<string, MappedColumn[]>>({})
  const [validationSummary, setValidationSummary] = useState<ValidationResult | null>(null)
  const [importComplete, setImportComplete] = useState(false)
  const [importResults, setImportResults] = useState<{
    total: number
    ready: number
    draft: number
    needsReview: number
    aiFilled: number
    estimatedCost?: number
  }>({ total: 0, ready: 0, draft: 0, needsReview: 0, aiFilled: 0 })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const updateColumnMappings = (sheetName: string, mappings: MappedColumn[]) => {
    setColumnMappings((prev) => ({ ...prev, [sheetName]: mappings }))
  }

  useEffect(() => {
    const load = async () => {
      setLoadingLookups(true)
      try {
        const res = await fetch('/api/admin/products/lookups')
        if (!res.ok) throw new Error('Failed to load categories')
        const data = await res.json()
        setLookups({ categories: data.categories })
      } catch (err: any) {
        toast({
          title: 'Failed to load categories',
          description: err.message,
          variant: 'destructive',
        })
      } finally {
        setLoadingLookups(false)
      }
    }
    load()
  }, [])

  const rootCategories = useMemo(
    () => lookups?.categories.filter((c) => !c.parentId) ?? [],
    [lookups]
  )

  // When lookups load after file was already uploaded, re-run category auto-match for sheets that still have no category
  useEffect(() => {
    if (!lookups?.categories?.length || !sheetsMetadata.length) return
    setMapping((prev) =>
      prev.map((m) => {
        if (m.categoryId) return m
        const matched = matchSheetToCategory(m.sheetName, lookups.categories)
        return {
          ...m,
          categoryId: matched.categoryId,
          subCategoryId: matched.subCategoryId ?? m.subCategoryId,
        }
      })
    )
  }, [lookups?.categories, sheetsMetadata.length])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setParsing(true)
    setSheetsMetadata([])
    setMapping([])
    setValidationResults({})
    setValidationSummary(null)

    try {
      // Use new sheet metadata API
      const formData = new FormData()
      formData.append('file', selected)

      const res = await fetch('/api/admin/imports/sheets', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to parse file')
      }

      const data = await res.json()
      const sheets = data.sheets || []
      setSheetsMetadata(sheets)

      // Auto-match sheet names to categories/subcategories
      const categories = lookups?.categories ?? []
      const initialMapping: SheetMapping[] = sheets.map((sheet: SheetMetadata, index: number) => {
        const matched = matchSheetToCategory(sheet.name, categories)
        return {
          sheetName: sheet.name,
          categoryId: matched.categoryId,
          subCategoryId: matched.subCategoryId,
          selected: index === 0,
          selectedRows: [],
        }
      })
      setMapping(initialMapping)
      setSkippedNameRows({})

      // Auto-link columns: fetch suggested mappings for each sheet's headers
      const nextColumnMappings: Record<string, MappedColumn[]> = {}
      const emptyMapping = (headers: string[]) =>
        headers.map((h: string) => ({
          sourceHeader: h,
          mappedField: null,
          confidence: 0,
          method: 'skip' as const,
        }))
      for (const sheet of sheets) {
        const headers = sheet.columns ?? []
        if (!headers.length) {
          nextColumnMappings[sheet.name] = []
          continue
        }
        try {
          const mapRes = await fetch('/api/admin/imports/map-columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ headers }),
          })
          if (mapRes.ok) {
            const { mappings } = await mapRes.json()
            nextColumnMappings[sheet.name] = mappings ?? []
          } else {
            nextColumnMappings[sheet.name] = emptyMapping(headers)
          }
        } catch {
          nextColumnMappings[sheet.name] = emptyMapping(headers)
        }
      }
      setColumnMappings((prev) => ({ ...prev, ...nextColumnMappings }))

      // Auto-validate after parsing
      await validateSheets(sheets)
    } catch (err: any) {
      toast({ title: 'Failed to read file', description: err.message, variant: 'destructive' })
      setFile(null)
      setSheetsMetadata([])
      setSkippedNameRows({})
    } finally {
      setParsing(false)
    }
  }

  const validateSheets = async (sheets: SheetMetadata[]) => {
    setValidating(true)
    try {
      // Convert sheets to rows format for validation
      const allRows: Array<{ rowNumber: number; payload: any }> = []
      let globalRowNumber = 1
      const skippedRows: SheetSkipMap = {}

      for (const sheet of sheets) {
        for (const [index, row] of sheet.previewRows.entries()) {
          const excelRowNumber =
            (row as Record<string, any> & { rowNumber?: number }).rowNumber ?? index + 1
          const name = getRowNameValue(row)
          if (!name) {
            skippedRows[sheet.name] = [...(skippedRows[sheet.name] ?? []), excelRowNumber]
            continue
          }

          allRows.push({
            rowNumber: globalRowNumber++,
            payload: {
              row,
              sheetName: sheet.name,
              excelRowNumber,
            },
          })
        }
      }

      setSkippedNameRows(skippedRows)

      // Call validation API
      const res = await fetch('/api/admin/imports/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: allRows }),
      })

      if (res.ok) {
        const result: ValidationResult = await res.json()
        setValidationSummary(result)
        // Group warnings by sheet
        const warningsBySheet: Record<string, ValidationWarning[]> = {}
        for (const warning of [...result.errors, ...result.warnings]) {
          const sheetKey = warning.sheetName || 'Unknown'
          if (!warningsBySheet[sheetKey]) {
            warningsBySheet[sheetKey] = []
          }
          warningsBySheet[sheetKey].push(warning)
        }
        setValidationResults(warningsBySheet)
      }
    } catch (err) {
      console.error('Validation failed:', err)
    } finally {
      setValidating(false)
    }
  }

  const updateMapping = (
    sheetName: string,
    field: 'categoryId' | 'subCategoryId' | 'selected' | 'selectedRows',
    value: string | boolean | number[]
  ) => {
    setMapping((prev) =>
      prev.map((m) => (m.sheetName === sheetName ? { ...m, [field]: value } : m))
    )
  }

  const toggleRowSelection = (sheetName: string, rowNumber: number) => {
    const sheetMapping = mapping.find((m) => m.sheetName === sheetName)
    if (!sheetMapping) return

    const currentRows = sheetMapping.selectedRows || []
    const newRows = currentRows.includes(rowNumber)
      ? currentRows.filter((r) => r !== rowNumber)
      : [...currentRows, rowNumber]

    updateMapping(sheetName, 'selectedRows', newRows)
  }

  const selectAllRows = (sheetName: string, totalRows: number) => {
    updateMapping(sheetName, 'selectedRows', [])
  }

  const deselectAllRows = (sheetName: string) => {
    const sheetMetadata = sheetsMetadata.find((s) => s.name === sheetName)
    if (!sheetMetadata) return
    // Set to all row numbers to deselect all
    const allRows = Array.from({ length: sheetMetadata.rowCount }, (_, i) => i + 1)
    updateMapping(sheetName, 'selectedRows', allRows)
  }

  const handleSheetSelectionChange = (sheetName: string, checked: boolean) => {
    setMapping((prev) =>
      prev.map((m) => {
        if (m.sheetName === sheetName) {
          return { ...m, selected: checked }
        }
        if (checked) {
          return { ...m, selected: false }
        }
        return m
      })
    )
  }

  const handleAIPreview = () => {
    // Collect preview rows from selected sheets (with category name for AI context)
    const previewRows: any[] = []
    mapping
      .filter((m) => m.selected && m.categoryId)
      .forEach((m) => {
        const sheet = sheetsMetadata.find((s) => s.name === m.sheetName)
        if (!sheet) return

        const categoryName =
          lookups?.categories.find((c) => c.id === m.categoryId)?.name ?? undefined

        const rowsToPreview =
          m.selectedRows.length === 0
            ? sheet.previewRows.slice(0, 5) // First 5 rows if all selected
            : sheet.previewRows
                .filter((row) => {
                  const excelRowNum = row.rowNumber ?? sheet.previewRows.indexOf(row) + 2
                  return m.selectedRows.includes(excelRowNum)
                })
                .slice(0, 5)

        rowsToPreview.forEach((row) => {
          const excelRowNum = row.rowNumber ?? sheet.previewRows.indexOf(row) + 2
          const name = getRowNameValue(row)
          if (!name) return // skip rows without a name so AI preview has real data
          previewRows.push({
            name,
            shortDescription:
              row['Short Description'] ??
              row['short_description'] ??
              row['Description'] ??
              row['Discription '] ??
              row['Discription'] ??
              row['وصف مختصر'] ??
              '',
            longDescription:
              row['Long Description'] ?? row['long_description'] ?? row['وصف طويل'] ?? '',
            category: m.categoryId,
            categoryName,
            brand: row['Brand'] ?? row['brand'] ?? row['Manufacturer'] ?? row['الماركة'] ?? '',
            specifications: row['Specifications'] ?? row['specifications'] ?? {},
            boxContents:
              row['WITB'] ??
              row['Box Contents'] ??
              row['box_contents'] ??
              row["What's in the box"] ??
              '',
            sheetName: m.sheetName,
            excelRowNumber: excelRowNum,
          })
        })
      })

    if (previewRows.length === 0) {
      toast({
        title: 'No rows to preview',
        description:
          'Select a category for the sheet and ensure rows have a name (Name / Product Name / اسم).',
        variant: 'destructive',
      })
      return
    }

    setAIPreviewRows(previewRows)
    setShowAIPreview(true)
  }

  const subcategoriesFor = (categoryId: string) =>
    lookups?.categories.filter((c) => c.parentId === categoryId) ?? []

  const allSheetsMapped = useMemo(() => {
    return mapping.every((m) => !m.selected || (m.selected && m.categoryId !== ''))
  }, [mapping])

  const selectedSheetsCount = useMemo(() => {
    return mapping.filter((m) => m.selected).length
  }, [mapping])

  const onSubmit = async () => {
    if (!file) {
      toast({ title: 'Select a file first', variant: 'destructive' })
      return
    }

    if (!allSheetsMapped) {
      toast({ title: 'Map all selected sheets to categories', variant: 'destructive' })
      return
    }

    if (selectedSheetsCount === 0) {
      toast({ title: 'Select at least one sheet to import', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const selectedMappings = mapping.filter((m) => m.selected)
      const selectedSheetNames = selectedMappings.map((m) => m.sheetName)

      // Build selectedRows object: { sheetName: [rowNumbers] }
      const selectedRowsMap: Record<string, number[]> = {}
      selectedMappings.forEach((m) => {
        if (m.selectedRows.length > 0) {
          selectedRowsMap[m.sheetName] = m.selectedRows
        }
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append(
        'mapping',
        JSON.stringify(
          selectedMappings.map((m) => ({
            sheetName: m.sheetName,
            categoryId: m.categoryId,
            subCategoryId:
              m.subCategoryId && m.subCategoryId !== '__none__' ? m.subCategoryId : null,
          }))
        )
      )
      if (selectedSheetNames.length > 0) {
        formData.append('selectedSheets', JSON.stringify(selectedSheetNames))
      }
      if (Object.keys(selectedRowsMap).length > 0) {
        formData.append('selectedRows', JSON.stringify(selectedRowsMap))
      }
      if (shouldSendApprovedSuggestions(importMode, approvedSuggestions.length)) {
        formData.append('approvedSuggestions', JSON.stringify(approvedSuggestions))
      }

      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await res.json()
      setJobId(data.jobId)
      setImportComplete(false)
      const descriptionParts = [`Job: ${data.jobId}`, `rows: ${data.totalRows}`]
      if (data.skippedRowsCount) {
        descriptionParts.push(`Skipped ${data.skippedRowsCount} unnamed row(s)`)
      }
      toast({
        title: 'Import started',
        description: descriptionParts.join(' • '),
      })
      if (shouldTriggerBackfillAfterImport(importMode)) {
        try {
          const backfillRes = await fetch('/api/admin/ai/backfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fillAll: true, minQualityScore: 0 }),
          })
          const backfillData = await backfillRes.json()
          if (backfillRes.ok && backfillData.queued > 0) {
            toast({
              title: 'AI fill queued',
              description: `${backfillData.queued} product(s) added to AI fill. Check AI Dashboard for progress.`,
            })
          }
        } catch {
          toast({
            title: 'AI fill not started',
            description: 'Import succeeded. Run Fill All from AI Dashboard to fill content.',
            variant: 'destructive',
          })
        }
      }
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Removed duplicate polling - ProgressTracker already handles job status polling
  // useEffect(() => {
  //   if (!jobId) return
  //   let active = true
  //   const poll = async () => {
  //     try {
  //       const res = await fetch(`/api/admin/imports/${jobId}`)
  //       if (!res.ok) return
  //       const data = await res.json()
  //       if (!active) return
  //       setJobStatus(data)
  //     } catch {
  //       // ignore
  //     }
  //   }
  //   poll()
  //   const timer = setInterval(poll, 2000)
  //   return () => {
  //     active = false
  //     clearInterval(timer)
  //   }
  // }, [jobId])

  const currentStep = !file
    ? 0
    : sheetsMetadata.length === 0
      ? 0
      : jobId
        ? 3
        : allSheetsMapped
          ? 2
          : 1
  const stepLabels = ['رفع الملف', 'ربط الأعمدة', 'معاينة واستيراد', 'النتائج']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">استيراد المعدات</h1>
          <p className="mt-1 text-muted-foreground">
            استيراد ذكي من Excel مع ملء تلقائي بالذكاء الاصطناعي
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <nav className="flex items-center gap-1">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex flex-1 items-center gap-1">
            <div
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                i === currentStep
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : i < currentStep
                    ? 'bg-green-100 text-green-800'
                    : 'bg-muted text-muted-foreground/50'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i < currentStep
                    ? 'bg-green-200 text-green-800'
                    : i === currentStep
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-background text-muted-foreground'
                }`}
              >
                {i < currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="hidden truncate sm:inline">{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                className={`h-0.5 w-4 shrink-0 ${i < currentStep ? 'bg-green-400' : 'bg-muted'}`}
              />
            )}
          </div>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>رفع الملف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>وضع الاستيراد</Label>
            <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preview_edit">{IMPORT_MODE_LABELS.preview_edit}</SelectItem>
                <SelectItem value="import_then_fill">
                  {IMPORT_MODE_LABELS.import_then_fill}
                </SelectItem>
                <SelectItem value="import_autofill">
                  {IMPORT_MODE_LABELS.import_autofill}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {importMode === 'preview_edit' &&
                'تحليل بالذكاء الاصطناعي، مراجعة وتعديل، ثم استيراد.'}
              {importMode === 'import_then_fill' && 'استيراد كما هو. شغل الملء من لوحة AI لاحقاً.'}
              {importMode === 'import_autofill' &&
                'استيراد ثم ملء تلقائي بالذكاء الاصطناعي لجميع المنتجات.'}
            </p>
          </div>
          <DropZone
            file={file}
            onFileSelect={(f) => {
              setFile(f)
              const fakeEvent = {
                target: { files: [f] },
              } as unknown as React.ChangeEvent<HTMLInputElement>
              handleFileChange(fakeEvent)
            }}
            onClear={() => {
              setFile(null)
              setSheetsMetadata([])
              setMapping([])
              setValidationResults({})
              setValidationSummary(null)
              setJobId('')
              setSkippedNameRows({})
              setApprovedSuggestions([])
            }}
            disabled={parsing}
          />
          {/* Hidden file input kept for backward compatibility */}
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري تحليل الملف...
              {validating && <span className="text-xs">(التحقق...)</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {sheetsMetadata.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sheet → Category Mapping</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Map each sheet to a category. All sheets must be mapped before import.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="multiple" className="w-full">
              {sheetsMetadata.map((sheet) => {
                const sheetMapping = mapping.find((m) => m.sheetName === sheet.name)
                const warnings = validationResults[sheet.name] || []
                const errors = warnings.filter((w) => w.severity === 'error')
                const hasErrors = errors.length > 0
                const isMapped = sheetMapping?.categoryId !== ''

                return (
                  <AccordionItem key={sheet.name} value={sheet.name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={sheetMapping?.selected ?? false}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSheetSelectionChange(sheet.name, e.target.checked)
                          }}
                          className="h-4 w-4 accent-primary"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select sheet ${sheet.name} for import`}
                        />
                        <span className="font-medium">{sheet.name}</span>
                        <Badge variant="outline">{sheet.rowCount} rows</Badge>
                        {sheet.exceedsMaxRows && (
                          <Badge variant="destructive">Exceeds {sheet.maxRows} rows</Badge>
                        )}
                        {isMapped ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        {hasErrors && <Badge variant="destructive">{errors.length} errors</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Validation Warnings */}
                        {warnings.length > 0 && (
                          <div className="space-y-2 rounded-md border p-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <AlertCircle className="h-4 w-4" />
                              Validation Issues ({warnings.length})
                            </div>
                            <div className="max-h-32 space-y-1 overflow-y-auto">
                              {warnings.slice(0, 10).map((warning, idx) => {
                                const rowLabel = warning.excelRowNumber ?? warning.rowNumber
                                const sheetLabel = warning.sheetName
                                  ? ` (${warning.sheetName})`
                                  : ''
                                return (
                                  <div
                                    key={idx}
                                    className={`text-xs ${
                                      warning.severity === 'error'
                                        ? 'text-red-600'
                                        : 'text-yellow-600'
                                    }`}
                                  >
                                    Row {rowLabel}
                                    {sheetLabel}: {warning.field} - {warning.message}
                                  </div>
                                )
                              })}
                              {warnings.length > 10 && (
                                <div className="text-xs text-muted-foreground">
                                  +{warnings.length - 10} more issues
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {skippedNameRows[sheet.name]?.length > 0 && (
                          <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            <span className="font-medium">Ignored rows (missing Name)</span>
                            <span>
                              Rows {skippedNameRows[sheet.name].join(', ')} were excluded from
                              upload and validation.
                            </span>
                          </div>
                        )}

                        {/* Category Mapping */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Category *</Label>
                            <Select
                              value={sheetMapping?.categoryId || ''}
                              onValueChange={(v) => updateMapping(sheet.name, 'categoryId', v)}
                              disabled={loadingLookups}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={loadingLookups ? 'Loading...' : 'Select category'}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {rootCategories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Subcategory (optional)</Label>
                            <Select
                              value={sheetMapping?.subCategoryId || '__none__'}
                              onValueChange={(v) =>
                                updateMapping(
                                  sheet.name,
                                  'subCategoryId',
                                  v === '__none__' ? '' : v
                                )
                              }
                              disabled={
                                !sheetMapping?.categoryId ||
                                subcategoriesFor(sheetMapping?.categoryId || '').length === 0
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {subcategoriesFor(sheetMapping?.categoryId || '').map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <ColumnMapper
                          headers={sheet.columns}
                          initialMappings={columnMappings[sheet.name]}
                          sampleRows={sheet.previewRows.slice(0, 3).map((r) => {
                            const { rowNumber: _, ...rest } = r as Record<string, unknown> & {
                              rowNumber?: number
                            }
                            return rest
                          })}
                          onMappingsChange={(mappings) =>
                            updateColumnMappings(sheet.name, mappings)
                          }
                        />

                        {/* Row Selection */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Row Selection</Label>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectAllRows(sheet.name, sheet.rowCount)}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deselectAllRows(sheet.name)}
                              >
                                Deselect All
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sheetMapping?.selectedRows.length === 0
                              ? `All ${sheet.rowCount} rows selected`
                              : `${sheetMapping?.selectedRows.length || 0} of ${sheet.rowCount} rows selected`}
                          </div>
                        </div>

                        {/* Preview Rows */}
                        {sheet.previewRows.length > 0 && (
                          <div className="space-y-2">
                            <Label>
                              Preview (first {Math.min(10, sheet.previewRows.length)} rows)
                            </Label>
                            <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-md border">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-muted/40">
                                  <tr>
                                    <th className="w-8 p-2">
                                      <Checkbox
                                        checked={
                                          sheetMapping?.selectedRows.length === 0 ||
                                          sheet.previewRows.slice(0, 10).every((row) => {
                                            const excelRowNum =
                                              row.rowNumber ?? sheet.previewRows.indexOf(row) + 2
                                            return (sheetMapping?.selectedRows || []).includes(
                                              excelRowNum
                                            )
                                          })
                                        }
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            selectAllRows(sheet.name, sheet.rowCount)
                                          } else {
                                            deselectAllRows(sheet.name)
                                          }
                                        }}
                                      />
                                    </th>
                                    <th className="p-2 text-start font-medium">Row</th>
                                    {sheet.columns.slice(0, 7).map((col) => (
                                      <th key={col} className="p-2 text-start font-medium">
                                        {col}
                                      </th>
                                    ))}
                                    {sheet.columns.length > 7 && (
                                      <th className="p-2 text-start font-medium">...</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sheet.previewRows.slice(0, 10).map((row, idx) => {
                                    const excelRowNumber = row.rowNumber ?? idx + 2 // Excel rows start at 1, +1 for header
                                    const isSelected =
                                      sheetMapping?.selectedRows.length === 0 ||
                                      (sheetMapping?.selectedRows || []).includes(excelRowNumber)
                                    return (
                                      <tr
                                        key={idx}
                                        className={`border-t ${isSelected ? '' : 'opacity-50'}`}
                                      >
                                        <td className="p-2">
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                              toggleRowSelection(sheet.name, excelRowNumber)
                                            }
                                          />
                                        </td>
                                        <td className="p-2 font-medium">{excelRowNumber}</td>
                                        {sheet.columns.slice(0, 7).map((col) => (
                                          <td key={col} className="p-2">
                                            {String(row[col] || '').slice(0, 30)}
                                            {String(row[col] || '').length > 30 && '...'}
                                          </td>
                                        ))}
                                        {sheet.columns.length > 7 && (
                                          <td className="p-2 text-muted-foreground">...</td>
                                        )}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>

            {validationSummary && <ValidationReport result={validationSummary} />}

            {!allSheetsMapped && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>All selected sheets must be mapped to categories before importing.</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedSheetsCount} of {sheetsMetadata.length} sheets selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAIPreview}
                  disabled={!allSheetsMapped || selectedSheetsCount === 0}
                >
                  <Sparkles className="me-2 h-4 w-4" />
                  Preview AI
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={submitting || !allSheetsMapped || selectedSheetsCount === 0}
                >
                  {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  Start Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {jobId && (
        <ProgressTracker
          jobId={jobId}
          onComplete={(data) => {
            setImportComplete(true)
            const products = data?.progress?.products
            const ai = data?.progress?.ai
            setImportResults({
              total: products?.total ?? 0,
              ready: products?.success ?? 0,
              draft: 0,
              needsReview: 0,
              aiFilled: ai?.processed ?? 0,
              estimatedCost: ai?.cost,
            })
            toast({ title: 'Import completed!' })
          }}
        />
      )}

      {jobId && importComplete && (
        <ImportSummary
          totalItems={importResults.total}
          readyCount={importResults.ready}
          draftCount={importResults.draft}
          needsReviewCount={importResults.needsReview}
          categoryCount={selectedSheetsCount}
          aiFilled={importResults.aiFilled}
          estimatedCost={importResults.estimatedCost}
        />
      )}

      <AIPreviewDialog
        open={showAIPreview}
        onOpenChange={setShowAIPreview}
        rows={aiPreviewRows}
        onApply={(suggestions) => {
          const withKeys = suggestions
            .filter((s) => s.original?.sheetName != null && s.original?.excelRowNumber != null)
            .map((s) => ({
              sheetName: s.original.sheetName as string,
              excelRowNumber: s.original.excelRowNumber as number,
              aiSuggestions: s.aiSuggestions,
            }))
          setApprovedSuggestions(withKeys)
          setShowAIPreview(false)
          toast({
            title: 'AI suggestions approved',
            description: `${withKeys.length} suggestions will be applied when you start import`,
          })
        }}
        onSkip={() => {
          toast({
            title: 'AI preview skipped',
            description: 'AI will still run in the background after import',
          })
        }}
      />
    </div>
  )
}
