/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card'

describe('Card', () => {
  it('renders without crashing', () => {
    const { container } = render(<Card>Content</Card>)
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeTruthy()
  })

  it('renders full card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Title')).toBeTruthy()
    expect(screen.getByText('Body')).toBeTruthy()
    expect(screen.getByText('Footer')).toBeTruthy()
  })

  it('renders CardDescription when provided', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description text</CardDescription>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('Description text')).toBeTruthy()
  })
})
