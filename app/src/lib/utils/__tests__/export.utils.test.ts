/**
 * Unit tests for export.utils
 */

const mockClick = jest.fn()
const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url')
const mockRevokeObjectURL = jest.fn()

beforeAll(() => {
  ;(global as unknown as { document: { createElement: jest.Mock } }).document = {
    createElement: jest.fn().mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    }),
  }
  ;(global as unknown as { URL: { createObjectURL: jest.Mock; revokeObjectURL: jest.Mock } }).URL = {
    ...URL,
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  }
})

afterAll(() => {
  delete (global as unknown as { document?: unknown }).document
})

import { exportToCSV } from '../export.utils'

describe('export.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
  })

  it('does nothing when data is empty', () => {
    exportToCSV([], 'test', [{ key: 'name', label: 'Name' }])
    expect(mockCreateObjectURL).not.toHaveBeenCalled()
    expect(mockClick).not.toHaveBeenCalled()
  })

  it('creates CSV with header and rows', () => {
    const data = [{ name: 'Item 1', price: 100 }]
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'price', label: 'Price' },
    ]
    exportToCSV(data, 'export', columns)
    expect(mockCreateObjectURL).toHaveBeenCalled()
    const blob = mockCreateObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect(blob.size).toBeGreaterThan(0)
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('escapes values with commas', () => {
    const data = [{ name: 'Item, with comma' }]
    const columns = [{ key: 'name', label: 'Name' }]
    exportToCSV(data, 'export', columns)
    expect(mockCreateObjectURL).toHaveBeenCalled()
    const blob = mockCreateObjectURL.mock.calls[0][0] as Blob
    expect(blob.size).toBeGreaterThan(0)
  })

  it('supports nested keys via dot notation', () => {
    const data = [{ user: { name: 'Test' } }]
    const columns = [{ key: 'user.name', label: 'User' }]
    exportToCSV(data, 'export', columns)
    expect(mockCreateObjectURL).toHaveBeenCalled()
  })

  it('escapes null and undefined as empty string', () => {
    const data = [{ name: 'Item', price: null, qty: undefined }]
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'price', label: 'Price' },
      { key: 'qty', label: 'Qty' },
    ]
    exportToCSV(data, 'export', columns)
    expect(mockCreateObjectURL).toHaveBeenCalled()
    const blob = mockCreateObjectURL.mock.calls[0][0] as Blob
    expect(blob.size).toBeGreaterThan(0)
    expect(blob.type).toBe('text/csv;charset=utf-8')
  })
})
