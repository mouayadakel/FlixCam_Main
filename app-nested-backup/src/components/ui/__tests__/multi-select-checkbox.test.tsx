/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { MultiSelectCheckbox } from '../multi-select-checkbox'

describe('MultiSelectCheckbox', () => {
  const options = [
    { id: '1', label: 'Option A' },
    { id: '2', label: 'Option B' },
  ]

  it('renders without crashing', () => {
    const { container } = render(
      <MultiSelectCheckbox
        options={options}
        selectedIds={[]}
        onToggle={jest.fn()}
      />
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <MultiSelectCheckbox
        options={options}
        selectedIds={[]}
        onToggle={jest.fn()}
      />
    )
    expect(screen.getByText('Option A')).toBeTruthy()
    expect(screen.getByText('Option B')).toBeTruthy()
  })

  it('calls onToggle when checkbox is clicked', () => {
    const onToggle = jest.fn()
    render(
      <MultiSelectCheckbox
        options={options}
        selectedIds={[]}
        onToggle={onToggle}
      />
    )
    const checkbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox)
    expect(onToggle).toHaveBeenCalled()
  })
})
