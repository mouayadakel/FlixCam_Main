/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Stepper } from '../stepper'

describe('Stepper', () => {
  const steps = [
    { id: '1', label: 'Step 1' },
    { id: '2', label: 'Step 2' },
  ]

  it('renders without crashing', () => {
    const { container } = render(
      <Stepper steps={steps} currentStep={0} />
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Stepper steps={steps} currentStep={0} />)
    expect(screen.getAllByText('Step 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Step 2').length).toBeGreaterThan(0)
  })

  it('handles currentStep prop', () => {
    render(<Stepper steps={steps} currentStep={1} />)
    expect(screen.getAllByText('Step 2').length).toBeGreaterThan(0)
  })
})
