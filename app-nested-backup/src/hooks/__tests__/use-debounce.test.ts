/**
 * Unit tests for use-debounce hook
 */

import { useDebounce } from '../use-debounce'

describe('useDebounce', () => {
  it('is a function', () => {
    expect(typeof useDebounce).toBe('function')
  })
  it('accepts value and delayMs', () => {
    expect(useDebounce.length).toBe(2)
  })
})
