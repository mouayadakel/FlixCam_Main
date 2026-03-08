/**
 * Tests for import mode utils (shouldSendApprovedSuggestions, shouldTriggerBackfillAfterImport)
 */

import {
  IMPORT_MODE_LABELS,
  shouldSendApprovedSuggestions,
  shouldTriggerBackfillAfterImport,
  type ImportMode,
} from '../import-mode.utils'

describe('import-mode.utils', () => {
  describe('IMPORT_MODE_LABELS', () => {
    it('has all three import modes', () => {
      expect(IMPORT_MODE_LABELS.preview_edit).toBe('Preview + Edit (AI)')
      expect(IMPORT_MODE_LABELS.import_then_fill).toBe('Import then Fill')
      expect(IMPORT_MODE_LABELS.import_autofill).toBe('Import + Auto-fill')
    })

    it('has no extra keys', () => {
      const modes: ImportMode[] = ['preview_edit', 'import_then_fill', 'import_autofill']
      expect(Object.keys(IMPORT_MODE_LABELS).sort()).toEqual([...modes].sort())
    })
  })

  describe('shouldSendApprovedSuggestions', () => {
    it('returns true only when mode is preview_edit and count > 0', () => {
      expect(shouldSendApprovedSuggestions('preview_edit', 1)).toBe(true)
      expect(shouldSendApprovedSuggestions('preview_edit', 5)).toBe(true)
    })

    it('returns false when mode is preview_edit but count is 0', () => {
      expect(shouldSendApprovedSuggestions('preview_edit', 0)).toBe(false)
    })

    it('returns false for import_then_fill even with suggestions', () => {
      expect(shouldSendApprovedSuggestions('import_then_fill', 10)).toBe(false)
    })

    it('returns false for import_autofill even with suggestions', () => {
      expect(shouldSendApprovedSuggestions('import_autofill', 10)).toBe(false)
    })
  })

  describe('shouldTriggerBackfillAfterImport', () => {
    it('returns true only for import_autofill', () => {
      expect(shouldTriggerBackfillAfterImport('import_autofill')).toBe(true)
    })

    it('returns false for preview_edit and import_then_fill', () => {
      expect(shouldTriggerBackfillAfterImport('preview_edit')).toBe(false)
      expect(shouldTriggerBackfillAfterImport('import_then_fill')).toBe(false)
    })
  })
})
