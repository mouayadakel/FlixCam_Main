/**
 * Unit tests for image.utils
 */

import { isExternalImageUrl } from '../image.utils'

describe('image.utils', () => {
  describe('isExternalImageUrl', () => {
    it('returns false for null', () => {
      expect(isExternalImageUrl(null)).toBe(false)
    })
    it('returns false for undefined', () => {
      expect(isExternalImageUrl(undefined)).toBe(false)
    })
    it('returns false for empty string', () => {
      expect(isExternalImageUrl('')).toBe(false)
    })
    it('returns false for non-string', () => {
      expect(isExternalImageUrl(123 as unknown as string)).toBe(false)
    })
    it('returns false for relative path', () => {
      expect(isExternalImageUrl('/images/photo.jpg')).toBe(false)
    })
    it('returns false for localhost', () => {
      expect(isExternalImageUrl('http://localhost:3000/image.jpg')).toBe(false)
    })
    it('returns false for 127.0.0.1', () => {
      expect(isExternalImageUrl('http://127.0.0.1/image.jpg')).toBe(false)
    })
    it('returns false for vercel.app', () => {
      expect(isExternalImageUrl('https://myapp.vercel.app/image.jpg')).toBe(false)
    })
    it('returns true for external https URL', () => {
      expect(isExternalImageUrl('https://cdn.example.com/image.jpg')).toBe(true)
    })
    it('returns true for external http URL', () => {
      expect(isExternalImageUrl('http://example.com/image.jpg')).toBe(true)
    })
    it('returns true for invalid URL (catch branch)', () => {
      expect(isExternalImageUrl('http://')).toBe(true)
    })
  })
})
