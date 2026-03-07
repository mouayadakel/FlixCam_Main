/**
 * Unit tests for use-admin-feature-flags
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useAdminFeatureFlags } from '../use-admin-feature-flags'

const originalFetch = global.fetch

describe('use-admin-feature-flags', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as jest.Mock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetches flags and maps to record', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          flags: [
            { id: '1', name: 'enable_build_kit', enabled: true },
            { id: '2', name: 'enable_studios', enabled: false },
          ],
        }),
    })

    const { result } = renderHook(() => useAdminFeatureFlags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/feature-flags')
    expect(result.current.flags).toEqual({ enable_build_kit: true, enable_studios: false })
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAdminFeatureFlags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.flags).toEqual({})
  })
})
