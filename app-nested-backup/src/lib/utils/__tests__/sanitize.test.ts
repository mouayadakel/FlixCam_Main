/**
 * Unit tests for sanitize utils
 */

import { sanitizeHtml, sanitizeContractHtml } from '../sanitize'

describe('sanitize', () => {
  describe('sanitizeHtml', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizeHtml('')).toBe('')
    })
    it('allows safe tags', () => {
      const result = sanitizeHtml('<p>Hello</p>')
      expect(result).toContain('Hello')
    })
  })

  describe('sanitizeContractHtml', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizeContractHtml('')).toBe('')
    })
    it('allows safe contract tags and strips a/img', () => {
      const result = sanitizeContractHtml('<p>Terms</p><h2>Section</h2><a href="#">link</a>')
      expect(result).toContain('Terms')
      expect(result).toContain('Section')
      expect(result).not.toContain('href')
    })
  })
})
