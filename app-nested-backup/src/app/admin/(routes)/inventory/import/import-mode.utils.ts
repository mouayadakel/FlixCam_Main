/**
 * Import mode constants and pure helpers for form behavior (testable).
 */

export type ImportMode = 'preview_edit' | 'import_then_fill' | 'import_autofill'

export const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  preview_edit: 'Preview + Edit (AI)',
  import_then_fill: 'Import then Fill',
  import_autofill: 'Import + Auto-fill',
}

export function shouldSendApprovedSuggestions(
  mode: ImportMode,
  approvedSuggestionsCount: number
): boolean {
  return mode === 'preview_edit' && approvedSuggestionsCount > 0
}

export function shouldTriggerBackfillAfterImport(mode: ImportMode): boolean {
  return mode === 'import_autofill'
}
