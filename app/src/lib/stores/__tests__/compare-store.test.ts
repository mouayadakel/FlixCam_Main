/**
 * Unit tests for compare-store
 */

import { useCompareStore } from '../compare-store'

const mockItem = (id: string) => ({
  id,
  name: `Item ${id}`,
  slug: `item-${id}`,
  image: null,
  price: 100,
  category: 'Camera',
})

describe('compare-store', () => {
  beforeEach(() => {
    useCompareStore.getState().clearAll()
  })

  describe('addItem', () => {
    it('adds item', () => {
      useCompareStore.getState().addItem(mockItem('1'))
      expect(useCompareStore.getState().items).toHaveLength(1)
      expect(useCompareStore.getState().hasItem('1')).toBe(true)
    })
    it('does not add duplicate', () => {
      useCompareStore.getState().addItem(mockItem('1'))
      useCompareStore.getState().addItem(mockItem('1'))
      expect(useCompareStore.getState().items).toHaveLength(1)
    })
    it('does not add more than 4 items', () => {
      useCompareStore.getState().addItem(mockItem('1'))
      useCompareStore.getState().addItem(mockItem('2'))
      useCompareStore.getState().addItem(mockItem('3'))
      useCompareStore.getState().addItem(mockItem('4'))
      useCompareStore.getState().addItem(mockItem('5'))
      expect(useCompareStore.getState().items).toHaveLength(4)
      expect(useCompareStore.getState().isFull()).toBe(true)
    })
  })

  describe('removeItem', () => {
    it('removes item', () => {
      useCompareStore.getState().addItem(mockItem('1'))
      useCompareStore.getState().removeItem('1')
      expect(useCompareStore.getState().items).toHaveLength(0)
    })
  })

  describe('clearAll', () => {
    it('clears all items', () => {
      useCompareStore.getState().addItem(mockItem('1'))
      useCompareStore.getState().clearAll()
      expect(useCompareStore.getState().items).toHaveLength(0)
    })
  })
})
