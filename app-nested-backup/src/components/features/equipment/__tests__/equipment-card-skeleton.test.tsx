/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { EquipmentCardSkeleton } from '../equipment-card-skeleton'

describe('EquipmentCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<EquipmentCardSkeleton />)
    expect(container).toBeTruthy()
  })

  it('renders skeleton structure', () => {
    const { container } = render(<EquipmentCardSkeleton />)
    expect(container.querySelector('.overflow-hidden')).toBeTruthy()
    expect(container.querySelector('[class*="rounded-2xl"]')).toBeTruthy()
  })
})
