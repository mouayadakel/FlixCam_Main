/**
 * Unit tests for specifications.utils
 * PATHS: convertFlatToStructured (template+groups, remaining, categoryHint, general fallback);
 * extractQuickSpecs; extractHighlights; validateSpecifications; resolveSpecKey
 */

import {
  convertFlatToStructured,
  extractQuickSpecs,
  extractHighlights,
  validateSpecifications,
  resolveSpecKey,
  flattenStructuredSpecs,
  getSpecValue,
  getSpecArray,
} from '../specifications.utils'

describe('specifications.utils', () => {
  describe('resolveSpecKey', () => {
    it('returns alias when key exists in KEY_ALIASES', () => {
      expect(resolveSpecKey('sensor_size')).toBe('sensor')
      expect(resolveSpecKey('weight_kg')).toBe('weight')
    })
    it('returns key as-is when not in KEY_ALIASES', () => {
      expect(resolveSpecKey('unknown_key')).toBe('unknown_key')
    })
  })

  describe('convertFlatToStructured', () => {
    it('uses template with groups when categoryHint provided', () => {
      const flat = { sensor: 'Full Frame', video: '4K', weight: '1.2kg' }
      const result = convertFlatToStructured(flat, 'cameras')
      expect(result.groups).toHaveLength(4)
      const keySpecs = result.groups[0]
      expect(keySpecs.specs.some((s) => s.key === 'sensor' && s.value === 'Full Frame')).toBe(true)
      expect(keySpecs.specs.some((s) => s.key === 'video' && s.value === '4K')).toBe(true)
    })

    it('maps sensor_size to sensor via KEY_ALIASES', () => {
      const flat = { sensor_size: 'APS-C' }
      const result = convertFlatToStructured(flat, 'cameras')
      const sensorSpec = result.groups.flatMap((g) => g.specs).find((s) => s.key === 'sensor')
      expect(sensorSpec?.value).toBe('APS-C')
    })

    it('adds remaining entries not in template to first group', () => {
      const flat = { sensor: 'FF', customField: 'customVal' }
      const result = convertFlatToStructured(flat, 'cameras')
      const firstGroup = result.groups[0]
      const custom = firstGroup.specs.find((s) => s.key === 'customField')
      expect(custom).toBeDefined()
      expect(custom?.value).toBe('customVal')
    })

    it('includes customHtml when present in flat', () => {
      const flat = { sensor: 'FF', customHtml: '<p>Extra</p>' }
      const result = convertFlatToStructured(flat, 'cameras')
      expect(result.customHtml).toBe('<p>Extra</p>')
    })

    it('uses general group when no categoryHint', () => {
      const flat = { foo: 'bar', baz: 'qux' }
      const result = convertFlatToStructured(flat)
      expect(result.groups).toHaveLength(1)
      expect(result.groups[0].label).toBe('Specifications')
      expect(result.groups[0].specs).toHaveLength(2)
      expect(result.groups[0].specs.find((s) => s.key === 'foo')?.value).toBe('bar')
    })

    it('filters RESERVED_KEYS from entries', () => {
      const flat = { sensor: 'FF', mode: 'edit', groups: 'x' }
      const result = convertFlatToStructured(flat, 'cameras')
      const allKeys = result.groups.flatMap((g) => g.specs).map((s) => s.key)
      expect(allKeys).not.toContain('mode')
      expect(allKeys).not.toContain('groups')
    })
  })

  describe('extractQuickSpecs', () => {
    it('returns specs with highlight from groups up to maxCount', () => {
      const specs = {
        groups: [
          {
            label: 'Key Specs',
            icon: 'star',
            priority: 1,
            specs: [
              { key: 'a', label: 'A', value: '1', highlight: true },
              { key: 'b', label: 'B', value: '2', highlight: true },
              { key: 'c', label: 'C', value: '3' },
            ],
          },
        ],
      }
      const result = extractQuickSpecs(specs as any, 4)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ icon: 'star', label: 'A', value: '1' })
    })

    it('respects maxCount parameter', () => {
      const specs = {
        groups: [
          {
            label: 'Key',
            icon: 'star',
            priority: 1,
            specs: [
              { key: 'a', label: 'A', value: '1', highlight: true },
              { key: 'b', label: 'B', value: '2', highlight: true },
            ],
          },
        ],
      }
      const result = extractQuickSpecs(specs as any, 1)
      expect(result).toHaveLength(1)
    })
  })

  describe('extractHighlights', () => {
    it('returns highlights from key group (priority 1)', () => {
      const specs = {
        groups: [
          {
            label: 'Key Specs',
            icon: 'star',
            priority: 1,
            specs: [
              { key: 'a', label: 'A', value: 'Val (sublabel)', highlight: true },
              { key: 'b', label: 'B', value: 'BVal', highlight: true },
            ],
          },
        ],
      }
      const result = extractHighlights(specs as any, 4)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ icon: 'star', label: 'A', value: 'Val', sublabel: 'sublabel' })
    })

    it('returns empty when no key group found', () => {
      const specs = {
        groups: [
          { label: 'Other', icon: 'star', priority: 2, specs: [{ key: 'x', label: 'X', value: '1', highlight: true }] },
        ],
      }
      const result = extractHighlights(specs as any)
      expect(result).toEqual([])
    })

    it('finds key group by label containing "key"', () => {
      const specs = {
        groups: [
          {
            label: 'Key Features',
            icon: 'star',
            priority: 2,
            specs: [{ key: 'a', label: 'A', value: '1', highlight: true }],
          },
        ],
      }
      const result = extractHighlights(specs as any)
      expect(result).toHaveLength(1)
    })
  })

  describe('validateSpecifications', () => {
    it('returns valid true when specs are complete', () => {
      const specs = {
        groups: [
          { label: 'G1', icon: 'star', priority: 1, specs: [{ key: 'k', label: 'K', value: 'v' }] },
        ],
      }
      const result = validateSpecifications(specs as any)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when groups empty', () => {
      const result = validateSpecifications({ groups: [] } as any)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least one specification group is required')
    })

    it('returns error when group label missing', () => {
      const specs = {
        groups: [{ label: '', icon: 'star', priority: 1, specs: [] }],
      }
      const result = validateSpecifications(specs as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Label is required'))).toBe(true)
    })

    it('returns error when group icon missing', () => {
      const specs = {
        groups: [{ label: 'G1', icon: '', priority: 1, specs: [] }],
      }
      const result = validateSpecifications(specs as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Icon is required'))).toBe(true)
    })

    it('returns error when spec key missing', () => {
      const specs = {
        groups: [{ label: 'G1', icon: 'star', priority: 1, specs: [{ key: '', label: 'L', value: 'v' }] }],
      }
      const result = validateSpecifications(specs as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Key is required'))).toBe(true)
    })

    it('returns error when spec label missing', () => {
      const specs = {
        groups: [{ label: 'G1', icon: 'star', priority: 1, specs: [{ key: 'k', label: '', value: 'v' }] }],
      }
      const result = validateSpecifications(specs as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Label is required'))).toBe(true)
    })

    it('returns error when spec value empty', () => {
      const specs = {
        groups: [{ label: 'G1', icon: 'star', priority: 1, specs: [{ key: 'k', label: 'L', value: '' }] }],
      }
      const result = validateSpecifications(specs as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Value is required'))).toBe(true)
    })
  })

  describe('flattenStructuredSpecs', () => {
    it('flattens groups to key-value map', () => {
      const specs = {
        groups: [{ label: 'G', icon: 'star', priority: 1, specs: [{ key: 'a', label: 'A', value: '1' }] }],
      }
      const result = flattenStructuredSpecs(specs as any)
      expect(result).toEqual({ a: '1' })
    })

    it('includes highlights and quickSpecs when present', () => {
      const specs = {
        groups: [{ label: 'G', icon: 'star', priority: 1, specs: [{ key: 'a', label: 'A', value: '1' }] }],
        highlights: [{ label: 'Highlight', value: 'h1' }],
        quickSpecs: [{ label: 'Quick', value: 'q1' }],
      }
      const result = flattenStructuredSpecs(specs as any)
      expect(result.highlight).toBe('h1')
      expect(result.quick).toBe('q1')
    })

    it('skips highlights/quickSpecs with empty label', () => {
      const specs = {
        groups: [],
        highlights: [{ label: '  ', value: 'x' }],
        quickSpecs: [{ label: '', value: 'y' }],
      }
      const result = flattenStructuredSpecs(specs as any)
      expect(Object.keys(result)).toHaveLength(0)
    })
  })

  describe('getSpecValue', () => {
    it('returns value from structured specs', () => {
      const specs = {
        groups: [{ label: 'G', icon: 's', priority: 1, specs: [{ key: 'x', label: 'X', value: 'val' }] }],
      }
      expect(getSpecValue(specs, 'x')).toBe('val')
    })
    it('returns undefined for null/undefined input', () => {
      expect(getSpecValue(null, 'x')).toBeUndefined()
      expect(getSpecValue(undefined, 'x')).toBeUndefined()
    })
    it('returns value from flat specs', () => {
      expect(getSpecValue({ x: 'flatVal' }, 'x')).toBe('flatVal')
    })
    it('returns undefined for flat specs when key missing or null', () => {
      expect(getSpecValue({ x: undefined }, 'x')).toBeUndefined()
      expect(getSpecValue({ x: null }, 'x')).toBeUndefined()
      expect(getSpecValue({}, 'missing')).toBeUndefined()
    })
  })

  describe('getSpecArray', () => {
    it('returns empty array for null input', () => {
      expect(getSpecArray(null, 'x')).toEqual([])
    })
    it('returns array from structured specs with JSON array', () => {
      const specs = {
        groups: [{ label: 'G', icon: 's', priority: 1, specs: [{ key: 'arr', label: 'Arr', value: '["a","b"]' }] }],
      }
      expect(getSpecArray(specs, 'arr')).toEqual(['a', 'b'])
    })
    it('returns single value as array from structured specs', () => {
      const specs = {
        groups: [{ label: 'G', icon: 's', priority: 1, specs: [{ key: 'x', label: 'X', value: 'single' }] }],
      }
      expect(getSpecArray(specs, 'x')).toEqual(['single'])
    })
    it('returns array from flat specs', () => {
      expect(getSpecArray({ arr: ['a', 'b'] }, 'arr')).toEqual(['a', 'b'])
    })
    it('returns single value as array from flat specs', () => {
      expect(getSpecArray({ x: 'val' }, 'x')).toEqual(['val'])
    })
  })
})
