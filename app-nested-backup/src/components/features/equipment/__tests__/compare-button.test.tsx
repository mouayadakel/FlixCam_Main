/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { CompareButton } from '../compare-button'

const mockAddItem = jest.fn()
const mockRemoveItem = jest.fn()
const mockHasItem = jest.fn()
const mockIsFull = jest.fn()

jest.mock('@/lib/stores/compare-store', () => ({
  useCompareStore: () => ({
    addItem: mockAddItem,
    removeItem: mockRemoveItem,
    hasItem: mockHasItem,
    isFull: mockIsFull,
  }),
}))

describe('CompareButton', () => {
  const equipment = {
    id: 'eq-1',
    name: 'Sony FX6',
    slug: 'sony-fx6',
    image: null,
    dailyPrice: 100,
    category: { name: 'Cameras' },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsFull.mockReturnValue(false)
  })

  it('renders without crashing', () => {
    mockHasItem.mockReturnValue(false)
    const { container } = render(<CompareButton equipment={equipment} />)
    expect(container).toBeTruthy()
  })

  it('shows "مقارنة" when not in compare list', () => {
    mockHasItem.mockReturnValue(false)
    render(<CompareButton equipment={equipment} />)
    expect(screen.getByRole('button', { name: /مقارنة/ })).toBeTruthy()
  })

  it('shows "إزالة" when in compare list', () => {
    mockHasItem.mockReturnValue(true)
    render(<CompareButton equipment={equipment} />)
    expect(screen.getByRole('button', { name: /إزالة/ })).toBeTruthy()
  })

  it('calls addItem when clicked and not in list', () => {
    mockHasItem.mockReturnValue(false)
    render(<CompareButton equipment={equipment} />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockAddItem).toHaveBeenCalledWith({
      id: 'eq-1',
      name: 'Sony FX6',
      slug: 'sony-fx6',
      image: null,
      price: 100,
      category: 'Cameras',
    })
  })

  it('calls removeItem when clicked and in list', () => {
    mockHasItem.mockReturnValue(true)
    render(<CompareButton equipment={equipment} />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockRemoveItem).toHaveBeenCalledWith('eq-1')
  })

  it('returns null when not in list and isFull', () => {
    mockHasItem.mockReturnValue(false)
    mockIsFull.mockReturnValue(true)
    const { container } = render(<CompareButton equipment={equipment} />)
    expect(container.firstChild).toBeNull()
  })
})
