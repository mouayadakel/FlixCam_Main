import { cartLineToGa4Item } from '@/lib/analytics/ecommerce-data-layer'
import type { CartItem } from '@/lib/stores/cart.store'

describe('cartLineToGa4Item', () => {
  it('derives unit price from subtotal and quantity', () => {
    const line: CartItem = {
      id: 'line-1',
      itemType: 'EQUIPMENT',
      equipmentId: 'eq-one',
      studioId: null,
      packageId: null,
      kitId: null,
      startDate: null,
      endDate: null,
      quantity: 2,
      dailyRate: 100,
      subtotal: 400,
      isAvailable: true,
      equipmentName: 'Sony FX6',
      categoryName: 'Cameras',
    }
    expect(cartLineToGa4Item(line, 3)).toMatchObject({
      item_id: 'eq-one',
      item_name: 'Sony FX6',
      item_category: 'Cameras',
      price: 200,
      quantity: 2,
      index: 3,
      currency: 'SAR',
    })
  })
})
