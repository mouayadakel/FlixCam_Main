/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '../alert'

describe('Alert', () => {
  it('renders without crashing', () => {
    const { container } = render(<Alert>Alert content</Alert>)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Alert>Message</Alert>)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Message')).toBeTruthy()
  })

  it('handles variant prop', () => {
    const { container } = render(
      <Alert variant="destructive">Error message</Alert>
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders AlertTitle and AlertDescription', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Description text</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Title')).toBeTruthy()
    expect(screen.getByText('Description text')).toBeTruthy()
  })
})
