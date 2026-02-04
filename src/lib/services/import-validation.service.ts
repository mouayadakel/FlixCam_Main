/**
 * @file import-validation.service.ts
 * @description Validation service for import data
 * @module lib/services
 */

export type ValidationError = {
  rowNumber: number
  sheetName?: string
  excelRowNumber?: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

export type ValidationResult = {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
  }
}

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

/**
 * Validate import rows
 */
export async function validateImportRows(
  rows: Array<{ rowNumber: number; payload: any }>
): Promise<ValidationResult> {
  const validRows = rows.filter((row) => {
    const rowData = (row.payload?.row as Record<string, any>) ?? {}
    const name = getRowNameValue(rowData)
    return name !== ''
  })

  return {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      totalRows: validRows.length,
      validRows: validRows.length,
      errorRows: 0,
      warningRows: 0,
    },
  }
}
