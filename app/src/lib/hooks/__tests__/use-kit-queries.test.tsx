/**
 * Unit tests for use-kit-queries
 * @jest-environment jsdom
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useShootTypes,
  useShootTypeConfig,
  useEquipmentInfinite,
  useKitCompatibility,
  useKitAISuggest,
  useEquipmentAvailability,
} from '../use-kit-queries'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const originalFetch = global.fetch

describe('use-kit-queries', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as jest.Mock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('useShootTypes', () => {
    it('fetches shoot types', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'st1', name: 'Commercial', slug: 'commercial' }] }),
      })

      const { result } = renderHook(() => useShootTypes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([{ id: 'st1', name: 'Commercial', slug: 'commercial' }])
      expect(global.fetch).toHaveBeenCalledWith('/api/public/shoot-types')
    })

    it('returns empty array when json.data is not array', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      })

      const { result } = renderHook(() => useShootTypes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useShootTypeConfig', () => {
    it('does not fetch when slug is null', () => {
      renderHook(() => useShootTypeConfig(null), {
        wrapper: createWrapper(),
      })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('fetches config when slug provided', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'st1', slug: 'commercial', categorySteps: [] }),
      })

      const { result } = renderHook(() => useShootTypeConfig('commercial'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/public/shoot-types/commercial')
    })
  })

  describe('useEquipmentInfinite', () => {
    it('fetches equipment with filters', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0 }),
      })

      const { result } = renderHook(
        () =>
          useEquipmentInfinite({
            categoryId: 'cat_1',
            budgetTier: undefined,
            q: undefined,
            sort: undefined,
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/equipment')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('categoryId=cat_1')
      )
    })

    it('returns nextPageParam undefined when no more pages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: '1' }], total: 1 }),
      })

      const { result } = renderHook(
        () =>
          useEquipmentInfinite({
            categoryId: null,
            budgetTier: undefined,
            q: undefined,
            sort: undefined,
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.hasNextPage).toBe(false)
    })

    it('returns nextPageParam when full page and more data', async () => {
      const fullPage = Array.from({ length: 24 }, (_, i) => ({ id: String(i) }))
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: fullPage, total: 50 }),
      })

      const { result } = renderHook(
        () =>
          useEquipmentInfinite({
            categoryId: null,
            budgetTier: undefined,
            q: undefined,
            sort: undefined,
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.hasNextPage).toBe(true)
      expect(result.current.fetchNextPage).toBeDefined()
    })
  })

  describe('useKitCompatibility', () => {
    it('does not fetch when targetCategoryId is null', () => {
      renderHook(
        () => useKitCompatibility(['eq_1'], null),
        { wrapper: createWrapper() }
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not fetch when targetCategoryId is empty string', () => {
      renderHook(
        () => useKitCompatibility(['eq_1'], ''),
        { wrapper: createWrapper() }
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('fetches compatibility when enabled', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'eq_2', sku: 'CAM-002', dailyPrice: 200 }] }),
      })

      const { result } = renderHook(
        () => useKitCompatibility(['eq_1'], 'cat_2'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/public/kit-compatibility',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ selectedEquipmentIds: ['eq_1'], targetCategoryId: 'cat_2' }),
        })
      )
      expect(result.current.data).toEqual([{ id: 'eq_2', sku: 'CAM-002', dailyPrice: 200 }])
    })
  })

  describe('useKitAISuggest', () => {
    it('does not fetch when params is null', () => {
      renderHook(() => useKitAISuggest(null), {
        wrapper: createWrapper(),
      })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not fetch when duration < 1', () => {
      renderHook(
        () =>
          useKitAISuggest({
            currentSelections: [],
            duration: 0,
          }),
        { wrapper: createWrapper() }
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('fetches AI suggestions when enabled', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            suggestions: [{ equipmentId: 'eq_1', equipmentName: 'Camera', quantity: 1 }],
            matchingPrebuiltKits: [],
          }),
      })

      const { result } = renderHook(
        () =>
          useKitAISuggest({
            currentSelections: ['eq_1'],
            duration: 7,
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/public/kit-ai-suggest',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"currentSelections":["eq_1"]'),
        })
      )
      expect(result.current.data?.suggestions).toHaveLength(1)
      expect(result.current.data?.matchingPrebuiltKits).toEqual([])
    })
  })

  describe('useEquipmentAvailability', () => {
    it('does not fetch when equipmentId is null', () => {
      renderHook(
        () => useEquipmentAvailability(null, '2026-02-01', '2026-02-05'),
        { wrapper: createWrapper() }
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not fetch when startDate is null', () => {
      renderHook(
        () => useEquipmentAvailability('eq_1', null, '2026-02-05'),
        { wrapper: createWrapper() }
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not fetch when endDate is null', () => {
      renderHook(
        () => useEquipmentAvailability('eq_1', '2026-02-01', null),
        { wrapper: createWrapper() }
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('fetches availability when all params provided', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ available: true, quantityAvailable: 3 }),
      })

      const { result } = renderHook(
        () => useEquipmentAvailability('eq_1', '2026-02-01', '2026-02-05'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/equipment/eq_1/availability')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-02-01')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2026-02-05')
      )
      expect(result.current.data).toEqual({ available: true, quantityAvailable: 3 })
    })
  })
})
