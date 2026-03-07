/**
 * ═══════════════════════════════════════════
 * SERVICE: specs-db.service
 * ═══════════════════════════════════════════
 * METHODS:
 *   lookupCuratedSpecs(productName, brandName?)
 *     PATH 1: match >= 0.6 → return SpecMatch
 *     PATH 2: no match → null
 *   lookupDeepSpecs(productName, brandName?)
 *     PATH 1: deep match >= 0.5 → return deep SpecMatch
 *     PATH 2: no deep match → fallback to lookupCuratedSpecs
 *   getKnownModels() → array of model names
 *   hasModel(modelName) → boolean
 *   addToRuntime(modelName, specs) → void
 * ═══════════════════════════════════════════
 */

import {
  lookupCuratedSpecs,
  lookupDeepSpecs,
  getKnownModels,
  hasModel,
  addToRuntime,
} from '../specs-db.service'

describe('specs-db.service', () => {
  describe('lookupCuratedSpecs', () => {
    it('returns specs when product name matches Sony FX6', () => {
      const result = lookupCuratedSpecs('Sony FX6')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('curated')
      expect(result!.matchedModel).toBe('Sony FX6')
      expect(result!.specs).toHaveProperty('Sensor')
    })

    it('returns null when product name has no match', () => {
      const result = lookupCuratedSpecs('Unknown XYZ 999')
      expect(result).toBeNull()
    })

    it('uses brandName when provided', () => {
      const result = lookupCuratedSpecs('FX6', 'Sony')
      expect(result).not.toBeNull()
    })
  })

  describe('lookupDeepSpecs', () => {
    it('returns deep specs when SONY_FX6 matches', () => {
      const result = lookupDeepSpecs('Sony FX6')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('deep')
      expect(result!.boxContents).toBeDefined()
      expect(result!.marketingHighlights).toBeDefined()
    })

    it('falls back to curated when no deep match', () => {
      const result = lookupDeepSpecs('Sony FX3')
      expect(result).not.toBeNull()
    })
  })

  describe('getKnownModels', () => {
    it('returns non-empty array of model names', () => {
      const models = getKnownModels()
      expect(Array.isArray(models)).toBe(true)
      expect(models.length).toBeGreaterThan(0)
    })
  })

  describe('hasModel', () => {
    it('returns true for Sony FX6', () => {
      expect(hasModel('Sony FX6')).toBe(true)
    })

    it('returns false for unknown model', () => {
      expect(hasModel('Unknown XYZ')).toBe(false)
    })

    it('is case-insensitive', () => {
      expect(hasModel('sony fx6')).toBe(true)
    })
  })

  describe('addToRuntime', () => {
    it('adds model to runtime cache', () => {
      addToRuntime('Test Model XYZ', { Key: 'Value' })
      expect(hasModel('Test Model XYZ')).toBe(true)
      const result = lookupCuratedSpecs('Test Model XYZ')
      expect(result).not.toBeNull()
      expect(result!.specs.Key).toBe('Value')
    })

    it('does not duplicate MODEL_KEYS when adding existing model', () => {
      addToRuntime('Existing Runtime Model', { A: '1' })
      addToRuntime('Existing Runtime Model', { A: '2', B: '3' })
      const result = lookupCuratedSpecs('Existing Runtime Model')
      expect(result!.specs).toEqual({ A: '2', B: '3' })
    })
  })

  describe('lookupCuratedSpecs nameScore path', () => {
    it('uses nameScore when it beats searchString score', () => {
      addToRuntime('Sony A7S III', { Sensor: '12MP' })
      const result = lookupCuratedSpecs('Sony A7S III')
      expect(result).not.toBeNull()
      expect(result!.confidence).toBeGreaterThanOrEqual(75)
    })

    it('prefers nameScore over searchString when nameScore is higher', () => {
      const result = lookupCuratedSpecs('Sony FX6', 'Other')
      expect(result).not.toBeNull()
      expect(result!.matchedModel).toBe('Sony FX6')
    })
  })

  describe('lookupDeepSpecs confidence branches', () => {
    it('returns confidence 98 for high match', () => {
      const result = lookupDeepSpecs('Sony FX6')
      expect(result).not.toBeNull()
      expect(result!.confidence).toBe(98)
    })

    it('returns confidence 92 for medium match (0.7 <= score < 0.9)', () => {
      const result = lookupDeepSpecs('Sony FX6 X')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('deep')
      expect(result!.confidence).toBe(92)
    })
  })
})
