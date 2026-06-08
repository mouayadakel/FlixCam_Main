import {
  normalizeImportedSpecifications,
  parseStructuredSpecsText,
} from '../specifications-import.utils'

describe('specifications-import.utils', () => {
  describe('parseStructuredSpecsText', () => {
    it('parses sectioned text into structured groups', () => {
      const text = [
        '1. SHORT SPECS',
        '- Fast autofocus',
        '- 4K video',
        '',
        '2. FULL SPECS',
        'sensor: Full Frame',
        'resolution: 4K DCI',
        '',
        '3. TECHNICIAN SPECS',
        'power_input: 12V DC',
      ].join('\n')

      const parsed = parseStructuredSpecsText(text)
      expect(parsed).toBeTruthy()
      expect(parsed?.groups).toHaveLength(3)
      expect(parsed?.groups[0].label).toBe('Short Specs')
      expect(parsed?.groups[1].specs.some((s) => s.key === 'sensor' && s.value === 'Full Frame')).toBe(true)
      expect(parsed?.quickSpecs?.length).toBeGreaterThan(0)
    })

    it('returns null for non-sectioned text', () => {
      expect(parseStructuredSpecsText('just notes')).toBeNull()
    })
  })

  describe('normalizeImportedSpecifications', () => {
    it('keeps structured specs unchanged with json source', () => {
      const structured = {
        groups: [{ label: 'Key Specs', icon: 'star', priority: 1, specs: [{ key: 'sensor', label: 'Sensor', value: 'FF' }] }],
      }
      const result = normalizeImportedSpecifications({ specsRaw: structured, categoryHint: 'cameras' })
      expect(result.structured?.groups.length).toBe(1)
      expect(result.source).toBe('json')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('converts flat objects to structured groups', () => {
      const result = normalizeImportedSpecifications({
        specsRaw: { sensor: 'Full Frame', video: '4K' },
        categoryHint: 'cameras',
      })
      expect(result.structured).toBeTruthy()
      expect(result.structured?.groups.length).toBeGreaterThan(0)
      expect(result.source).toBe('json')
    })

    it('parses notes section text when primary specs are empty', () => {
      const notes = [
        '1. SHORT SPECS',
        '- Lightweight',
        '2. FULL SPECS',
        'weight: 1.2kg',
      ].join('\n')
      const result = normalizeImportedSpecifications({
        specsRaw: null,
        specsRawNotes: notes,
        categoryHint: 'cameras',
      })
      expect(result.source).toBe('notes_sectioned')
      expect(result.structured?.groups.length).toBeGreaterThan(0)
      expect(result.rawNotesBackup).toContain('SHORT SPECS')
    })

    it('merges AI specs to fill missing values', () => {
      const result = normalizeImportedSpecifications({
        specsRaw: { sensor: 'APS-C' },
        suggestionSpecs: { video: '4K' },
        categoryHint: 'cameras',
      })
      const allSpecs = result.structured?.groups.flatMap((group) => group.specs) ?? []
      expect(allSpecs.some((s) => s.key === 'sensor' && s.value === 'APS-C')).toBe(true)
      expect(allSpecs.some((s) => s.key === 'video' && s.value === '4K')).toBe(true)
      expect(result.source).toBe('ai_enriched')
    })

    it('returns warnings for unparseable input text', () => {
      const result = normalizeImportedSpecifications({
        specsRaw: 'This is only paragraph notes with no sections and no key values',
        categoryHint: 'cameras',
      })
      expect(result.structured).toBeNull()
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.source).toBe('empty')
    })
  })
})

