/**
 * UI unit tests for the Inventory Import page.
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import ImportPage from '../page'

const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))

describe('Import Page UI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders page title and upload card', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ categories: [] }),
    })

    render(<ImportPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'استيراد المعدات' })).toBeTruthy()
    })

    expect(screen.getAllByText('رفع الملف').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/اسحب ملف Excel أو CSV هنا/)).toBeTruthy()
  })

  it('renders step labels', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ categories: [] }),
    })

    render(<ImportPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'استيراد المعدات' })).toBeTruthy()
    })

    expect(screen.getByText('ربط الأعمدة')).toBeTruthy()
    expect(screen.getByText('معاينة واستيراد')).toBeTruthy()
    expect(screen.getByText('النتائج')).toBeTruthy()
  })

  it('renders import mode selector', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ categories: [] }),
    })

    render(<ImportPage />)

    await waitFor(() => {
      expect(screen.getByText('وضع الاستيراد')).toBeTruthy()
    })

    expect(screen.getByRole('combobox')).toBeTruthy()
    expect(screen.getByText('Preview + Edit (AI)')).toBeTruthy()
  })

  it('fetches categories on mount', async () => {
    const categories = [
      { id: 'cat-1', name: 'Cameras', parentId: null },
      { id: 'cat-2', name: 'Lenses', parentId: null },
    ]
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ categories }),
    })

    render(<ImportPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/products/lookups')
    })
  })

  it('does not show sheet mapping section when no file uploaded', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ categories: [] }),
    })

    render(<ImportPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'استيراد المعدات' })).toBeTruthy()
    })

    expect(screen.queryByText('Sheet → Category Mapping')).toBeNull()
  })
})
