'use client'

import { useMemo } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MappedColumn } from '@/components/features/import/column-mapper'
import { normalizeImportedSpecifications } from '@/lib/utils/specifications-import.utils'

type SheetMetadata = {
  name: string
  previewRows: Array<Record<string, unknown> & { rowNumber?: number }>
}

type ValidatorProps = {
  sheetsMetadata: SheetMetadata[]
  columnMappings: Record<string, MappedColumn[]>
}

function getMappedValue(
  row: Record<string, unknown>,
  mappings: MappedColumn[],
  mappedField: string
): unknown {
  const target = mappings.find((entry) => entry.mappedField === mappedField)
  if (!target) return undefined
  return row[target.sourceHeader]
}

const TEMPLATE_BLOCK = `1. SHORT SPECS
- Bullet 1
- Bullet 2
2. FULL SPECS
sensor: Full-frame CMOS
resolution: 4K DCI 60fps
3. TECHNICIAN SPECS
power_input: 12V DC`

export function SpecsImportValidator({ sheetsMetadata, columnMappings }: ValidatorProps) {
  const analysis = useMemo(() => {
    const rows: Array<{
      sheet: string
      rowNumber: number
      source: string
      confidence: number
      warnings: string[]
      hasStructured: boolean
      sample: string
    }> = []

    for (const sheet of sheetsMetadata) {
      const mappings = columnMappings[sheet.name] ?? []
      for (const row of sheet.previewRows.slice(0, 25)) {
        const specsRaw =
          getMappedValue(row, mappings, 'specifications') ??
          row.Specifications ??
          row.specifications ??
          null
        const specsRawNotes =
          getMappedValue(row, mappings, 'specifications_raw_notes') ??
          row.specifications_notes ??
          null

        if (!specsRaw && !specsRawNotes) continue
        const normalized = normalizeImportedSpecifications({
          specsRaw,
          specsRawNotes,
          categoryHint: sheet.name,
        })
        rows.push({
          sheet: sheet.name,
          rowNumber: Number(row.rowNumber ?? 0),
          source: normalized.source,
          confidence: normalized.confidence,
          warnings: normalized.warnings,
          hasStructured: !!normalized.structured?.groups?.length,
          sample: String(specsRawNotes ?? specsRaw ?? '').slice(0, 160),
        })
      }
    }

    const valid = rows.filter((row) => row.hasStructured).length
    const needsFix = rows.length - valid
    return { rows, valid, needsFix }
  }, [sheetsMetadata, columnMappings])

  if (analysis.rows.length === 0) return null

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Specifications Pre-Upload Validator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Structured rows: {analysis.valid}
          </Badge>
          <Badge variant="destructive">Needs attention: {analysis.needsFix}</Badge>
        </div>

        <div className="max-h-64 space-y-2 overflow-auto rounded-xl border p-3 text-xs">
          {analysis.rows.map((row) => (
            <div key={`${row.sheet}-${row.rowNumber}`} className="rounded-md border p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="font-medium">
                  {row.sheet} / Row {row.rowNumber || '-'}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{row.source}</Badge>
                  <Badge variant={row.hasStructured ? 'secondary' : 'destructive'}>
                    {row.hasStructured ? 'Structured' : 'Needs Fix'}
                  </Badge>
                </div>
              </div>
              <p className="text-muted-foreground">{row.sample || 'No sample value'}</p>
              {row.hasStructured ? (
                <p className="mt-1 inline-flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Render preview: grouped specs cards
                </p>
              ) : (
                <div className="mt-2 space-y-1">
                  <p className="text-amber-700">
                    Suggested fix: use section format below before import.
                  </p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-2 text-[11px]">
                    {TEMPLATE_BLOCK}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

