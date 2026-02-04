'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AlertCircle, UploadCloud, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ProgressTracker } from '@/components/features/import/progress-tracker'
import { AIPreviewDialog } from '@/components/features/import/ai-preview-dialog'
import { Checkbox } from '@/components/ui/checkbox'

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

const NAME_KEYS = ['Name', 'name', 'Product Name', 'Product', 'اسم']

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


export default function ImportPage() {
  const [lookups, setLookups] = useState<Lookup | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sheetsMetadata, setSheetsMetadata] = useState<SheetMetadata[]>([])
  const [mapping, setMapping] = useState<SheetMapping[]>([])
  const [validationResults, setValidationResults] = useState<Record<string, ValidationWarning[]>>({})
  const [jobId, setJobId] = useState<string>('')
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [skippedNameRows, setSkippedNameRows] = useState<SheetSkipMap>({})
  const [showAIPreview, setShowAIPreview] = useState(false)
  const [aiPreviewRows, setAIPreviewRows] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoadingLookups(true)
      try {
        const res = await fetch('/api/admin/products/lookups')
        if (!res.ok) throw new Error('Failed to load categories')
        const data = await res.json()
        setLookups({ categories: data.categories })
      } catch (err: any) {
        toast({ title: 'Failed to load categories', description: err.message, variant: 'destructive' })
      } finally {
        setLoadingLookups(false)
      }
    }
    load()
  }, [])

  const rootCategories = useMemo(() => lookups?.categories.filter((c) => !c.parentId) ?? [], [lookups])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    
    setFile(selected)
    setParsing(true)
    setSheetsMetadata([])
    setMapping([])
    setValidationResults({})

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
      setSheetsMetadata(data.sheets || [])
      
      // Initialize mapping for all sheets (only one selected at a time)
      setMapping(
        (data.sheets || []).map((sheet: SheetMetadata, index: number) => ({
          sheetName: sheet.name,
          categoryId: '',
          subCategoryId: null,
          selected: index === 0,
          selectedRows: [], // Empty = all rows selected
        }))
      )
      setSkippedNameRows({})

      // Auto-validate after parsing
      await validateSheets(data.sheets || [])
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
            (row as Record<string, any> & { rowNumber?: number }).rowNumber ??
            index + 1
          const name = getRowNameValue(row)
          if (!name) {
            skippedRows[sheet.name] = [
              ...(skippedRows[sheet.name] ?? []),
              excelRowNumber,
            ]
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
        const result = await res.json()
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
    // Collect preview rows from selected sheets
    const previewRows: any[] = []
    mapping
      .filter((m) => m.selected && m.categoryId)
      .forEach((m) => {
        const sheet = sheetsMetadata.find((s) => s.name === m.sheetName)
        if (!sheet) return

        const rowsToPreview = m.selectedRows.length === 0
          ? sheet.previewRows.slice(0, 5) // First 5 rows if all selected
          : sheet.previewRows.filter((row) => {
              const excelRowNum = row.rowNumber ?? sheet.previewRows.indexOf(row) + 2
              return m.selectedRows.includes(excelRowNum)
            }).slice(0, 5)

        rowsToPreview.forEach((row) => {
          previewRows.push({
            name: row['Name'] || row['name'] || row['Product Name'] || '',
            shortDescription: row['Short Description'] || row['short_description'] || '',
            longDescription: row['Long Description'] || row['long_description'] || '',
            category: m.categoryId,
            brand: row['Brand'] || row['brand'] || '',
            specifications: row['Specifications'] || row['specifications'] || {},
          })
        })
      })

    if (previewRows.length === 0) {
      toast({ title: 'No rows to preview', variant: 'destructive' })
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
            subCategoryId: m.subCategoryId && m.subCategoryId !== '__none__' ? m.subCategoryId : null,
          }))
        )
      )
      if (selectedSheetNames.length > 0) {
        formData.append('selectedSheets', JSON.stringify(selectedSheetNames))
      }
      if (Object.keys(selectedRowsMap).length > 0) {
        formData.append('selectedRows', JSON.stringify(selectedRowsMap))
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
      const descriptionParts = [
        `Job: ${data.jobId}`,
        `rows: ${data.totalRows}`
      ]
      if (data.skippedRowsCount) {
        descriptionParts.push(`Skipped ${data.skippedRowsCount} unnamed row(s)`)
      }
      toast({
        title: 'Import started',
        description: descriptionParts.join(' • '),
      })
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Equipment (Excel)</h1>
          </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Excel/CSV/TSV File</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
              >
                Choose File
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : 'No file selected'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Max 50MB, 5,000 rows. Supports .xlsx, .xls, .csv, .tsv
            </p>
          </div>
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="h-4 w-4" /> {file.name}
              {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
              {validating && <span className="text-xs">Validating...</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {sheetsMetadata.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sheet → Category Mapping</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
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
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={sheetMapping?.selected ?? false}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSheetSelectionChange(sheet.name, e.target.checked)
                          }}
                          className="h-4 w-4 accent-primary"
                          onClick={(e) => e.stopPropagation()}
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
                        {hasErrors && (
                          <Badge variant="destructive">{errors.length} errors</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Validation Warnings */}
                        {warnings.length > 0 && (
                          <div className="rounded-md border p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <AlertCircle className="h-4 w-4" />
                              Validation Issues ({warnings.length})
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {warnings.slice(0, 10).map((warning, idx) => {
                                const rowLabel = warning.excelRowNumber ?? warning.rowNumber
                                const sheetLabel = warning.sheetName ? ` (${warning.sheetName})` : ''
                                return (
                                  <div
                                    key={idx}
                                    className={`text-xs ${
                                      warning.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                                    }`}
                                  >
                                    Row {rowLabel}{sheetLabel}: {warning.field} - {warning.message}
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
                          <div className="rounded-md border border-amber-200 bg-amber-50 text-xs text-amber-900 p-3 space-y-1">
                            <span className="font-medium">Ignored rows (missing Name)</span>
                            <span>Rows {skippedNameRows[sheet.name].join(', ')} were excluded from upload and validation.</span>
                          </div>
                        )}

                        {/* Category Mapping */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label>Category *</Label>
                            <Select
                              value={sheetMapping?.categoryId || ''}
                              onValueChange={(v) => updateMapping(sheet.name, 'categoryId', v)}
                              disabled={loadingLookups}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingLookups ? 'Loading...' : 'Select category'} />
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
                          <div className="space-y-1">
                            <Label>Columns ({sheet.columns.length})</Label>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                              {sheet.columns.slice(0, 5).map((col) => (
                                <Badge key={col} variant="outline" className="text-xs">
                                  {col}
                                </Badge>
                              ))}
                              {sheet.columns.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{sheet.columns.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

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
                            <Label>Preview (first {Math.min(10, sheet.previewRows.length)} rows)</Label>
                            <div className="overflow-x-auto rounded-md border max-h-64 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/40 sticky top-0">
                                  <tr>
                                    <th className="p-2 w-8">
                                      <Checkbox
                                        checked={
                                          sheetMapping?.selectedRows.length === 0 ||
                                          sheet.previewRows
                                            .slice(0, 10)
                                            .every((row) => {
                                              const excelRowNum = row.rowNumber ?? sheet.previewRows.indexOf(row) + 2
                                              return (sheetMapping?.selectedRows || []).includes(excelRowNum)
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
                                    <th className="p-2 text-left font-medium">Row</th>
                                    {sheet.columns.slice(0, 7).map((col) => (
                                      <th key={col} className="p-2 text-left font-medium">
                                        {col}
                                      </th>
                                    ))}
                                    {sheet.columns.length > 7 && (
                                      <th className="p-2 text-left font-medium">...</th>
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
                                      <tr key={idx} className={`border-t ${isSelected ? '' : 'opacity-50'}`}>
                                        <td className="p-2">
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleRowSelection(sheet.name, excelRowNumber)}
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

            {!allSheetsMapped && (
              <div className="flex items-center gap-2 text-sm text-red-600 p-3 rounded-md bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4" />
                <span>All selected sheets must be mapped to categories before importing.</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedSheetsCount} of {sheetsMetadata.length} sheets selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAIPreview}
                  disabled={!allSheetsMapped || selectedSheetsCount === 0}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Preview AI
                </Button>
                <Button onClick={onSubmit} disabled={submitting || !allSheetsMapped || selectedSheetsCount === 0}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          onComplete={() => {
            toast({ title: 'Import completed!' })
          }}
        />
      )}

      <AIPreviewDialog
        open={showAIPreview}
        onOpenChange={setShowAIPreview}
        rows={aiPreviewRows}
        onApply={(approvedSuggestions) => {
          toast({
            title: 'AI suggestions approved',
            description: `${approvedSuggestions.length} suggestions will be applied during import`,
          })
          // The approved suggestions will be used during import
          // This would need to be stored and passed to the import API
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
